import { CommonModule } from '@angular/common';
import { Component, Inject, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { guardarArchivo, mensajeReporteFallido } from '../../../../shared/services/descarga-reporte';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import { ModalidadAbono, NOMBRE_TIPO_AMORTIZACION } from '../../model/pagos/catalogos-pago';
import { SimulacionAbonoCapital } from '../../model/pagos/operaciones-pago';
import { mensajeDeRespuesta } from '../../model/pagos/respuesta-pago';
import { SolicitudReporteSimulacion } from '../../model/simuladores/reporte-simulacion';
import { ComprobanteCobroService } from '../../service/comprobante-cobro.service';
import { OperacionesPagoPrestamoService } from '../../service/operaciones-pago-prestamo.service';
import { ContextoPrestamo, SalidaDialogoPago } from './contexto-prestamo';
import { ReciboOperacionDialogComponent } from './recibo-operacion-dialog.component';
import { RespaldoCobroComponent } from './respaldo-cobro.component';

type Paso = 'datos' | 'comparativa';

/**
 * Abono a capital en dos pasos obligatorios (§6-§7 y flujo D de la guía): primero se simula, se
 * muestra la comparativa y recién con la confirmación explícita se aplica.
 *
 * El usuario puede cambiar la modalidad y volver a simular sin cerrar el diálogo: ese comparador
 * es justamente lo que necesita para decidir entre "termino antes" y "pago menos por mes".
 *
 * El abono siempre es dinero que el socio entrega por fuera del sistema (no existe abono con saldo
 * de aportes), así que el bloque de respaldo —banco, referencia y comprobante digitalizado— es
 * obligatorio y su ruta viaja en el request como `rutaDocumentoRespaldo`.
 */
@Component({
  selector: 'app-abono-capital-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MaterialFormModule, RespaldoCobroComponent],
  templateUrl: './abono-capital-dialog.component.html',
  styleUrl: './abono-capital-dialog.component.scss',
})
export class AbonoCapitalDialogComponent {
  private servicio = inject(OperacionesPagoPrestamoService);
  private comprobantes = inject(ComprobanteCobroService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);

  /** Bloque de respaldo. Se renderiza siempre, así que la consulta resuelve tras la primera vista. */
  respaldo = viewChild(RespaldoCobroComponent);

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

  /**
   * Bandera única para habilitar "Exportar PDF" (fase 6 del plan).
   *
   * Habilitada el 2026-08-25, cuando se cumplieron sus dos precondiciones: el WAR con
   * `POST /prst/simulacion/reporte` (fase 3) desplegado, y los 3 `.jasper` compilados y
   * commiteados (fase 3b). Antes de eso el endpoint devolvía 500 — ver §9 de
   * docs/crd/PLAN-SIMULADORES-PRESTAMOS.md.
   */
  readonly exportarPdfHabilitado = true;
  exportandoPdf = signal(false);
  errorPdf = signal<string | null>(null);

  valor = computed(() => this.parseMoneda(this.valorTexto()));
  valorValido = computed(() => this.valor() > 0.004);

  /** La fecha del abono es parte del registro del cobro: tiene que estar y no puede ser futura. */
  fechaValida = computed(() => {
    const fecha = this.fecha();
    if (!fecha || isNaN(fecha.getTime())) return false;
    const limite = new Date(this.hoy);
    limite.setHours(23, 59, 59, 999);
    return fecha.getTime() <= limite.getTime();
  });

  /** El respaldo del dinero recibido (banco, referencia y comprobante) está completo. */
  respaldoListo = computed(() => this.respaldo()?.completo() ?? false);

  puedeAplicar = computed(
    () =>
      !!this.simulacion() &&
      !this.aplicando() &&
      !this.simulando() &&
      this.fechaValida() &&
      this.respaldoListo()
  );

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
  ) {
    // El monto ya tecleado en «Monto del pago» de la pantalla que abre el diálogo se precarga acá:
    // el usuario ingresó una sola vez cuánto recibió del socio y no tiene por qué repetirlo.
    const sugerido = data.valorSugerido ?? 0;
    if (sugerido > 0.004) this.valorTexto.set(this.formatMoneda(+sugerido.toFixed(2)));
  }

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

  /**
   * PDF de la simulación contra `POST /prst/simulacion/reporte` (§7 del plan). El backend
   * recalcula desde `idPrestamo`/`valor`/`modalidad` de la simulación ya confirmada — no se le
   * manda la tabla que se ve en pantalla.
   */
  exportarPdf(): void {
    const sim = this.simulacion();
    if (!this.exportarPdfHabilitado || !sim || this.exportandoPdf()) return;

    this.errorPdf.set(null);
    this.exportandoPdf.set(true);

    const solicitud: SolicitudReporteSimulacion = {
      tipo: 'ABONO_CAPITAL',
      idPrestamo: this.data.idPrestamo,
      valorAbono: sim.valorAbono,
      modalidadAbono: sim.modalidad,
      nombreSocio: this.data.participante ?? undefined,
    };

    this.servicio.reporteSimulacion(solicitud).subscribe({
      next: (blob) => {
        this.exportandoPdf.set(false);
        guardarArchivo(blob, `simulacion-abono-prestamo-${this.data.idPrestamo}.pdf`);
      },
      error: (err) => {
        this.exportandoPdf.set(false);
        mensajeReporteFallido(err).then((mensaje) => this.errorPdf.set(mensaje));
      },
    });
  }

  // ================= paso 2: aplicar =================

  /**
   * Aplica el abono en dos etapas: primero se archiva el comprobante —su ruta viaja DENTRO del
   * request, así que el archivo tiene que estar en el servidor antes— y recién después se llama al
   * endpoint. Si el archivo no se puede subir se aborta sin haber tocado plata: es preferible a
   * dejar el abono registrado y sin respaldo, que es justo lo que `PGPRRTRS` viene a evitar.
   */
  aplicar(): void {
    const sim = this.simulacion();
    // También se bloquea mientras hay una simulación en vuelo: cambiar de modalidad vuelve a
    // simular sin salir de este paso, y aplicar en esa ventana enviaría una modalidad distinta de
    // la que muestra la comparativa en pantalla.
    if (!sim || !this.puedeAplicar()) return;
    this.limpiarError();
    this.aplicando.set(true);

    this.archivarComprobante((ruta, exito) => {
      if (!exito) {
        this.aplicando.set(false);
        return;
      }
      this.enviarAbono(sim, ruta);
    });
  }

  private archivarComprobante(continuar: (ruta: string | null, exito: boolean) => void): void {
    const archivo = this.respaldo()?.datos().archivo ?? null;
    if (!archivo) {
      continuar(null, true);
      return;
    }

    this.comprobantes
      .archivar(
        archivo,
        this.comprobantes.carpetaDePrestamo(this.data.idPrestamo),
        String(this.data.idPrestamo)
      )
      .subscribe((resultado) => {
        if (resultado.error || !resultado.ruta) {
          this.errorCodigo.set('COMPROBANTE_NO_ARCHIVADO');
          this.errorMensaje.set(this.comprobantes.mensajeDeFallo(resultado.error ?? ''));
          continuar(null, false);
          return;
        }
        continuar(resultado.ruta, true);
      });
  }

  private enviarAbono(sim: SimulacionAbonoCapital, rutaDocumentoRespaldo: string | null): void {
    const fecha = this.servicio.formatearFecha(this.fecha());

    this.servicio
      .abonarCapital({
        idPrestamo: this.data.idPrestamo,
        valor: sim.valorAbono,
        // Del resultado de la simulación, nunca del signal: es lo que el usuario acaba de ver.
        modalidad: sim.modalidad,
        usuario: usuarioSesion(),
        observacion: this.armarObservacion(),
        fecha,
        rutaDocumentoRespaldo,
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
              fecha: fecha ?? undefined,
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
                ...this.detalleDelRespaldo(rutaDocumentoRespaldo),
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
          // El comprobante ya subido queda huérfano: no lo referencia ningún pago, así que se borra
          // para no dejar basura acumulándose en la carpeta del préstamo con cada reintento.
          this.comprobantes.descartar(rutaDocumentoRespaldo);
        }
      });
  }

  /**
   * El backend guarda una sola observación por operación: el método, la referencia y la cuenta
   * receptora se anexan a la que escribió el usuario porque son el dato con el que después se
   * concilia el movimiento contra el extracto bancario. `PGPROBSR` admite 200 caracteres.
   */
  private armarObservacion(): string | null {
    const partes: string[] = [];
    const propia = this.observacion.trim();
    if (propia) partes.push(propia);
    const resumen = this.respaldo()?.resumen();
    if (resumen) partes.push(resumen);
    const texto = partes.join(' · ');
    return texto ? texto.slice(0, 200) : null;
  }

  /** Filas del recibo que dejan constancia de qué comprobante respalda la operación. */
  private detalleDelRespaldo(ruta: string | null): { label: string; valor: string }[] {
    if (!ruta) return [];
    const datos = this.respaldo()?.datos();
    return [
      { label: 'Comprobante adjunto', valor: datos?.archivo?.name ?? '—' },
      { label: 'Archivado en', valor: ruta },
    ];
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

  /**
   * `fechaVencimiento` llega como arreglo `[y,m,d,h,mi]` (Jackson descarta el offset en vez de
   * convertirlo): se normaliza SIEMPRE con `FuncionesDatosService`, nunca con el pipe `date` a
   * secas, que interpretaría el arreglo como fecha inválida (§10.4 de
   * docs/crd/PLAN-SIMULADORES-PRESTAMOS.md).
   */
  formatFecha(fecha: unknown): string {
    return this.funcionesDatos.formatoFecha(fecha, 2) || '—';
  }

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private parseMoneda(texto: string | null | undefined): number {
    if (!texto) return 0;
    const n = parseFloat(String(texto).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
}
