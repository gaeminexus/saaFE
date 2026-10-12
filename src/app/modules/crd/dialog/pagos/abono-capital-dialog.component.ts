import { CommonModule } from '@angular/common';
import { Component, Inject, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { empresaSesionCodigo } from '../../../../shared/services/empresa-sesion';
import { guardarArchivo, mensajeReporteFallido } from '../../../../shared/services/descarga-reporte';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import { ModalidadAbono, NOMBRE_TIPO_AMORTIZACION, TOLERANCIA_MONTO } from '../../model/pagos/catalogos-pago';
import { SaldoAporte, SimulacionAbonoCapital } from '../../model/pagos/operaciones-pago';
import { DesgloseAporte, mensajeDeRespuesta } from '../../model/pagos/respuesta-pago';
import { SolicitudReporteSimulacion } from '../../model/simuladores/reporte-simulacion';
import { ComprobanteCobroService } from '../../service/comprobante-cobro.service';
import { CobroCreditoService } from '../../service/cobro-credito.service';
import { OperacionesPagoPrestamoService } from '../../service/operaciones-pago-prestamo.service';
import { CobroRegistradoDialogComponent } from './cobro-registrado-dialog.component';
import { ContextoPrestamo, SalidaDialogoPago } from './contexto-prestamo';
import { ReciboOperacionDialogComponent } from './recibo-operacion-dialog.component';
import { RespaldoCobroComponent } from './respaldo-cobro.component';

type Paso = 'datos' | 'comparativa';

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
 * Abono a capital en dos pasos obligatorios (§6-§7 y flujo D de la guía): primero se simula, se
 * muestra la comparativa y recién con la confirmación explícita se aplica.
 *
 * El usuario puede cambiar la modalidad y volver a simular sin cerrar el diálogo: ese comparador
 * es justamente lo que necesita para decidir entre "termino antes" y "pago menos por mes".
 *
 * El TOTAL del abono lo escribe el usuario y se reparte entre efectivo/transferencia y saldo de
 * aportes del partícipe (docs/crd/API-ABONO-CAPITAL-CON-APORTES.md); el reparto debe sumar ese total
 * (±0.01). Se simula con el TOTAL. La pregunta "¿entró plata de afuera?" (`requiereRespaldo`) decide
 * dos cosas a la vez:
 *  - con efectivo > 0: bloque de respaldo obligatorio y registro por CRD.CBCR (`ABONO_CAPITAL`),
 *    pendiente de contabilidad. `valor` es SOLO el efectivo; los aportes viajan en `detalles[0].aportes`;
 *  - con efectivo = 0 (100% aportes): sin respaldo, se aplica en el acto con
 *    `POST /prst/abonarCapitalConAportes`.
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
  private cobroCreditoService = inject(CobroCreditoService);
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
  /** Fecha de afectación contable (docs/crd/API-FECHA-AFECTACION-COBRO.md, 2026-10-05), por defecto hoy. */
  fechaAfectacion = signal<Date>(new Date());
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

  cargandoSaldos = signal(false);
  saldos = signal<SaldoAporte[]>([]);

  /** Renglones del reparto; se mutan directamente, por eso el contador de versión. */
  fondos: RenglonFondo[] = [];
  private fondosVersion = signal(0);

  /** Total del abono: el de la simulación que el usuario está viendo; antes de simular, el tecleado. */
  total = computed(() => this.simulacion()?.valorAbono ?? this.valor());

  repartido = computed(() => {
    this.fondosVersion();
    return +this.fondos.reduce((s, f) => s + this.parseMoneda(f.texto), 0).toFixed(2);
  });

  diferencia = computed(() => +(this.total() - this.repartido()).toFixed(2));
  cuadra = computed(() => Math.abs(this.diferencia()) <= TOLERANCIA_MONTO);
  /** Hay algo que corregir: falta o sobra. "Ajustar" también sirve para bajar un fondo pasado. */
  necesitaAjuste = computed(() => Math.abs(this.diferencia()) > TOLERANCIA_MONTO);

  /** Un aporte solo puede usarse hasta su saldo; el efectivo no tiene tope. */
  hayExcesoEnAlgunAporte = computed(() => {
    this.fondosVersion();
    return this.fondos.some(
      (f) => f.idTipoAporte != null && this.parseMoneda(f.texto) > f.disponible + TOLERANCIA_MONTO
    );
  });

  /** Lo que se cobra en efectivo/transferencia: la parte que entra por fuera del sistema. */
  montoEfectivo = computed(() => {
    this.fondosVersion();
    // Sin reparto armado todavía (paso 1) todo el total se asume en efectivo: es el caso de ventanilla.
    if (!this.fondos.length) return this.valor();
    const efectivo = this.fondos.find((f) => f.idTipoAporte == null);
    return +this.parseMoneda(efectivo?.texto).toFixed(2);
  });

  saldoAportesTotal = computed(() => this.saldos().reduce((s, a) => s + Math.max(a.saldo ?? 0, 0), 0));

  /**
   * Doble rol: gatea el bloque de respaldo (comprobante/referencia obligatorios) Y decide el
   * ruteo — con efectivo va por CRD.CBCR pendiente de aprobación; 100% aportes se aplica en el acto
   * por el endpoint directo, porque no hay nada que contabilidad pueda verificar.
   */
  requiereRespaldo = computed(() => this.montoEfectivo() > 0.004);

  /** El respaldo del dinero recibido (banco, referencia y comprobante) está completo, si hace falta. */
  respaldoListo = computed(() => !this.requiereRespaldo() || (this.respaldo()?.completo() ?? false));

  fechaAfectacionValida = computed(() => this.cobroCreditoService.fechaAfectacionValida(this.fechaAfectacion(), this.fecha()));

  /** Aviso del §3.1: la mora que se generó después del pago real se elimina al recalcular. */
  esPagoTardio = computed(() => this.cobroCreditoService.esPagoTardio(this.fecha()));

  puedeAplicar = computed(
    () =>
      !!this.simulacion() &&
      !this.aplicando() &&
      !this.simulando() &&
      this.fechaValida() &&
      this.fechaAfectacionValida() &&
      this.cuadra() &&
      !this.hayExcesoEnAlgunAporte() &&
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
    this.cargarSaldos();
  }

  // ================= saldos de aportes y reparto =================

  /**
   * Trae los saldos de aportes del partícipe (solo los > 0) y reconstruye el reparto conservando lo
   * que el usuario ya escribió: tras un error por saldo se corrige sobre el reparto armado, nunca se
   * vuelve a poner todo en efectivo (quedaría cuadrado y confirmable con un clic).
   */
  private cargarSaldos(): void {
    const idEntidad = this.data.idEntidad;
    if (!idEntidad) return;

    this.cargandoSaldos.set(true);
    this.servicio.saldosPorEntidad(idEntidad).subscribe((resp) => {
      this.cargandoSaldos.set(false);
      // Una lista vacía es 200 con []: el partícipe simplemente no tiene aportes.
      this.saldos.set((resp.exito ? resp.resultado ?? [] : []).filter((a) => (a.saldo ?? 0) > 0.004));
      if (this.fondos.length) this.construirFondos(false);
    });
  }

  /** @param precargarEfectivo true: todo el total en efectivo y aportes en cero (reparto nuevo). */
  private construirFondos(precargarEfectivo: boolean): void {
    const textoPrevio = new Map(this.fondos.map((f) => [f.clave, f.texto]));
    const texto = (clave: string, porDefecto = '') =>
      precargarEfectivo ? porDefecto : textoPrevio.get(clave) ?? porDefecto;

    this.fondos = [
      {
        clave: 'efectivo',
        nombre: 'Efectivo / transferencia',
        idTipoAporte: null,
        disponible: Number.POSITIVE_INFINITY,
        texto: texto('efectivo', this.formatMoneda(this.total())),
      },
      ...this.saldos().map((a) => ({
        clave: `aporte-${a.idTipoAporte}`,
        nombre: a.nombre,
        idTipoAporte: a.idTipoAporte,
        disponible: +(a.saldo ?? 0).toFixed(2),
        texto: texto(`aporte-${a.idTipoAporte}`),
      })),
    ];
    this.fondosVersion.update((v) => v + 1);
  }

  /** Total con el que se armó el reparto vigente; si cambia, el reparto anterior ya no sirve. */
  private totalDelReparto = 0;

  private repartoCambiado(): void {
    this.fondosVersion.update((n) => n + 1);
    this.limpiarError();
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
    const objetivo = this.parseMoneda(fondo.texto) + this.diferencia();
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

  private aportesDelReparto(): DesgloseAporte[] {
    return this.fondos
      .filter((f) => f.idTipoAporte != null && this.parseMoneda(f.texto) > 0.004)
      .map((f) => ({ idTipoAporte: f.idTipoAporte as number, valor: +this.parseMoneda(f.texto).toFixed(2) }));
  }

  nombresTipoAporte(): Record<number, string> {
    const mapa: Record<number, string> = {};
    for (const a of this.saldos()) mapa[a.idTipoAporte] = a.nombre;
    return mapa;
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
        // Reparto nuevo solo si el total cambió: cambiar de modalidad no debe perder lo repartido.
        if (!this.fondos.length || Math.abs(this.totalDelReparto - resp.resultado.valorAbono) > TOLERANCIA_MONTO) {
          this.totalDelReparto = resp.resultado.valorAbono;
          this.construirFondos(true);
        }
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

  /**
   * Ruteo según haya o no efectivo (docs/crd/API-ABONO-CAPITAL-CON-APORTES.md §0):
   *  - efectivo > 0 → CRD.CBCR `ABONO_CAPITAL`, REGISTRADO y pendiente de aprobación de contabilidad
   *    (la tabla de amortización NO se regenera hasta que se procese). ⛔ `valor` de la cabecera y de
   *    la línea es SOLO el efectivo, nunca el total; los aportes viajan en `detalles[0].aportes`;
   *  - efectivo = 0 → 100% aportes: se aplica en el acto con `POST /prst/abonarCapitalConAportes`.
   */
  private enviarAbono(sim: SimulacionAbonoCapital, rutaDocumentoRespaldo: string | null): void {
    const fecha = this.servicio.formatearFecha(this.fecha());
    const fechaAfectacion = this.servicio.formatearFecha(this.fechaAfectacion());
    const efectivo = this.montoEfectivo();
    const aportes = this.aportesDelReparto();

    if (efectivo > 0.004) {
      this.registrarEnContabilidad(sim, efectivo, aportes, fecha, fechaAfectacion, rutaDocumentoRespaldo);
    } else {
      this.aplicarConAportes(sim, aportes, fecha, fechaAfectacion);
    }
  }

  private registrarEnContabilidad(
    sim: SimulacionAbonoCapital,
    efectivo: number,
    aportes: DesgloseAporte[],
    fecha: string | null,
    fechaAfectacion: string | null,
    rutaDocumentoRespaldo: string | null
  ): void {
    const respaldo = this.respaldo()?.datos();
    const cuenta = respaldo?.cuenta;

    // Defensivo: `respaldoListo()` ya exige cuenta, referencia y comprobante antes de habilitar el
    // botón cuando hay efectivo — no debería poder llegar acá sin ellos.
    if (!cuenta || !fecha || !fechaAfectacion || !rutaDocumentoRespaldo) {
      this.aplicando.set(false);
      this.errorMensaje.set('Faltan datos del respaldo del cobro. Intente nuevamente.');
      this.comprobantes.descartar(rutaDocumentoRespaldo);
      return;
    }

    this.cobroCreditoService
      .registrar({
        idEntidad: this.data.idEntidad ?? 0,
        tipoOperacion: 'ABONO_CAPITAL',
        idCuentaBancaria: cuenta.codigo,
        referencia: respaldo.referencia,
        rutaRespaldo: rutaDocumentoRespaldo,
        valor: efectivo,
        fecha,
        fechaAfectacion,
        observacion: this.observacion.trim() || null,
        usuario: usuarioSesion(),
        // La modalidad sale del resultado de la simulación, nunca del signal: es lo que el usuario acaba de ver.
        detalles: [
          {
            idPrestamo: this.data.idPrestamo,
            valor: efectivo,
            modalidad: sim.modalidad,
            aportes: aportes.length ? aportes : undefined,
          },
        ],
      })
      .subscribe((resp) => {
        this.aplicando.set(false);
        if (!resp.exito || !resp.resultado) {
          this.errorCodigo.set(resp.errorCliente ? 'ERROR_CLIENTE' : '');
          this.errorMensaje.set(resp.mensaje ?? 'No se pudo registrar el cobro.');
          // El comprobante ya subido queda huérfano: no lo referencia ningún cobro, así que se borra
          // para no dejar basura acumulándose en la carpeta del préstamo con cada reintento.
          this.comprobantes.descartar(rutaDocumentoRespaldo);
          return;
        }

        const registro = resp.resultado;
        this.dialog.open(CobroRegistradoDialogComponent, {
          data: {
            tipoOperacion: 'ABONO_CAPITAL',
            idCobro: registro.idCobro,
            // `registro.valor` es SOLO el efectivo: con aportes, el abono total es mayor.
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

  /** 100% aportes: sin depósito no hay nada que contabilidad pueda verificar, se aplica en el acto. */
  private aplicarConAportes(
    sim: SimulacionAbonoCapital,
    aportes: DesgloseAporte[],
    fecha: string | null,
    fechaAfectacion: string | null
  ): void {
    const idEmpresa = empresaSesionCodigo();
    if (idEmpresa == null) {
      this.aplicando.set(false);
      this.errorMensaje.set('No se pudo determinar la empresa de la sesión. Vuelva a iniciar sesión y reintente.');
      return;
    }
    if (!fecha || !fechaAfectacion || !aportes.length) {
      this.aplicando.set(false);
      this.errorMensaje.set('Faltan datos del abono. Revise las fechas y el reparto.');
      return;
    }

    this.servicio
      .abonarCapitalConAportes({
        idEmpresa,
        idPrestamo: this.data.idPrestamo,
        modalidad: sim.modalidad,
        aportes,
        usuario: usuarioSesion(),
        observacion: this.observacion.trim() || null,
        fecha,
        fechaAfectacion,
        rutaDocumentoRespaldo: null,
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
              movimientosAporte: resp.movimientosAporte,
              nombresTipoAporte: this.nombresTipoAporte(),
            },
            width: '760px',
            maxWidth: '95vw',
            autoFocus: false,
          });
          this.dialogRef.close({ accion: 'aplicado', recargarTabla: true, abono: resultado });
          return;
        }

        // PRESTAMO_NO_AL_DIA → 'ir-a-pagar' y ABONO_CUBRE_CAPITAL → 'ir-a-precancelar' los ofrece
        // la plantilla según `errorCodigo`, igual que con los errores de la simulación.
        this.errorCodigo.set(String(resp.error ?? ''));
        this.errorMensaje.set(mensajeDeRespuesta(resp));

        // El saldo pudo cambiar por otra operación: se refrescan los disponibles y se conserva el reparto.
        if (resp.error === 'SALDO_APORTES_INSUFICIENTE' || resp.error === 'TIPO_APORTE_NO_VIGENTE') {
          this.cargarSaldos();
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
