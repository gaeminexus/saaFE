import { CommonModule } from '@angular/common';
import { Component, Inject, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import { TOLERANCIA_MONTO } from '../../model/pagos/catalogos-pago';
import { SaldoAporte, SimulacionPrecancelacion } from '../../model/pagos/operaciones-pago';
import { DesgloseAporte, mensajeDeRespuesta } from '../../model/pagos/respuesta-pago';
import { OperacionesPagoPrestamoService } from '../../service/operaciones-pago-prestamo.service';
import { ContextoPrestamo, SalidaDialogoPago } from './contexto-prestamo';
import { ReciboOperacionDialogComponent } from './recibo-operacion-dialog.component';

type Paso = 'simulacion' | 'reparto';

/** Renglón editable del reparto entre efectivo y cada tipo de aporte disponible. */
interface RenglonFondo {
  clave: string;
  nombre: string;
  /** null en el renglón de efectivo. */
  idTipoAporte: number | null;
  /** Infinity para efectivo; el saldo disponible para los aportes. */
  disponible: number;
  texto: string;
}

/**
 * Precancelación en dos pasos obligatorios (§8-§9 y flujo C de la guía).
 *
 * El backend re-verifica el monto al aplicar, así que la simulación no es opcional: define el
 * `valorTotalPrecancelacion` que hay que cobrar y que el reparto entre efectivo y aportes debe
 * igualar con ±0.01 de tolerancia. Como el valor depende de la fecha de corte (la mora sigue
 * corriendo), cambiar la fecha invalida el reparto y obliga a simular de nuevo.
 */
@Component({
  selector: 'app-precancelacion-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MaterialFormModule],
  templateUrl: './precancelacion-dialog.component.html',
  styleUrl: './precancelacion-dialog.component.scss',
})
export class PrecancelacionDialogComponent {
  private servicio = inject(OperacionesPagoPrestamoService);
  private dialog = inject(MatDialog);

  readonly hoy = new Date();

  paso = signal<Paso>('simulacion');
  simulando = signal(false);
  aplicando = signal(false);
  cargandoSaldos = signal(false);

  fechaCorte = signal<Date>(new Date());
  observacion = '';

  simulacion = signal<SimulacionPrecancelacion | null>(null);
  saldos = signal<SaldoAporte[]>([]);
  detalleExigiblesAbierto = signal(false);

  errorMensaje = signal<string | null>(null);
  errorCodigo = signal<string | null>(null);
  /** Se enciende tras un MONTO_NO_COINCIDE: exige una confirmación nueva sobre el monto corregido. */
  montoRecalculado = signal(false);

  /** Renglones del reparto; se mutan directamente, por eso el contador de versión. */
  fondos: RenglonFondo[] = [];
  private fondosVersion = signal(0);

  total = computed(() => this.simulacion()?.valorTotalPrecancelacion ?? 0);

  repartido = computed(() => {
    this.fondosVersion();
    return +this.fondos.reduce((s, f) => s + this.parseMoneda(f.texto), 0).toFixed(2);
  });

  diferencia = computed(() => +(this.total() - this.repartido()).toFixed(2));
  cuadra = computed(() => Math.abs(this.diferencia()) <= TOLERANCIA_MONTO);
  /** Hay algo que corregir: falta o sobra. "Completar" también sirve para bajar un fondo pasado. */
  necesitaAjuste = computed(() => Math.abs(this.diferencia()) > TOLERANCIA_MONTO);

  /** Un aporte solo puede usarse hasta su saldo; el efectivo no tiene tope. */
  hayExcesoEnAlgunAporte = computed(() => {
    this.fondosVersion();
    return this.fondos.some(
      (f) => f.idTipoAporte != null && this.parseMoneda(f.texto) > f.disponible + TOLERANCIA_MONTO
    );
  });

  puedeConfirmar = computed(
    () => this.cuadra() && !this.hayExcesoEnAlgunAporte() && !this.aplicando() && this.total() > 0.004
  );

  saldoAportesTotal = computed(() => this.saldos().reduce((s, a) => s + Math.max(a.saldo ?? 0, 0), 0));

  constructor(
    private dialogRef: MatDialogRef<PrecancelacionDialogComponent, SalidaDialogoPago | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: ContextoPrestamo
  ) {
    this.simular();
  }

  // ================= paso 1: simular =================

  simular(): void {
    if (this.simulando()) return;
    this.errorMensaje.set(null);
    this.errorCodigo.set(null);
    this.montoRecalculado.set(false);
    this.simulando.set(true);

    const fecha = this.servicio.formatearFecha(this.fechaCorte());
    this.servicio.simularPrecancelacion(this.data.idPrestamo, fecha).subscribe((resp) => {
      this.simulando.set(false);
      if (resp.exito && resp.resultado) {
        const primeraCarga = this.fondos.length === 0;
        this.simulacion.set(resp.resultado);
        this.paso.set('reparto');
        this.cargarSaldos(primeraCarga);
      } else {
        this.simulacion.set(null);
        this.paso.set('simulacion');
        this.errorCodigo.set(String(resp.error ?? ''));
        this.errorMensaje.set(mensajeDeRespuesta(resp));
      }
    });
  }

  /** Cambiar la fecha de corte cambia la mora: hay que volver a simular antes de repartir. */
  onFechaCorteCambio(fecha: Date): void {
    this.fechaCorte.set(fecha);
    this.paso.set('simulacion');
    this.simulacion.set(null);
  }

  /**
   * @param precargarEfectivo solo en la primera carga. Al refrescar saldos tras un error se
   * conserva lo que el usuario ya había repartido: volver a poner el total en el renglón de
   * efectivo dejaría el reparto cuadrado y confirmable con un clic, registrando en efectivo un
   * dinero que el socio nunca entregó.
   */
  private cargarSaldos(precargarEfectivo: boolean): void {
    const idEntidad = this.data.idEntidad;
    this.construirFondos([], precargarEfectivo);
    if (!idEntidad) return;

    this.cargandoSaldos.set(true);
    this.servicio.saldosPorEntidad(idEntidad).subscribe((resp) => {
      this.cargandoSaldos.set(false);
      // Una lista vacía es 200 con []: el partícipe simplemente no tiene aportes.
      const disponibles = (resp.exito ? resp.resultado ?? [] : []).filter((a) => (a.saldo ?? 0) > 0.004);
      this.saldos.set(disponibles);
      this.construirFondos(disponibles, precargarEfectivo);
    });
  }

  private construirFondos(saldos: SaldoAporte[], precargarEfectivo: boolean): void {
    // Lo que el usuario ya escribió, por si esto es un refresco y no la carga inicial.
    const textoPrevio = new Map(this.fondos.map((f) => [f.clave, f.texto]));
    const texto = (clave: string, porDefecto = '') =>
      precargarEfectivo ? porDefecto : textoPrevio.get(clave) ?? porDefecto;

    this.fondos = [
      {
        clave: 'efectivo',
        nombre: 'Efectivo / transferencia',
        idTipoAporte: null,
        disponible: Number.POSITIVE_INFINITY,
        // Arranca con todo en efectivo: es el caso más común en ventanilla.
        texto: texto('efectivo', this.formatMoneda(this.total())),
      },
      ...saldos.map((a) => ({
        clave: `aporte-${a.idTipoAporte}`,
        nombre: a.nombre,
        idTipoAporte: a.idTipoAporte,
        disponible: +(a.saldo ?? 0).toFixed(2),
        texto: texto(`aporte-${a.idTipoAporte}`),
      })),
    ];
    this.fondosVersion.update((v) => v + 1);
  }

  // ================= paso 2: reparto =================

  /** Al tocar el reparto se apaga el aviso del intento anterior: ya no describe lo que hay. */
  private repartoCambiado(): void {
    this.fondosVersion.update((n) => n + 1);
    this.errorMensaje.set(null);
    this.errorCodigo.set(null);
    this.montoRecalculado.set(false);
  }

  onFondoBlur(fondo: RenglonFondo): void {
    let v = Math.max(this.parseMoneda(fondo.texto), 0);
    if (fondo.idTipoAporte != null && v > fondo.disponible + TOLERANCIA_MONTO) v = fondo.disponible;
    v = +v.toFixed(2);
    fondo.texto = v > 0.004 ? this.formatMoneda(v) : '';
    this.repartoCambiado();
  }

  /** Asigna a este fondo lo que falta para cuadrar, sin pasarse de su disponible. */
  completarConEsteFondo(fondo: RenglonFondo): void {
    const yaPuesto = this.parseMoneda(fondo.texto);
    const objetivo = yaPuesto + this.diferencia();
    const tope = fondo.idTipoAporte != null ? fondo.disponible : Number.POSITIVE_INFINITY;
    const v = +Math.max(Math.min(objetivo, tope), 0).toFixed(2);
    fondo.texto = v > 0.004 ? this.formatMoneda(v) : '';
    this.repartoCambiado();
  }

  todoEnEfectivo(): void {
    for (const f of this.fondos) {
      f.texto = f.idTipoAporte == null ? this.formatMoneda(this.total()) : '';
    }
    this.repartoCambiado();
  }

  /** Consume primero los aportes disponibles y deja el resto en efectivo. */
  usarAportesPrimero(): void {
    let restante = this.total();
    for (const f of this.fondos) {
      if (f.idTipoAporte == null) continue;
      const usar = +Math.min(f.disponible, Math.max(restante, 0)).toFixed(2);
      f.texto = usar > 0.004 ? this.formatMoneda(usar) : '';
      restante = +(restante - usar).toFixed(2);
    }
    const efectivo = this.fondos.find((f) => f.idTipoAporte == null);
    if (efectivo) efectivo.texto = restante > 0.004 ? this.formatMoneda(restante) : '';
    this.repartoCambiado();
  }

  limpiarReparto(): void {
    for (const f of this.fondos) f.texto = '';
    this.repartoCambiado();
  }

  montoDe(fondo: RenglonFondo): number {
    this.fondosVersion();
    return this.parseMoneda(fondo.texto);
  }

  // ================= confirmar =================

  confirmar(): void {
    if (!this.puedeConfirmar()) return;
    this.errorMensaje.set(null);
    this.errorCodigo.set(null);
    this.aplicando.set(true);

    const efectivo = this.fondos.find((f) => f.idTipoAporte == null);
    const aportes: DesgloseAporte[] = this.fondos
      .filter((f) => f.idTipoAporte != null && this.parseMoneda(f.texto) > 0.004)
      .map((f) => ({ idTipoAporte: f.idTipoAporte as number, valor: +this.parseMoneda(f.texto).toFixed(2) }));

    const fecha = this.servicio.formatearFecha(this.fechaCorte());

    this.servicio
      .precancelar({
        idPrestamo: this.data.idPrestamo,
        valorEfectivo: +this.parseMoneda(efectivo?.texto).toFixed(2),
        aportes: aportes.length ? aportes : undefined,
        usuario: usuarioSesion(),
        observacion: this.observacion.trim() || null,
        fecha,
      })
      .subscribe((resp) => {
        this.aplicando.set(false);

        if (resp.exito && resp.resultado) {
          const resultado = resp.resultado;
          this.dialog.open(ReciboOperacionDialogComponent, {
            data: {
              tipo: 'PRECANCELACION',
              tituloPrestamo: this.data.titulo,
              participante: this.data.participante ?? undefined,
              mensaje: resp.mensaje,
              fecha: fecha ?? undefined,
              precancelacion: resultado,
              nombresTipoAporte: this.nombresTipoAporte(),
              detalleExtra: [
                { label: 'Intereses condonados', valor: this.formatMoneda(this.simulacion()?.interesCondonado) },
                { label: 'Pagado en efectivo', valor: this.formatMoneda(this.parseMoneda(efectivo?.texto)) },
              ],
            },
            width: '760px',
            maxWidth: '95vw',
            autoFocus: false,
          });
          this.dialogRef.close({ accion: 'aplicado', recargarTabla: true, precancelacion: resultado });
          return;
        }

        this.errorCodigo.set(String(resp.error ?? ''));
        this.errorMensaje.set(mensajeDeRespuesta(resp));

        // El backend devuelve el valor correcto: se refresca en pantalla y se pide confirmar de
        // nuevo, nunca se reintenta solo (§9 de la guía).
        if (resp.error === 'MONTO_NO_COINCIDE' && resp.valorTotalPrecancelacion != null) {
          const sim = this.simulacion();
          if (sim) {
            this.simulacion.set({ ...sim, valorTotalPrecancelacion: resp.valorTotalPrecancelacion });
            this.montoRecalculado.set(true);
          }
        }

        // El saldo pudo cambiar por otra operación concurrente. Se refrescan los disponibles pero
        // se conserva el reparto que el usuario había armado, para que corrija sobre él.
        if (resp.error === 'SALDO_APORTES_INSUFICIENTE' || resp.error === 'TIPO_APORTE_NO_VIGENTE') {
          this.cargarSaldos(false);
        }
      });
  }

  nombresTipoAporte(): Record<number, string> {
    const mapa: Record<number, string> = {};
    for (const a of this.saldos()) mapa[a.idTipoAporte] = a.nombre;
    return mapa;
  }

  irAPagarCuotas(): void {
    this.dialogRef.close({ accion: 'ir-a-pagar' });
  }

  toggleDetalleExigibles(): void {
    this.detalleExigiblesAbierto.update((v) => !v);
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
