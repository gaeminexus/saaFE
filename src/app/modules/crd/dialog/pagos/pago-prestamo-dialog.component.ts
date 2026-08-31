import { CommonModule } from '@angular/common';
import { Component, Inject, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import { TOLERANCIA_MONTO } from '../../model/pagos/catalogos-pago';
import { ResultadoPagoCuota, SaldoAporte } from '../../model/pagos/operaciones-pago';
import { DesgloseAporte, MovimientoAporte, mensajeDeRespuesta } from '../../model/pagos/respuesta-pago';
import { ComprobanteCobroService } from '../../service/comprobante-cobro.service';
import { CobroCreditoService } from '../../service/cobro-credito.service';
import { OperacionesPagoPrestamoService } from '../../service/operaciones-pago-prestamo.service';
import { CobroRegistradoDialogComponent } from './cobro-registrado-dialog.component';
import { ContextoPrestamo, SalidaDialogoPago } from './contexto-prestamo';
import { ReciboOperacionDialogComponent } from './recibo-operacion-dialog.component';
import { RespaldoCobroComponent } from './respaldo-cobro.component';

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
 *
 * Cuando el dinero entra por fuera del sistema (efectivo/transferencia) el bloque de respaldo es
 * obligatorio: banco receptor, referencia y comprobante digitalizado, cuya ruta se estampa en el
 * pago. En el pago con saldo de aportes no hay nada externo que respaldar y el bloque no aplica.
 */
@Component({
  selector: 'app-pago-prestamo-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MaterialFormModule, RespaldoCobroComponent],
  templateUrl: './pago-prestamo-dialog.component.html',
  styleUrl: './pago-prestamo-dialog.component.scss',
})
export class PagoPrestamoDialogComponent {
  private servicio = inject(OperacionesPagoPrestamoService);
  private comprobantes = inject(ComprobanteCobroService);
  private cobroCreditoService = inject(CobroCreditoService);
  private dialog = inject(MatDialog);

  /** Bloque de respaldo. Se renderiza siempre, así que cambiar de modo no pierde lo ya cargado. */
  respaldo = viewChild(RespaldoCobroComponent);

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

  /** El dinero entra por fuera del sistema: hay que registrar banco, referencia y comprobante. */
  requiereRespaldo = computed(() => this.modo() === 'efectivo');

  respaldoListo = computed(() => !this.requiereRespaldo() || (this.respaldo()?.completo() ?? false));

  /** La fecha del pago es parte del registro del cobro: tiene que estar y no puede ser futura. */
  fechaValida = computed(() => {
    const fecha = this.fechaPago();
    if (!fecha || isNaN(fecha.getTime())) return false;
    const limite = new Date(this.hoy);
    limite.setHours(23, 59, 59, 999);
    return fecha.getTime() <= limite.getTime();
  });

  puedeConfirmar = computed(
    () =>
      this.montoAPagar() > 0.004 &&
      !this.registrando() &&
      !(this.modo() === 'aportes' && this.hayExcesoEnAlgunAporte()) &&
      this.fechaValida() &&
      this.respaldoListo()
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

  /**
   * Registra el pago. En efectivo/transferencia son dos etapas: primero se archiva el comprobante
   * —su ruta viaja DENTRO del request— y recién con el archivo en el servidor se llama al endpoint.
   * Si la subida falla se aborta sin haber tocado plata, que es preferible a dejar el pago
   * registrado y sin respaldo.
   */
  confirmar(): void {
    if (!this.puedeConfirmar()) return;
    this.limpiarError();
    this.registrando.set(true);

    if (this.modo() === 'efectivo') {
      this.archivarComprobante((ruta, exito) => {
        if (!exito) {
          this.registrando.set(false);
          return;
        }
        this.enviarPagoEfectivo(ruta);
      });
      return;
    }

    this.enviarPagoConAportes();
  }

  private archivarComprobante(continuar: (ruta: string | null, exito: boolean) => void): void {
    const archivo = this.requiereRespaldo() ? this.respaldo()?.datos().archivo ?? null : null;
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
          this.manejarError('COMPROBANTE_NO_ARCHIVADO', this.comprobantes.mensajeDeFallo(resultado.error ?? ''));
          continuar(null, false);
          return;
        }
        continuar(resultado.ruta, true);
      });
  }

  /**
   * `PAGO_CUOTA` en efectivo/transferencia/depósito ya pasa por CRD.CBCR en vez del endpoint
   * directo (docs/crd/PLAN-CUTOVER-COBROS-POR-CONTABILIDAD.md): el cobro queda REGISTRADO,
   * pendiente de aprobación de contabilidad — el préstamo no se modifica todavía.
   */
  private enviarPagoEfectivo(rutaDocumentoRespaldo: string | null): void {
    const fechaPago = this.servicio.formatearFecha(this.fechaPago());
    // Se redondea acá y no en el blur: confirmar con Enter no dispara el blur del campo.
    const valor = +this.valorEfectivo().toFixed(2);
    const respaldo = this.respaldo()?.datos();
    const cuenta = respaldo?.cuenta;

    // Defensivo: `respaldoListo()` ya exige cuenta, referencia y comprobante antes de habilitar el
    // botón — no debería poder llegar acá sin ellos.
    if (!cuenta || !fechaPago || !rutaDocumentoRespaldo) {
      this.registrando.set(false);
      this.manejarError(undefined, 'Faltan datos del respaldo del cobro. Intente nuevamente.');
      this.comprobantes.descartar(rutaDocumentoRespaldo);
      return;
    }

    this.cobroCreditoService
      .registrar({
        idEntidad: this.data.idEntidad ?? 0,
        tipoOperacion: 'PAGO_CUOTA',
        idCuentaBancaria: cuenta.codigo,
        referencia: respaldo.referencia,
        rutaRespaldo: rutaDocumentoRespaldo,
        valor,
        fecha: fechaPago,
        observacion: this.observacion.trim() || null,
        usuario: usuarioSesion(),
        detalles: [{ idPrestamo: this.data.idPrestamo, valor }],
      })
      .subscribe((resp) => {
        this.registrando.set(false);
        if (!resp.exito || !resp.resultado) {
          this.manejarError(resp.errorCliente ? 'ERROR_CLIENTE' : undefined, resp.mensaje ?? 'No se pudo registrar el cobro.');
          // El comprobante ya subido queda huérfano: no lo referencia ningún cobro, así que se borra
          // para no dejar basura acumulándose en la carpeta del préstamo con cada reintento.
          this.comprobantes.descartar(rutaDocumentoRespaldo);
          return;
        }

        const registro = resp.resultado;
        this.dialog.open(CobroRegistradoDialogComponent, {
          data: {
            tipoOperacion: 'PAGO_CUOTA',
            idCobro: registro.idCobro,
            valor: registro.valor,
            contabilidadActiva: registro.contabilidadActiva,
            tituloPrestamo: this.data.titulo,
            participante: this.data.participante ?? undefined,
            fecha: fechaPago,
            referencia: respaldo.referencia,
          },
          width: '640px',
          maxWidth: '96vw',
          autoFocus: false,
        });

        // A diferencia de un pago aplicado, acá no cambió nada del préstamo: no hay tabla que recargar.
        this.dialogRef.close({ accion: 'registrado' });
      });
  }

  private enviarPagoConAportes(): void {
    const fechaPago = this.servicio.formatearFecha(this.fechaPago());
    const aportes: DesgloseAporte[] = this.renglones
      .filter((r) => this.parseMoneda(r.texto) > 0.004)
      .map((r) => ({ idTipoAporte: r.idTipoAporte, valor: +this.parseMoneda(r.texto).toFixed(2) }));

    this.servicio
      .pagarConAportes({
        idPrestamo: this.data.idPrestamo,
        usuario: usuarioSesion(),
        observacion: this.observacion.trim() || null,
        fechaPago,
        aportes,
      })
      .subscribe((resp) => {
        this.registrando.set(false);
        if (resp.exito && resp.resultado) {
          this.mostrarRecibo('PAGO_APORTES', resp.mensaje, fechaPago, resp.resultado, resp.movimientosAporte ?? [], null);
        } else {
          this.manejarError(resp.error, mensajeDeRespuesta(resp));
          if (resp.error === 'SALDO_APORTES_INSUFICIENTE' || resp.error === 'TIPO_APORTE_NO_VIGENTE') {
            this.cargarSaldos();
          }
        }
      });
  }

  /**
   * El backend guarda una sola observación por pago: el método, la referencia y la cuenta receptora
   * se anexan a la que escribió el usuario porque son el dato con el que después se concilia el
   * movimiento contra el extracto bancario. `PGPROBSR` admite 200 caracteres.
   */
  private armarObservacion(): string | null {
    const partes: string[] = [];
    const propia = this.observacion.trim();
    if (propia) partes.push(propia);
    if (this.requiereRespaldo()) {
      const resumen = this.respaldo()?.resumen();
      if (resumen) partes.push(resumen);
    }
    const texto = partes.join(' · ');
    return texto ? texto.slice(0, 200) : null;
  }

  private mostrarRecibo(
    tipo: 'PAGO_MANUAL' | 'PAGO_APORTES',
    mensaje: string | undefined,
    fecha: string | null,
    resultado: ResultadoPagoCuota,
    movimientosAporte: MovimientoAporte[],
    rutaComprobante: string | null
  ): void {
    const nombres: Record<number, string> = {};
    for (const a of this.saldos()) nombres[a.idTipoAporte] = a.nombre;

    const extras = rutaComprobante
      ? [
          { label: 'Comprobante adjunto', valor: this.respaldo()?.datos().archivo?.name ?? '—' },
          { label: 'Archivado en', valor: rutaComprobante },
        ]
      : [];

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
        detalleExtra: extras.length ? extras : undefined,
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
