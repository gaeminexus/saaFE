import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { guardarArchivo, mensajeReporteFallido } from '../../../../../../../shared/services/descarga-reporte';
import { empresaSesionCodigo } from '../../../../../../../shared/services/empresa-sesion';
import { ExportService } from '../../../../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../../../../shared/services/funciones-datos.service';
import { JasperReportesService } from '../../../../../../../shared/services/jasper-reportes.service';
import { usuarioSesion } from '../../../../../../../shared/services/usuario-sesion';
import {
  CorridaJubiladosMes,
  DetallePagoPension,
  DetallePrevisualizacionPago,
  Participacion,
  ResultadoGeneracionPagos,
  ResultadoPrevisualizacionCorrida,
  SolicitudProcesoJubilados,
} from '../../../../../model/pago-pension-complementaria';
import { PagoPensionComplementariaService } from '../../../../../service/pago-pension-complementaria.service';
import {
  ConfirmarGeneracionData,
  ConfirmarGeneracionDialogComponent,
} from './confirmar-generacion-dialog.component';

const MESES = [
  { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' }, { valor: 3, nombre: 'Marzo' },
  { valor: 4, nombre: 'Abril' }, { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
  { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' }, { valor: 9, nombre: 'Septiembre' },
  { valor: 10, nombre: 'Octubre' }, { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' },
];

/**
 * Cuál de las tarjetas de totales está filtrando la tabla. Son las siete tarjetas de la pestaña:
 * las cuatro del eje DESTINO (préstamos / dinero / seguro médico a proveedor / total) y las tres
 * del eje CONCEPTO CONTABLE (pensión / seguro / total). Las dos «Total» filtran igual porque son
 * el mismo número.
 *
 * ⚠️ Decisión del usuario, 2026-09-05: el seguro médico NUNCA fue plata del jubilado. Siempre se
 * descuenta del aporte y siempre sale en una orden aparte a un proveedor (nunca al banco del
 * jubilado) — el certificado bancario no gobierna nada del seguro, solo si la PENSIÓN sale al
 * banco del jubilado. `SEGURO_INTERNO` filtra por ese pago al proveedor. ⛔ Sigue usando el campo
 * `montoSeguroInterno`/`totalSeguroInternoGeneral` sin renombrar: pendiente de que el backend
 * proponga el nombre nuevo (avisa el árbitro antes de aplicarlo).
 */
export type FiltroTotal = 'PRESTAMOS' | 'DINERO' | 'SEGURO_INTERNO' | 'TOTAL' | 'PENSION' | 'SEGURO';

/** Medio centavo: por debajo de esto, en pantalla el monto ya figura como $0,00. */
const TOLERANCIA_MONTO = 0.005;

/**
 * Pestaña B — «Corrida del mes». Contrato: docs/crd/API-PAGO-PENSION-COMPLEMENTARIA.md §4bis/§6.
 * Diseño: docs/crd/DISENO-PANTALLA-PAGO-JUBILADOS.md §3/§3bis. Patrón copiado de `cierre-cartera`
 * (botón «Previsualizar» separado de «Ejecutar», sin auto-cargar al entrar a la pestaña).
 *
 * El prevuelo YA NO se calcula en el cliente: viene de `POST /pgpc/previsualizarCorrida`, que
 * simula `generarPagosDelMes` con la misma regla del tope (por préstamo, cuotas exigibles) que
 * vive en el backend. Calcularlo acá habría significado cientos de consultas para ~187 jubilados
 * y reimplementar esa regla en TypeScript — dos copias que se desincronizan, y un prevuelo que
 * miente es peor que no tenerlo (§4bis del contrato).
 *
 * ⛔ Estado de participación (§6, decisión del usuario 2026-09-04, reemplaza el bloqueo total de
 * `b631193`): el certificado gobierna la SALIDA de dinero, no el cruce contra el préstamo. El
 * backend manda el campo explícito `participacion` — no se deduce cruzando `tieneCertificado` /
 * `montoADinero` / `montoACruzar`, porque eso se rompe la primera vez que cambie una regla:
 * - `COMPLETA`: nada quedó retenido — entra y suma a los dos totales.
 * - `SOLO_CRUCE`: hubo remanente que no pudo salir (sin certificado/cuenta): entra, cancela deuda,
 *   NO suma a "Total a dinero". Es ACCIONABLE — mismo criterio visual que una "Desviación", nunca
 *   un bloqueo.
 * - `BLOQUEADO`: no participa, con su motivo.
 * - `null`: no es un evento de participación de esta corrida (ya pagado, al día, retroactivo con
 *   0 meses).
 */
@Component({
  selector: 'app-corrida-mes-pago-jubilados',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule,
  ],
  templateUrl: './corrida-mes-pago-jubilados.component.html',
  styleUrl: './corrida-mes-pago-jubilados.component.scss',
})
export class CorridaMesPagoJubiladosComponent implements OnInit {
  readonly MESES = MESES;

  private pgpcService = inject(PagoPensionComplementariaService);
  private exportService = inject(ExportService);
  private jasperReportes = inject(JasperReportesService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // Contexto de sesión
  idEmpresa: number | null = null;
  private usuario = 'SYSTEM';

  // Selección de período — por defecto, el mes calendario anterior al actual (el caso de uso
  // real: procesar agosto durante septiembre).
  anio: number;
  mes: number;

  previsualizando = signal(false);

  prevuelo = signal<ResultadoPrevisualizacionCorrida | null>(null);
  errorPrevuelo = signal<string | null>(null);
  /** El texto EXACTO que manda el backend sobre por qué el cruce es estimado — no se reescribe acá. */
  mensajePrevuelo = signal<string | null>(null);

  resultado = signal<ResultadoGeneracionPagos | null>(null);
  mensajeResultado = signal<string | null>(null);
  errorEjecucion = signal<string | null>(null);

  // ===================== Los dos procesos mensuales =====================
  // docs/crd/API-DOS-PROCESOS-MENSUALES-JUBILADOS.md. Reemplaza el botón único "Ejecutar corrida":
  // ahora hay dos tarjetas (seguro médico al inicio de mes, pensiones al final), cada una con su
  // propio estado, y la de pensiones depende de que la de seguro ya esté generada (D2).

  corrida = signal<CorridaJubiladosMes | null>(null);
  cargandoCorrida = signal(false);
  errorCorrida = signal<string | null>(null);

  generandoSeguro = signal(false);
  errorSeguro = signal<string | null>(null);

  generandoPensiones = signal(false);

  // Reporte Jasper de la corrida (RPRT_PGPC_CRRD) — trae de la base la corrida COMPLETA del
  // período, no lo que esté filtrado en pantalla. Independiente del prevuelo: no requiere haber
  // previsualizado ni ejecutado en esta sesión, solo el período y el contexto de sesión.
  generandoReporte = signal(false);
  errorReporte = signal<string | null>(null);

  // ===================== Filtros del prevuelo =====================
  // Con ~180 jubilados la tabla no se puede leer entera. Dos filtros que se COMBINAN (se
  // aplican uno sobre el otro, no se pisan): texto libre y tarjeta de total.

  /** Texto libre: nombre o número de entidad. */
  filtroTexto = signal('');

  /**
   * Tarjeta de total seleccionada, o `null` si no hay ninguna. Al hacer clic en una tarjeta la
   * tabla se reduce a los jubilados que COMPONEN ese total — que es la pregunta real cuando un
   * número no cuadra: «¿quiénes están metidos acá adentro?».
   */
  filtroTarjeta = signal<FiltroTotal | null>(null);

  constructor() {
    const hoy = new Date();
    if (hoy.getMonth() === 0) {
      this.anio = hoy.getFullYear() - 1;
      this.mes = 12;
    } else {
      this.anio = hoy.getFullYear();
      this.mes = hoy.getMonth(); // getMonth() es 0-based → mes calendario anterior en 1-based
    }
  }

  ngOnInit(): void {
    this.idEmpresa = empresaSesionCodigo();
    this.usuario = usuarioSesion();
    if (this.idEmpresa == null) {
      this.errorPrevuelo.set('No se pudo determinar la empresa de la sesión. Vuelva a iniciar sesión y reintente.');
    }
    // Sin auto-cargar el prevuelo: igual que `cierre-cartera`, previsualizar es una acción
    // explícita del operador (el cálculo real recorre ~187 jubilados en el servidor, no es
    // gratis). El estado de los DOS PROCESOS sí se carga solo: es una simple lectura de cabecera
    // (§4.3), no un cálculo pesado, y es lo primero que hay que ver al entrar a un período.
    this.cargarCorrida();
  }

  get periodoTexto(): string {
    return `${this.nombreMes(this.mes)} ${this.anio}`;
  }

  ocupado(): boolean {
    return this.previsualizando() || this.generandoSeguro() || this.generandoPensiones();
  }

  private idUsuarioSesion(): number {
    return +(sessionStorage.getItem('idUsuario') || localStorage.getItem('idUsuario') || '0');
  }

  /** Selector de año/mes cambiado: la cabecera de corrida es de OTRO período, hay que releerla. */
  onPeriodoCambiado(): void {
    this.cargarCorrida();
  }

  // ===================== Los dos procesos mensuales =====================

  cargarCorrida(): void {
    if (this.idEmpresa == null) {
      return;
    }
    this.cargandoCorrida.set(true);
    this.errorCorrida.set(null);
    this.pgpcService.corrida(this.anio, this.mes, this.idEmpresa).subscribe((resp) => {
      this.cargandoCorrida.set(false);
      // `null` = falló la consulta. Un período sin correr todavía NO es `null`: llega como
      // objeto con los dos procesos en estado 0 (§4.3) — son mensajes distintos.
      if (resp === null) {
        this.corrida.set(null);
        this.errorCorrida.set('No se pudo cargar el estado de los procesos de este mes. Intente de nuevo.');
        return;
      }
      this.corrida.set(resp);
    });
  }

  private solicitudProceso(): SolicitudProcesoJubilados {
    return {
      idEmpresa: this.idEmpresa ?? 0,
      anio: this.anio,
      mes: this.mes,
      usuario: this.usuario,
      idUsuario: this.idUsuarioSesion(),
    };
  }

  confirmarGenerarSeguro(): void {
    const c = this.corrida();
    if (!c?.puedeGenerarSeguro || this.generandoSeguro() || this.idEmpresa == null) {
      return;
    }

    const data: ConfirmarGeneracionData = {
      icono: 'medical_services',
      titulo: 'Confirmar generación del seguro médico',
      periodo: this.periodoTexto,
      advertencia:
        'Se va a generar UNA orden de pago agregada al proveedor del seguro médico, por el total ' +
        'de todos los jubilados del padrón vigente. El valor queda fijo: la corrida de pensiones ' +
        'de fin de mes lo va a descontar tal cual, sin recalcular.',
      desglose: [],
      textoBoton: 'Generar seguro médico',
    };

    this.dialog
      .open(ConfirmarGeneracionDialogComponent, { data, width: '520px' })
      .afterClosed()
      .subscribe((confirmado) => {
        if (confirmado) {
          this.generarSeguroConfirmado();
        }
      });
  }

  private generarSeguroConfirmado(): void {
    this.errorSeguro.set(null);
    this.generandoSeguro.set(true);

    this.pgpcService.generarSeguro(this.solicitudProceso()).subscribe((resp) => {
      this.generandoSeguro.set(false);
      if (resp.exito) {
        this.notificar(resp.mensaje || 'Seguro médico generado.', true);
        // La fuente de verdad de "qué pasó" es la cabecera de corrida, no el cuerpo de esta
        // respuesta (§4.3) — se relee para que las dos tarjetas queden al día de una sola vez.
        this.cargarCorrida();
      } else {
        this.errorSeguro.set(resp.mensaje ?? 'No se pudo generar el seguro médico.');
        this.notificar(resp.mensaje ?? 'No se pudo generar el seguro médico.', false);
      }
    });
  }

  confirmarGenerarPensiones(): void {
    const c = this.corrida();
    if (!c?.puedeGenerarPensiones || this.generandoPensiones() || this.idEmpresa == null) {
      return;
    }

    const data: ConfirmarGeneracionData = {
      titulo: 'Confirmar generación de pensiones',
      periodo: this.periodoTexto,
      advertencia:
        'Se van a generar las órdenes de pensión del período, descontando exactamente el seguro ' +
        'médico ya pagado a cada jubilado. Esta acción genera asientos contables y órdenes en ' +
        'tesorería.',
      desglose: [],
      textoBoton: 'Generar pensiones',
    };

    this.dialog
      .open(ConfirmarGeneracionDialogComponent, { data, width: '520px' })
      .afterClosed()
      .subscribe((confirmado) => {
        if (confirmado) {
          this.generarPensionesConfirmado();
        }
      });
  }

  private generarPensionesConfirmado(): void {
    this.resultado.set(null);
    this.mensajeResultado.set(null);
    this.errorEjecucion.set(null);
    this.generandoPensiones.set(true);

    this.pgpcService.generarPensiones(this.solicitudProceso()).subscribe((resp) => {
      this.generandoPensiones.set(false);
      // ⛔ Un 200 no significa que salió bien: hay que leer resp.exito y, adentro, conError/errores.
      if (resp.exito && resp.resultado) {
        this.resultado.set(resp.resultado);
        this.mensajeResultado.set(resp.mensaje ?? null);
        const conError = resp.resultado.conError ?? 0;
        this.notificar(
          conError > 0
            ? `Pensiones generadas con ${conError} error(es). Revise el detalle.`
            : 'Pensiones generadas correctamente.',
          conError === 0,
        );
        this.cargarCorrida();
      } else {
        this.errorEjecucion.set(resp.mensaje ?? 'No se pudo generar las pensiones.');
        this.notificar(resp.mensaje ?? 'No se pudo generar las pensiones.', false);
      }
    });
  }

  // ===================== Derivados del prevuelo =====================

  get detalle(): DetallePrevisualizacionPago[] {
    return this.prevuelo()?.detalle ?? [];
  }

  get filasCompletas(): DetallePrevisualizacionPago[] {
    return this.detalle.filter((d) => d.participacion === 'COMPLETA');
  }

  get filasSoloCruce(): DetallePrevisualizacionPago[] {
    return this.detalle.filter((d) => d.participacion === 'SOLO_CRUCE');
  }

  get filasBloqueadas(): DetallePrevisualizacionPago[] {
    return this.detalle.filter((d) => d.participacion === 'BLOQUEADO');
  }

  /** Ya pagado este período, al día, o retroactivo sin meses adeudados: no es un bloqueo. */
  get filasSinNovedad(): DetallePrevisualizacionPago[] {
    return this.detalle.filter((d) => d.participacion == null);
  }

  /** Lo que de verdad va a hacer algo si se ejecuta ahora: COMPLETA + SOLO_CRUCE. */
  get cantidadAccionable(): number {
    return this.filasCompletas.length + this.filasSoloCruce.length;
  }

  /**
   * Pensión acumulada = Total − Seguro. No se resta contra `valorPagar`: `totalGeneral` ya es la
   * suma de `total` por jubilado, que el backend garantiza `=== totalPension + totalSeguro`
   * exacto (§4bis). Es una resta de agregados ya calculados, no una segunda fuente de verdad.
   */
  get totalPensionGeneral(): number {
    const res = this.prevuelo();
    if (!res) return 0;
    return res.totalGeneral - res.totalSeguroGeneral;
  }

  // ===================== Filtrado del prevuelo =====================

  /**
   * Lo que se pinta en la tabla y lo que se exporta a CSV. Los dos filtros se combinan: primero
   * la tarjeta (quién compone ese total), después el texto (cuál de ellos).
   */
  get detalleFiltrado(): DetallePrevisualizacionPago[] {
    const tarjeta = this.filtroTarjeta();
    const texto = this.filtroTexto().trim().toLowerCase();
    let filas = this.detalle;
    if (tarjeta) {
      filas = filas.filter((d) => this.aportaA(d, tarjeta));
    }
    if (texto) {
      filas = filas.filter(
        (d) => (d.nombre ?? '').toLowerCase().includes(texto) || String(d.idEntidad).includes(texto),
      );
    }
    return filas;
  }

  hayFiltro(): boolean {
    return this.filtroTarjeta() !== null || this.filtroTexto().trim() !== '';
  }

  limpiarFiltros(): void {
    this.filtroTarjeta.set(null);
    this.filtroTexto.set('');
  }

  /** Segundo clic en la tarjeta ya activa = quitar el filtro. */
  alternarTarjeta(filtro: FiltroTotal): void {
    this.filtroTarjeta.set(this.filtroTarjeta() === filtro ? null : filtro);
  }

  etiquetaTarjeta(filtro: FiltroTotal | null): string {
    switch (filtro) {
      case 'PRESTAMOS':
        return 'A préstamos';
      case 'DINERO':
        return 'A dinero';
      case 'TOTAL':
        return 'Total';
      case 'SEGURO_INTERNO':
        return 'Seguro médico (a proveedor)';
      case 'PENSION':
        return 'Pensión';
      case 'SEGURO':
        return 'Seguro médico';
      default:
        return '';
    }
  }

  /**
   * Si un jubilado aporta o no a un total. `> TOLERANCIA_MONTO` y no `> 0` a propósito: los
   * montos son dobles que vienen de multiplicaciones y restas en el backend, y un residuo de
   * 0,0000001 metería en la lista a alguien que en pantalla figura en $0,00 — el filtro tiene
   * que coincidir con lo que el operador VE, redondeado a centavos.
   *
   * Ojo con «Total»: la tarjeta rotula «{{ evaluados }} evaluado(s)», que son todos, pero el
   * monto suma solo a los aptos. Al filtrar se muestran los que APORTAN al monto, no los 180
   * evaluados — si no, el filtro contradiría el número que lo acompaña.
   */
  private aportaA(d: DetallePrevisualizacionPago, filtro: FiltroTotal): boolean {
    switch (filtro) {
      case 'PRESTAMOS':
        return (d.montoACruzar ?? 0) > TOLERANCIA_MONTO;
      case 'DINERO':
        return (d.montoADinero ?? 0) > TOLERANCIA_MONTO;
      case 'SEGURO_INTERNO':
        return (d.montoSeguroInterno ?? 0) > TOLERANCIA_MONTO;
      case 'TOTAL':
        return (d.total ?? 0) > TOLERANCIA_MONTO;
      case 'PENSION':
        return (d.totalPension ?? 0) > TOLERANCIA_MONTO;
      case 'SEGURO':
        return (d.totalSeguro ?? 0) > TOLERANCIA_MONTO;
      default:
        return true;
    }
  }

  // ===================== Previsualizar =====================

  previsualizar(): void {
    if (this.ocupado() || this.idEmpresa == null) {
      return;
    }
    this.errorPrevuelo.set(null);
    this.previsualizando.set(true);
    // Un prevuelo nuevo llega con otra población: si quedara el filtro del anterior, la tabla
    // podría aparecer vacía sin que se entienda por qué.
    this.limpiarFiltros();

    this.pgpcService.previsualizarCorrida(this.idEmpresa, this.anio, this.mes, this.usuario).subscribe((resp) => {
      this.previsualizando.set(false);
      if (resp.exito && resp.resultado) {
        this.prevuelo.set(resp.resultado);
        this.mensajePrevuelo.set(resp.mensaje ?? null);
      } else {
        this.prevuelo.set(null);
        this.mensajePrevuelo.set(null);
        this.errorPrevuelo.set(resp.mensaje ?? 'No se pudo previsualizar la corrida.');
      }
    });
  }

  // ===================== Derivados del resultado ejecutado =====================

  /**
   * ⛔ Preferir el campo explícito `participacion` (§6) sobre la inferencia vieja
   * (`generoOrdenPago === false && valorCruzadoAPrestamo > 0`): un backend que todavía no mande
   * `participacion` sigue funcionando con la inferencia como respaldo.
   */
  esDesviacion(d: DetallePagoPension): boolean {
    if (d.participacion) {
      return d.participacion === 'SOLO_CRUCE';
    }
    return d.generoOrdenPago === false && (d.valorCruzadoAPrestamo ?? 0) > 0;
  }

  esError(d: DetallePagoPension): boolean {
    return d.estado === 'ERROR';
  }

  claseEstadoDetalle(d: DetallePagoPension): string {
    if (this.esError(d)) return 'badge-error';
    if (this.esDesviacion(d)) return 'badge-desviacion';
    // `SIN_ANCLA` y `AL_DIA` son finales normales del retroactivo, no errores: mismo badge neutro
    // que `YA_EXISTIA`, para que el operador no los lea como "se rompió".
    if (d.estado === 'YA_EXISTIA' || d.estado === 'SIN_ANCLA' || d.estado === 'AL_DIA') return 'badge-ya-existia';
    return 'badge-generado';
  }

  /** Texto legible del `estado` — `SIN_ANCLA`/`AL_DIA` sin traducir se leen como jerga técnica. */
  textoEstadoDetalle(d: DetallePagoPension): string {
    switch (d.estado) {
      case 'SIN_ANCLA':
        return 'Sin ancla';
      case 'AL_DIA':
        return 'Al día';
      default:
        return d.estado;
    }
  }

  // ===================== Presentación de `participacion` (prevuelo) =====================

  claseParticipacion(p: Participacion | null | undefined): string {
    switch (p) {
      case 'COMPLETA':
        return 'badge-listo';
      case 'SOLO_CRUCE':
        return 'badge-desviacion';
      case 'BLOQUEADO':
        return 'badge-bloqueado';
      case 'AL_DIA':
        return 'badge-ya-existia';
      default:
        return 'badge-ya-existia';
    }
  }

  /**
   * ⚠️ `SOLO_CRUCE` se muestra como «Parcial» (§6, 2026-09-05): el literal del contrato NO
   * cambia, solo la etiqueta. Desde §4ter el valor ya no implica que hubo cruce contra préstamo
   * necesariamente — puede ser un jubilado sin préstamo que solo traspasó su seguro y retuvo la
   * pensión. «Parcial» describe ambos casos sin mentir; «Solo cruce» ya no.
   */
  textoParticipacion(p: Participacion | null | undefined): string {
    switch (p) {
      case 'COMPLETA':
        return 'Completa';
      case 'SOLO_CRUCE':
        return 'Parcial';
      case 'BLOQUEADO':
        return 'Bloqueado';
      case 'AL_DIA':
        return 'Al día';
      default:
        return 'Sin novedad';
    }
  }

  private notificar(mensaje: string, exito: boolean): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: exito ? 5000 : 9000,
      panelClass: [exito ? 'success-snackbar' : 'error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  nombreMes(mes: number): string {
    return MESES.find((m) => m.valor === mes)?.nombre ?? String(mes);
  }

  /** `LocalDateTime` del proceso (§4.3) — ISO local sin zona, nunca tratarla como si trajera offset. */
  formatFechaHoraProceso(fecha: unknown): string {
    if (!fecha) return '—';
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.FECHA_HORA) || '—';
  }

  // ===================== Reporte Jasper de la corrida =====================
  // Distinto del CSV a propósito: el CSV exporta lo que se ve en pantalla (con los filtros
  // puestos, si hay); este reporte va a la base y trae la corrida COMPLETA del período — no
  // depende de haber previsualizado ni ejecutado en esta sesión ni de ningún filtro activo.
  //
  // ⛔ Todavía no va a funcionar hasta que el usuario compile el .jasper en Jaspersoft Studio
  // (el .jrxml ya está en saaBE, commit f313e2b) — por eso el manejo de error es explícito y
  // legible (`mensajeReporteFallido`, que lee el `mensaje` real del cuerpo del error) en vez de
  // un spinner colgado o un mensaje genérico: el operador tiene que entender que falta un paso
  // de despliegue, no que la pantalla está rota.
  generarReporte(): void {
    if (this.idEmpresa == null || this.generandoReporte()) {
      return;
    }
    this.errorReporte.set(null);
    this.generandoReporte.set(true);

    const parametros = {
      P_ANIO: this.anio,
      P_MES: this.mes,
      P_IDEMPRESA: this.idEmpresa,
      P_USUARIO: this.usuario,
    };

    this.jasperReportes.generar('crd', 'RPRT_PGPC_CRRD', parametros, 'PDF').subscribe({
      next: (blob) => {
        this.generandoReporte.set(false);
        guardarArchivo(blob, `corrida-jubilados-${this.periodoArchivo()}.pdf`);
      },
      error: (err) => {
        this.generandoReporte.set(false);
        mensajeReporteFallido(err).then((mensaje) => this.errorReporte.set(mensaje));
      },
    });
  }

  // ===================== Exportar CSV =====================
  // Ninguno de los dos exports trae fechas-arreglo del backend: ni `DetallePrevisualizacionPago`
  // ni `DetallePagoPension` tienen campo de fecha — esas viven solo en `PagoPensionComplementaria`,
  // que usa la pestaña «Seguimiento», no esta. Los importes van con `ExportService.exportToCSV`,
  // que ya usa punto decimal sin separador de miles (`toFixed(2)`) — mismo patrón que el módulo.

  private periodoArchivo(): string {
    return `${this.anio}-${String(this.mes).padStart(2, '0')}`;
  }

  exportarPrevueloCSV(): void {
    // Exporta lo que se ve, filtros incluidos — es lo que promete el tooltip del botón. Por eso
    // el archivo lleva el sufijo «-filtrado» cuando hay algún filtro puesto: un CSV parcial con
    // nombre de completo es el tipo de cosa con la que después alguien concilia mal.
    const detalle = this.detalleFiltrado;
    if (detalle.length === 0) {
      return;
    }
    const sufijo = this.hayFiltro() ? '-filtrado' : '';
    const filas = detalle.map((d) => ({
      idEntidad: d.idEntidad,
      nombre: d.nombre ?? '',
      mesesAdeudados: d.mesesAdeudados,
      montoACruzar: d.montoACruzar,
      montoADinero: d.montoADinero,
      montoSeguroInterno: d.montoSeguroInterno,
      total: d.total,
      totalPension: d.totalPension,
      totalSeguro: d.totalSeguro,
      participacion: this.textoParticipacion(d.participacion),
      motivoBloqueo: d.motivoBloqueo ?? '',
    }));
    this.exportService.exportToCSV(
      filas,
      `corrida-jubilados-prevuelo-${this.periodoArchivo()}${sufijo}`,
      ['Entidad', 'Nombre', 'Meses adeudados', 'Monto a cruzar', 'Monto a dinero', 'Seguro a traspaso interno', 'Total', 'Pensión', 'Seguro médico', 'Participación', 'Motivo bloqueo'],
      ['idEntidad', 'nombre', 'mesesAdeudados', 'montoACruzar', 'montoADinero', 'montoSeguroInterno', 'total', 'totalPension', 'totalSeguro', 'participacion', 'motivoBloqueo'],
    );
  }

  exportarResultadoCSV(): void {
    const res = this.resultado();
    if (!res || res.detalle.length === 0) {
      return;
    }
    const filas = res.detalle.map((d) => ({
      idEntidad: d.idEntidad,
      nombre: d.nombre ?? '',
      valorPension: d.valorPension ?? '',
      valorSeguroSalud: d.valorSeguroSalud ?? '',
      totalPension: d.totalPension ?? '',
      totalSeguro: d.totalSeguro ?? '',
      valorSeguroInterno: d.valorSeguroInterno ?? '',
      valorCruzadoAPrestamo: d.valorCruzadoAPrestamo ?? '',
      valorOrdenPago: d.valorOrdenPago ?? '',
      estado: this.esDesviacion(d) ? 'Desviación' : this.textoEstadoDetalle(d),
      mensaje: d.mensaje || (this.esDesviacion(d) ? 'Cruzado íntegro contra préstamo: no generó orden de pago.' : ''),
    }));
    this.exportService.exportToCSV(
      filas,
      `corrida-jubilados-resultado-${this.periodoArchivo()}`,
      ['Entidad', 'Nombre', 'Pensión', 'Seguro', 'Pensión acumulada', 'Seguro acumulado', 'Seguro a traspaso interno', 'Cruzado a préstamo', 'Orden de pago', 'Estado', 'Mensaje'],
      ['idEntidad', 'nombre', 'valorPension', 'valorSeguroSalud', 'totalPension', 'totalSeguro', 'valorSeguroInterno', 'valorCruzadoAPrestamo', 'valorOrdenPago', 'estado', 'mensaje'],
    );
  }

  money(n: number | null | undefined): string {
    return (n ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  trackEntidad(_: number, d: DetallePrevisualizacionPago): number {
    return d.idEntidad;
  }

  trackDetalle(_: number, d: DetallePagoPension): number {
    return d.idPago ?? d.idEntidad;
  }
}
