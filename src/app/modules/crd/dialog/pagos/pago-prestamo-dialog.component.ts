import { CommonModule } from '@angular/common';
import { Component, Inject, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import { TOLERANCIA_MONTO } from '../../model/pagos/catalogos-pago';
import { SaldoAporte } from '../../model/pagos/operaciones-pago';
import { DesgloseAporte, mensajeDeRespuesta } from '../../model/pagos/respuesta-pago';
import { OperacionesPagoPrestamoService } from '../../service/operaciones-pago-prestamo.service';
import { ContextoPrestamo, SalidaDialogoPago } from './contexto-prestamo';
import { ReciboOperacionDialogComponent } from './recibo-operacion-dialog.component';

export type ModoPago = 'efectivo' | 'aportes';

export interface PagoPrestamoDialogData extends ContextoPrestamo {
  /** Modo inicial. El usuario puede cambiarlo dentro del diálogo. */
  modoInicial?: ModoPago;
}

interface RenglonAporte {
  idTipoAporte: number;
  nombre: string;
  disponible: number;
  texto: string;
}

/**
 * Pago de cuota(s) de un préstamo, en efectivo (§4) o con saldo de aportes (§5).
 *
 * Los dos endpoints aplican la misma cascada y prelación, así que se resuelven con la misma
 * pantalla y solo cambia de dónde sale el dinero. El pago mixto de cuotas normales NO es atómico:
 * la guía indica resolverlo con dos llamadas consecutivas, por eso acá se elige una u otra fuente
 * y el aviso lo explica.
 */
@Component({
  selector: 'app-pago-prestamo-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MaterialFormModule],
  templateUrl: './pago-prestamo-dialog.component.html',
  styleUrl: './pago-prestamo-dialog.component.scss',
})
export class PagoPrestamoDialogComponent {
  private servicio = inject(OperacionesPagoPrestamoService);
  private dialog = inject(MatDialog);

  readonly hoy = new Date();

  modo = signal<ModoPago>('efectivo');
  registrando = signal(false);
  cargandoSaldos = signal(false);

  valorTexto = signal('');
  fechaPago = signal<Date>(new Date());
  observacion = '';

  saldos = signal<SaldoAporte[]>([]);
  renglones: RenglonAporte[] = [];
  private renglonesVersion = signal(0);

  errorMensaje = signal<string | null>(null);
  errorCodigo = signal<string | null>(null);

  valorEfectivo = computed(() => this.parseMoneda(this.valorTexto()));

  totalAportes = computed(() => {
    this.renglonesVersion();
    return +this.renglones.reduce((s, r) => s + this.parseMoneda(r.texto), 0).toFixed(2);
  });

  hayExcesoEnAlgunAporte = computed(() => {
    this.renglonesVersion();
    return this.renglones.some((r) => this.parseMoneda(r.texto) > r.disponible + TOLERANCIA_MONTO);
  });

  saldoAportesTotal = computed(() => this.saldos().reduce((s, a) => s + Math.max(a.saldo ?? 0, 0), 0));

  /** Monto que se va a enviar, cualquiera sea la fuente. */
  montoAPagar = computed(() => (this.modo() === 'efectivo' ? this.valorEfectivo() : this.totalAportes()));

  excedeDeuda = computed(() => {
    const saldo = this.data.saldoTotal ?? 0;
    return saldo > 0 && this.montoAPagar() > saldo + TOLERANCIA_MONTO;
  });

  puedeConfirmar = computed(
    () =>
      this.montoAPagar() > 0.004 &&
      !this.registrando() &&
      !(this.modo() === 'aportes' && this.hayExcesoEnAlgunAporte())
  );

  /**
   * Sugerencias táctiles: las próximas cuotas y el saldo total.
   *
   * Si la pantalla mandó `pendientesAcumulados` se usan esos montos, que son el pendiente real de
   * cada cuota sumado en orden de cobro. El múltiplo de `valorCuota` es solo el respaldo: da un
   * monto aproximado cuando la primera cuota viene parcialmente pagada o alguna arrastra mora.
   */
  sugerencias = computed(() => {
    const opciones: { etiqueta: string; valor: number }[] = [];
    const acumulados = this.data.pendientesAcumulados ?? [];
    const cuota = this.data.valorCuota ?? 0;
    const saldo = this.data.saldoTotal ?? 0;

    for (let i = 0; i < 3; i++) {
      const etiqueta = i === 0 ? '1 cuota' : `${i + 1} cuotas`;
      const valor = acumulados[i] ?? (cuota > 0 ? +(cuota * (i + 1)).toFixed(2) : 0);
      if (valor > 0) opciones.push({ etiqueta, valor: +valor.toFixed(2) });
    }

    if (saldo > 0) opciones.push({ etiqueta: 'Saldo total', valor: +saldo.toFixed(2) });
    return opciones.filter((o) => o.valor > 0 && (saldo <= 0 || o.valor <= saldo + TOLERANCIA_MONTO));
  });

  constructor(
    private dialogRef: MatDialogRef<PagoPrestamoDialogComponent, SalidaDialogoPago | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: PagoPrestamoDialogData
  ) {
    this.modo.set(data.modoInicial ?? 'efectivo');
    if (this.modo() === 'aportes') this.cargarSaldos();
  }

  cambiarModo(modo: ModoPago): void {
    this.modo.set(modo);
    this.limpiarError();
    if (modo === 'aportes' && !this.saldos().length && !this.cargandoSaldos()) this.cargarSaldos();
  }

  private limpiarError(): void {
    this.errorMensaje.set(null);
    this.errorCodigo.set(null);
  }

  // ================= saldos de aportes =================

  cargarSaldos(): void {
    const idEntidad = this.data.idEntidad;
    if (!idEntidad) {
      this.saldos.set([]);
      this.renglones = [];
      this.renglonesVersion.update((v) => v + 1);
      return;
    }

    this.cargandoSaldos.set(true);
    this.servicio.saldosPorEntidad(idEntidad).subscribe((resp) => {
      this.cargandoSaldos.set(false);
      // Solo se ofrece pagar con tipos cuyo saldo sea positivo: un saldo 0 o negativo indica
      // inconsistencia de datos y el backend lo rechazaría igual.
      const disponibles = (resp.exito ? resp.resultado ?? [] : []).filter((a) => (a.saldo ?? 0) > 0.004);
      this.saldos.set(disponibles);
      this.renglones = disponibles.map((a) => ({
        idTipoAporte: a.idTipoAporte,
        nombre: a.nombre,
        disponible: +(a.saldo ?? 0).toFixed(2),
        texto: '',
      }));
      this.renglonesVersion.update((v) => v + 1);
    });
  }

  onRenglonBlur(renglon: RenglonAporte): void {
    let v = Math.max(this.parseMoneda(renglon.texto), 0);
    if (v > renglon.disponible + TOLERANCIA_MONTO) v = renglon.disponible;
    v = +v.toFixed(2);
    renglon.texto = v > 0.004 ? this.formatMoneda(v) : '';
    this.renglonesVersion.update((n) => n + 1);
  }

  usarMaximo(renglon: RenglonAporte): void {
    renglon.texto = renglon.disponible > 0.004 ? this.formatMoneda(renglon.disponible) : '';
    this.renglonesVersion.update((n) => n + 1);
  }

  montoDe(renglon: RenglonAporte): number {
    this.renglonesVersion();
    return this.parseMoneda(renglon.texto);
  }

  // ================= efectivo =================

  usarSugerencia(valor: number): void {
    this.valorTexto.set(this.formatMoneda(valor));
    this.limpiarError();
  }

  onValorBlur(): void {
    const v = Math.max(this.valorEfectivo(), 0);
    this.valorTexto.set(v > 0.004 ? this.formatMoneda(v) : '');
  }

  // ================= confirmar =================

  confirmar(): void {
    if (!this.puedeConfirmar()) return;
    this.limpiarError();
    this.registrando.set(true);

    const fechaPago = this.servicio.formatearFecha(this.fechaPago());
    const usuario = usuarioSesion();
    const observacion = this.observacion.trim() || null;

    if (this.modo() === 'efectivo') {
      // Se redondea acá y no en el blur: confirmar con Enter no dispara el blur del campo.
      const valor = +this.valorEfectivo().toFixed(2);
      this.servicio
        .pagarCuota({ idPrestamo: this.data.idPrestamo, valor, usuario, observacion, fechaPago })
        .subscribe((resp) => {
          this.registrando.set(false);
          if (resp.exito && resp.resultado) {
            this.mostrarRecibo('PAGO_MANUAL', resp.mensaje, fechaPago, resp.resultado, []);
          } else {
            this.manejarError(resp.error, mensajeDeRespuesta(resp));
          }
        });
      return;
    }

    const aportes: DesgloseAporte[] = this.renglones
      .filter((r) => this.parseMoneda(r.texto) > 0.004)
      .map((r) => ({ idTipoAporte: r.idTipoAporte, valor: +this.parseMoneda(r.texto).toFixed(2) }));

    this.servicio
      .pagarConAportes({ idPrestamo: this.data.idPrestamo, usuario, observacion, fechaPago, aportes })
      .subscribe((resp) => {
        this.registrando.set(false);
        if (resp.exito && resp.resultado) {
          this.mostrarRecibo('PAGO_APORTES', resp.mensaje, fechaPago, resp.resultado, resp.movimientosAporte ?? []);
        } else {
          this.manejarError(resp.error, mensajeDeRespuesta(resp));
          if (resp.error === 'SALDO_APORTES_INSUFICIENTE' || resp.error === 'TIPO_APORTE_NO_VIGENTE') {
            this.cargarSaldos();
          }
        }
      });
  }

  private mostrarRecibo(
    tipo: 'PAGO_MANUAL' | 'PAGO_APORTES',
    mensaje: string | undefined,
    fecha: string | null,
    resultado: import('../../model/pagos/operaciones-pago').ResultadoPagoCuota,
    movimientosAporte: import('../../model/pagos/respuesta-pago').MovimientoAporte[]
  ): void {
    const nombres: Record<number, string> = {};
    for (const a of this.saldos()) nombres[a.idTipoAporte] = a.nombre;

    this.dialog.open(ReciboOperacionDialogComponent, {
      data: {
        tipo,
        tituloPrestamo: this.data.titulo,
        participante: this.data.participante ?? undefined,
        mensaje,
        fecha: fecha ?? undefined,
        pago: resultado,
        movimientosAporte,
        nombresTipoAporte: nombres,
      },
      width: '860px',
      maxWidth: '96vw',
      autoFocus: false,
    });

    // Un pago no regenera la tabla de amortización, pero sí cambia estados y saldos de las cuotas.
    this.dialogRef.close({ accion: 'aplicado', recargarTabla: true });
  }

  private manejarError(codigo: string | undefined, mensaje: string): void {
    this.errorCodigo.set(String(codigo ?? ''));
    this.errorMensaje.set(mensaje);
  }

  irAPrecancelar(): void {
    this.dialogRef.close({ accion: 'ir-a-precancelar' });
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
