import { CommonModule } from '@angular/common';
import { Component, Inject, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import { TOLERANCIA_MONTO } from '../../model/pagos/catalogos-pago';
import { SaldoAporte, SimulacionPrecancelacion } from '../../model/pagos/operaciones-pago';
import { DesgloseAporte, mensajeDeRespuesta } from '../../model/pagos/respuesta-pago';
import { ComprobanteCobroService } from '../../service/comprobante-cobro.service';
import { CobroCreditoService } from '../../service/cobro-credito.service';
import { OperacionesPagoPrestamoService } from '../../service/operaciones-pago-prestamo.service';
import { CobroRegistradoDialogComponent } from './cobro-registrado-dialog.component';
import { ContextoPrestamo, SalidaDialogoPago } from './contexto-prestamo';
import { ReciboOperacionDialogComponent } from './recibo-operacion-dialog.component';
import { RespaldoCobroComponent } from './respaldo-cobro.component';

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
 *
 * La parte del reparto que va en efectivo/transferencia es dinero que entra por fuera del sistema:
 * en cuanto ese renglón tiene valor, el bloque de respaldo (banco, referencia y comprobante
 * digitalizado) pasa a ser obligatorio y su ruta se estampa en los pagos que genere la operación.
 * Un reparto cubierto íntegramente con saldo de aportes no necesita respaldo externo.
 */
@Component({
  selector: 'app-precancelacion-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MaterialFormModule, RespaldoCobroComponent],
  templateUrl: './precancelacion-dialog.component.html',
  styleUrl: './precancelacion-dialog.component.scss',
})
export class PrecancelacionDialogComponent {
  private servicio = inject(OperacionesPagoPrestamoService);
  private comprobantes = inject(ComprobanteCobroService);
  private cobroCreditoService = inject(CobroCreditoService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);

  /** Bloque de respaldo. Se renderiza siempre: recalcular no debe perder el comprobante cargado. */
  respaldo = viewChild(RespaldoCobroComponent);

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

  /**
   * ¿El reparto usa algo de saldo de aportes? Si es 100% efectivo/transferencia, la precancelación
   * pasa por CRD.CBCR y queda pendiente de aprobación en vez de aplicarse en el acto — ver
   * `enviarPrecancelacion`. La plantilla lo usa para no prometer "cancelado" cuando en realidad
   * queda registrado.
   */
  usaAportes = computed(() => {
    this.fondosVersion();
    return this.fondos.some((f) => f.idTipoAporte != null && this.parseMoneda(f.texto) > 0.004);
  });

  /** Lo que se cobra en efectivo/transferencia: la parte que entra por fuera del sistema. */
  montoEfectivo = computed(() => {
    this.fondosVersion();
    const efectivo = this.fondos.find((f) => f.idTipoAporte == null);
    return +this.parseMoneda(efectivo?.texto).toFixed(2);
  });

  requiereRespaldo = computed(() => this.montoEfectivo() > 0.004);

  respaldoListo = computed(() => !this.requiereRespaldo() || (this.respaldo()?.completo() ?? false));

  puedeConfirmar = computed(
    () =>
      this.cuadra() &&
      !this.hayExcesoEnAlgunAporte() &&
      !this.aplicando() &&
      this.total() > 0.004 &&
      this.respaldoListo()
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

  /**
   * Aplica la precancelación. Cuando hay parte en efectivo/transferencia son dos etapas: primero se
   * archiva el comprobante —su ruta viaja DENTRO del request— y recién con el archivo en el
   * servidor se llama al endpoint. Si la subida falla se aborta sin haber tocado plata.
   */
  confirmar(): void {
    if (!this.puedeConfirmar()) return;
    this.errorMensaje.set(null);
    this.errorCodigo.set(null);
    this.aplicando.set(true);

    this.archivarComprobante((ruta, exito) => {
      if (!exito) {
        this.aplicando.set(false);
        return;
      }
      this.enviarPrecancelacion(ruta);
    });
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
          this.errorCodigo.set('COMPROBANTE_NO_ARCHIVADO');
          this.errorMensaje.set(this.comprobantes.mensajeDeFallo(resultado.error ?? ''));
          continuar(null, false);
          return;
        }
        continuar(resultado.ruta, true);
      });
  }

  private enviarPrecancelacion(rutaDocumentoRespaldo: string | null): void {
    const efectivo = this.fondos.find((f) => f.idTipoAporte == null);
    const aportes: DesgloseAporte[] = this.fondos
      .filter((f) => f.idTipoAporte != null && this.parseMoneda(f.texto) > 0.004)
      .map((f) => ({ idTipoAporte: f.idTipoAporte as number, valor: +this.parseMoneda(f.texto).toFixed(2) }));

    const fecha = this.servicio.formatearFecha(this.fechaCorte());

    // 100% efectivo/transferencia: pasa por CRD.CBCR como el resto del cutover
    // (docs/crd/PLAN-CUTOVER-COBROS-POR-CONTABILIDAD.md). Si hay aportes de por medio —débito del
    // propio saldo del socio, mezclado con la parte en efectivo en una sola precancelación— se
    // sigue aplicando en el acto con el endpoint de siempre: `PRECANCELACION` en CBCR es de una
    // sola línea (§2 del contrato) y no tiene forma de representar ese reparto. Es el mismo "caso
    // combinado" que se dejó afuera en cobros-personales — no adivinar cómo modelarlo.
    if (!aportes.length) {
      this.registrarPrecancelacionEnContabilidad(
        +this.parseMoneda(efectivo?.texto).toFixed(2),
        fecha,
        rutaDocumentoRespaldo
      );
      return;
    }

    this.servicio
      .precancelar({
        idPrestamo: this.data.idPrestamo,
        valorEfectivo: +this.parseMoneda(efectivo?.texto).toFixed(2),
        aportes: aportes.length ? aportes : undefined,
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
                ...this.detalleDelRespaldo(rutaDocumentoRespaldo),
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
        // El comprobante ya subido queda huérfano: no lo referencia ningún pago, así que se borra
        // para no dejar basura acumulándose en la carpeta del préstamo con cada reintento.
        this.comprobantes.descartar(rutaDocumentoRespaldo);

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

  /**
   * `PRECANCELACION` 100% en efectivo/transferencia, a través de CRD.CBCR: el cobro queda
   * REGISTRADO, pendiente de aprobación — el préstamo no se cancela todavía.
   */
  private registrarPrecancelacionEnContabilidad(
    valorEfectivo: number,
    fecha: string | null,
    rutaDocumentoRespaldo: string | null
  ): void {
    const respaldo = this.respaldo()?.datos();
    const cuenta = respaldo?.cuenta;

    // Defensivo: `respaldoListo()` ya exige cuenta, referencia y comprobante antes de habilitar el
    // botón cuando hay parte en efectivo — no debería poder llegar acá sin ellos.
    if (!cuenta || !fecha || !rutaDocumentoRespaldo) {
      this.aplicando.set(false);
      this.errorMensaje.set('Faltan datos del respaldo del cobro. Intente nuevamente.');
      this.comprobantes.descartar(rutaDocumentoRespaldo);
      return;
    }

    this.cobroCreditoService
      .registrar({
        idEntidad: this.data.idEntidad ?? 0,
        tipoOperacion: 'PRECANCELACION',
        idCuentaBancaria: cuenta.codigo,
        referencia: respaldo.referencia,
        rutaRespaldo: rutaDocumentoRespaldo,
        valor: valorEfectivo,
        fecha,
        observacion: this.observacion.trim() || null,
        usuario: usuarioSesion(),
        detalles: [{ idPrestamo: this.data.idPrestamo, valor: valorEfectivo }],
      })
      .subscribe((resp) => {
        this.aplicando.set(false);
        if (!resp.exito || !resp.resultado) {
          this.errorCodigo.set(resp.errorCliente ? 'ERROR_CLIENTE' : '');
          this.errorMensaje.set(resp.mensaje ?? 'No se pudo registrar el cobro.');
          this.comprobantes.descartar(rutaDocumentoRespaldo);
          return;
        }

        const registro = resp.resultado;
        this.dialog.open(CobroRegistradoDialogComponent, {
          data: {
            tipoOperacion: 'PRECANCELACION',
            idCobro: registro.idCobro,
            valor: registro.valor,
            contabilidadActiva: registro.contabilidadActiva,
            tituloPrestamo: this.data.titulo,
            participante: this.data.participante ?? undefined,
            fecha,
            referencia: respaldo.referencia,
          },
          width: '640px',
          maxWidth: '96vw',
          autoFocus: false,
        });

        this.dialogRef.close({ accion: 'registrado' });
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
    if (this.requiereRespaldo()) {
      const resumen = this.respaldo()?.resumen();
      if (resumen) partes.push(resumen);
    }
    const texto = partes.join(' · ');
    return texto ? texto.slice(0, 200) : null;
  }

  /** Filas del recibo que dejan constancia de qué comprobante respalda la operación. */
  private detalleDelRespaldo(ruta: string | null): { label: string; valor: string }[] {
    if (!ruta) return [];
    return [
      { label: 'Comprobante adjunto', valor: this.respaldo()?.datos().archivo?.name ?? '—' },
      { label: 'Archivado en', valor: ruta },
    ];
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
