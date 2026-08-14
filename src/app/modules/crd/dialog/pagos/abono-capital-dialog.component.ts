import { CommonModule } from '@angular/common';
import { Component, Inject, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import { ModalidadAbono, NOMBRE_TIPO_AMORTIZACION } from '../../model/pagos/catalogos-pago';
import { SimulacionAbonoCapital } from '../../model/pagos/operaciones-pago';
import { mensajeDeRespuesta } from '../../model/pagos/respuesta-pago';
import { OperacionesPagoPrestamoService } from '../../service/operaciones-pago-prestamo.service';
import { ContextoPrestamo, SalidaDialogoPago } from './contexto-prestamo';
import { ReciboOperacionDialogComponent } from './recibo-operacion-dialog.component';

type Paso = 'datos' | 'comparativa';

/**
 * Abono a capital en dos pasos obligatorios (§6-§7 y flujo D de la guía): primero se simula, se
 * muestra la comparativa y recién con la confirmación explícita se aplica.
 *
 * El usuario puede cambiar la modalidad y volver a simular sin cerrar el diálogo: ese comparador
 * es justamente lo que necesita para decidir entre "termino antes" y "pago menos por mes".
 */
@Component({
  selector: 'app-abono-capital-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MaterialFormModule],
  templateUrl: './abono-capital-dialog.component.html',
  styleUrl: './abono-capital-dialog.component.scss',
})
export class AbonoCapitalDialogComponent {
  private servicio = inject(OperacionesPagoPrestamoService);
  private dialog = inject(MatDialog);

  readonly ModalidadAbono = ModalidadAbono;
  readonly hoy = new Date();

  paso = signal<Paso>('datos');
  simulando = signal(false);
  aplicando = signal(false);

  valorTexto = signal('');
  modalidad = signal<number>(ModalidadAbono.REDUCIR_PLAZO);
  fecha = signal<Date>(new Date());
  observacion = '';

  simulacion = signal<SimulacionAbonoCapital | null>(null);
  /** Mensaje de error del backend + el código, para poder ofrecer la derivación correcta. */
  errorMensaje = signal<string | null>(null);
  errorCodigo = signal<string | null>(null);

  valor = computed(() => this.parseMoneda(this.valorTexto()));
  valorValido = computed(() => this.valor() > 0.004);

  /** Sugerencias de monto para tocar en tablet en vez de teclear. */
  sugerencias = computed(() => {
    const capital = this.data.saldoCapital ?? 0;
    const cuota = this.data.valorCuota ?? 0;
    const opciones: { etiqueta: string; valor: number }[] = [];
    if (cuota > 0) {
      opciones.push({ etiqueta: '3 cuotas', valor: +(cuota * 3).toFixed(2) });
      opciones.push({ etiqueta: '6 cuotas', valor: +(cuota * 6).toFixed(2) });
      opciones.push({ etiqueta: '12 cuotas', valor: +(cuota * 12).toFixed(2) });
    }
    if (capital > 0) {
      opciones.push({ etiqueta: '25% del capital', valor: +(capital * 0.25).toFixed(2) });
      opciones.push({ etiqueta: '50% del capital', valor: +(capital * 0.5).toFixed(2) });
    }
    // El abono nunca puede cubrir todo el capital: eso es una precancelación (ABONO_CUBRE_CAPITAL).
    return opciones.filter((o) => o.valor > 0 && (capital <= 0 || o.valor < capital));
  });

  constructor(
    private dialogRef: MatDialogRef<AbonoCapitalDialogComponent, SalidaDialogoPago | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: ContextoPrestamo
  ) {}

  nombreAmortizacion(tipo: number | undefined): string {
    if (tipo == null) return '—';
    return NOMBRE_TIPO_AMORTIZACION[tipo] ?? `Tipo ${tipo}`;
  }

  usarSugerencia(valor: number): void {
    this.valorTexto.set(this.formatMoneda(valor));
    this.limpiarError();
  }

  onValorBlur(): void {
    const v = Math.max(this.valor(), 0);
    this.valorTexto.set(v > 0.004 ? this.formatMoneda(v) : '');
  }

  /** Cambiar la modalidad invalida la comparativa: se vuelve al paso de datos con el valor puesto. */
  cambiarModalidad(modalidad: number): void {
    this.modalidad.set(modalidad);
    this.limpiarError();
    if (this.paso() === 'comparativa') this.simular();
  }

  private limpiarError(): void {
    this.errorMensaje.set(null);
    this.errorCodigo.set(null);
  }

  // ================= paso 1: simular =================

  simular(): void {
    if (!this.valorValido() || this.simulando()) return;
    this.limpiarError();
    this.simulando.set(true);

    this.servicio.simularAbonoCapital(this.data.idPrestamo, this.valor(), this.modalidad()).subscribe((resp) => {
      this.simulando.set(false);
      if (resp.exito && resp.resultado) {
        this.simulacion.set(resp.resultado);
        this.paso.set('comparativa');
      } else {
        this.simulacion.set(null);
        this.paso.set('datos');
        this.errorCodigo.set(String(resp.error ?? ''));
        this.errorMensaje.set(mensajeDeRespuesta(resp));
      }
    });
  }

  volverADatos(): void {
    this.paso.set('datos');
  }

  // ================= paso 2: aplicar =================

  aplicar(): void {
    const sim = this.simulacion();
    // También se bloquea mientras hay una simulación en vuelo: cambiar de modalidad vuelve a
    // simular sin salir de este paso, y aplicar en esa ventana enviaría una modalidad distinta de
    // la que muestra la comparativa en pantalla.
    if (!sim || this.aplicando() || this.simulando()) return;
    this.limpiarError();
    this.aplicando.set(true);

    this.servicio
      .abonarCapital({
        idPrestamo: this.data.idPrestamo,
        valor: sim.valorAbono,
        // Del resultado de la simulación, nunca del signal: es lo que el usuario acaba de ver.
        modalidad: sim.modalidad,
        usuario: usuarioSesion(),
        observacion: this.observacion.trim() || null,
        fecha: this.servicio.formatearFecha(this.fecha()),
      })
      .subscribe((resp) => {
        this.aplicando.set(false);
        if (resp.exito && resp.resultado) {
          const resultado = resp.resultado;
          this.dialog.open(ReciboOperacionDialogComponent, {
            data: {
              tipo: 'ABONO_CAPITAL',
              tituloPrestamo: this.data.titulo,
              participante: this.data.participante ?? undefined,
              mensaje: resp.mensaje,
              fecha: this.servicio.formatearFecha(this.fecha()) ?? undefined,
              abono: resultado,
              detalleExtra: [
                { label: 'Ahorro en intereses', valor: this.formatMoneda(sim.ahorroIntereses) },
                {
                  label: 'Modalidad',
                  valor:
                    sim.modalidad === ModalidadAbono.REDUCIR_PLAZO
                      ? 'Mantener cuota y reducir plazo'
                      : 'Mantener plazo y reducir cuota',
                },
              ],
            },
            width: '760px',
            maxWidth: '95vw',
            autoFocus: false,
          });
          // La tabla de amortización se regeneró: los códigos de cuota cacheados quedaron inválidos.
          this.dialogRef.close({ accion: 'aplicado', recargarTabla: true, abono: resultado });
        } else {
          this.errorCodigo.set(String(resp.error ?? ''));
          this.errorMensaje.set(mensajeDeRespuesta(resp));
        }
      });
  }

  // ================= derivaciones que sugiere la guía =================

  irAPagarCuotas(): void {
    this.dialogRef.close({ accion: 'ir-a-pagar' });
  }

  irAPrecancelar(): void {
    this.dialogRef.close({ accion: 'ir-a-precancelar' });
  }

  usarModalidadReducirCuota(): void {
    this.modalidad.set(ModalidadAbono.REDUCIR_CUOTA);
    this.limpiarError();
    this.simular();
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  // ================= utilidades =================

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private parseMoneda(texto: string | null | undefined): number {
    if (!texto) return 0;
    const n = parseFloat(String(texto).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
}
