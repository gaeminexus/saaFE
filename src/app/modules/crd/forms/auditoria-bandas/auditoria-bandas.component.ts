import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { ExportService } from '../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';

import {
  BandaFiltroDistribucion,
  CONCEPTOS_DISTRIBUCION,
  ConceptoDistribucion,
  CuadreDistribucionBandas,
  DetalleJerarquico,
  ErrorAuditoriaBandas,
  FilaDistribucionBanda,
  FiltroDetalleDistribucion,
  NOMBRE_CONCEPTO_DISTRIBUCION,
  NOMBRE_ORIGEN_DISTRIBUCION,
  OrigenDistribucion,
  OrigenListado,
  RespuestaDetalleDistribucion,
  TIPO_CARTERA_BANDA,
} from '../../model/auditoria-bandas';
import { AuditoriaBandasService } from '../../service/auditoria-bandas.service';

const TAMANIOS_PAGINA = [25, 50, 100];

/**
 * Auditoría de distribución en bandas (`docs/crd/API-AUDITORIA-BANDAS.md`). Pantalla de solo
 * lectura para contabilidad: revisa por qué se mandaron ciertos saldos a ciertas cuentas.
 *
 * Cuatro reglas del contrato que esta pantalla respeta a propósito:
 * 1. El cuadre se pinta primero, arriba, y la diferencia distinta de cero se resalta en rojo —
 *    nunca en un total al pie (fue el defecto que costó una jornada entera encontrar).
 * 2. El detalle se agrupa por CONCEPTO, no por cuenta contable — la mora y el interés ordinario
 *    van a la misma cuenta y se fusionarían si se agrupara por cuenta.
 * 3. `contabilidadConectada: false` no es un error: oculta las columnas de cuenta/asiento y
 *    muestra todo el resto igual (escenario de venta separada del sistema contable).
 * 4. Los errores de `AuditoriaBandasService` NUNCA se muestran como "sin datos" — el servicio no
 *    usa el `handleError` compartido justamente para que un fallo real se vea como fallo.
 *
 * Dos vistas sobre los mismos datos (decisión del usuario 2026-09-02, § "Las DOS vistas"), no una
 * en lugar de la otra: RESUMEN (jerárquica, concepto → cuenta+banda, abre por defecto) y DETALLE
 * (la tabla plana con paginación). Los mismos filtros alimentan a las dos. Abrir un renglón del
 * resumen salta a Detalle con ese filtro ya aplicado.
 */
@Component({
  selector: 'app-auditoria-bandas',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './auditoria-bandas.component.html',
  styleUrl: './auditoria-bandas.component.scss',
})
export class AuditoriaBandasComponent implements OnInit {
  private auditoriaBandasService = inject(AuditoriaBandasService);
  private funcionesDatos = inject(FuncionesDatosService);
  private exportService = inject(ExportService);
  private snackBar = inject(MatSnackBar);

  readonly nombreOrigen = NOMBRE_ORIGEN_DISTRIBUCION;
  readonly nombreConcepto = NOMBRE_CONCEPTO_DISTRIBUCION;
  readonly conceptosDisponibles = CONCEPTOS_DISTRIBUCION;
  readonly tamaniosPagina = TAMANIOS_PAGINA;

  /**
   * ⛔ NO hardcodear: `CRD.BNDP` no tiene columna de etiqueta, el rango y el nombre los deriva
   * el backend por producto y por empresa — el catálogo sale de `cuadre().bandas`, solo las
   * bandas que de verdad aparecen en la distribución de este origen (verificado 2026-09-02).
   */
  bandasDisponibles = computed(() => this.cuadre()?.bandas ?? []);

  /**
   * Cada producto y cada tipo de cartera trae su PROPIA fila de banda con el mismo rótulo — el
   * usuario vio ~20 chips con "1 - 30" repetido cinco veces y no podía saber cuál era cuál
   * (2026-09-02). Se agrupa por `etiqueta`: un chip por rótulo distinto, que al activarse filtra
   * por TODOS los `idBanda` que comparten ese texto (el filtro ya es OR interno, así que sumar
   * ids no cambia el significado).
   */
  bandasAgrupadas = computed(() => {
    const grupos = new Map<string, number[]>();
    for (const b of this.bandasDisponibles()) {
      const ids = grupos.get(b.etiqueta) ?? [];
      ids.push(b.idBanda);
      grupos.set(b.etiqueta, ids);
    }
    return Array.from(grupos.entries()).map(([etiqueta, ids]) => ({ etiqueta, ids }));
  });

  // ---- vista: RESUMEN (jerárquica, por defecto) o DETALLE (tabla plana) ----
  vista = signal<'RESUMEN' | 'DETALLE'>('RESUMEN');
  conceptosExpandidos = signal<Set<ConceptoDistribucion>>(new Set());

  // ---- selector de origen ----
  cargandoOrigenes = signal(false);
  origenes = signal<OrigenListado[]>([]);
  origenSeleccionado = signal<OrigenListado | null>(null);
  errorOrigenes = signal<string | null>(null);
  filtroOrigenTexto = '';
  filtroOrigenTipo = signal<OrigenDistribucion | 'TODOS'>('TODOS');

  // ---- cuadre (arriba, siempre lo primero que se ve) ----
  cargandoCuadre = signal(false);
  cuadre = signal<CuadreDistribucionBandas | null>(null);
  errorCuadre = signal<string | null>(null);

  // ---- detalle filtrable ----
  cargandoDetalle = signal(false);
  detalle = signal<RespuestaDetalleDistribucion | null>(null);
  errorDetalle = signal<string | null>(null);

  // ---- filtros ----
  conceptosSeleccionados = signal<Set<ConceptoDistribucion>>(new Set());
  bandasSeleccionadas = signal<Set<number>>(new Set());
  fechaDesde = signal<Date | null>(null);
  fechaHasta = signal<Date | null>(null);
  idsEntidadTexto = '';
  cuentasContablesTexto = '';
  ordenarPor = signal<'valor' | 'fechaAplicacion' | 'concepto'>('valor');
  orden = signal<'asc' | 'desc'>('desc');
  pagina = signal(0);
  tamanio = signal(50);

  readonly hoy = new Date();

  hayFiltrosActivos = computed(
    () =>
      this.conceptosSeleccionados().size > 0 ||
      this.bandasSeleccionadas().size > 0 ||
      !!this.fechaDesde() ||
      !!this.fechaHasta() ||
      this.idsEntidadTexto.trim().length > 0 ||
      this.cuentasContablesTexto.trim().length > 0
  );

  totalPaginas = computed(() => {
    const d = this.detalle();
    if (!d || d.tamanio <= 0) return 1;
    return Math.max(1, Math.ceil(d.totalFilas / d.tamanio));
  });

  ngOnInit(): void {
    this.cargarOrigenes();
  }

  // ================= origen =================

  cargarOrigenes(): void {
    this.cargandoOrigenes.set(true);
    this.errorOrigenes.set(null);
    const tipo = this.filtroOrigenTipo();
    const filtro = tipo === 'TODOS' ? undefined : { origen: tipo };
    this.auditoriaBandasService.obtenerOrigenes(filtro).subscribe({
      next: (origenes) => {
        this.cargandoOrigenes.set(false);
        this.origenes.set(origenes ?? []);
        // Al abrir la pantalla (o al cambiar el filtro de tipo), se para en el más reciente:
        // es lo que el operador casi siempre quiere revisar primero.
        if (!this.origenSeleccionado() && origenes?.length) {
          this.seleccionarOrigen(origenes[0]);
        }
      },
      error: (err: ErrorAuditoriaBandas) => {
        this.cargandoOrigenes.set(false);
        this.origenes.set([]);
        this.errorOrigenes.set(err.mensaje);
      },
    });
  }

  get origenesFiltrados(): OrigenListado[] {
    const q = this.filtroOrigenTexto.trim().toLowerCase();
    if (!q) return this.origenes();
    return this.origenes().filter(
      (o) => o.descripcion.toLowerCase().includes(q) || String(o.idOrigen).includes(q)
    );
  }

  onCambioTipoOrigen(): void {
    this.cargarOrigenes();
  }

  seleccionarOrigen(origen: OrigenListado): void {
    this.origenSeleccionado.set(origen);
    this.limpiarFiltros(false);
    this.pagina.set(0);
    this.vista.set('RESUMEN');
    this.conceptosExpandidos.set(new Set());
    this.cargarCuadre();
    this.cargarDetalle();
  }

  // ================= cuadre =================

  private cargarCuadre(): void {
    const origen = this.origenSeleccionado();
    if (!origen) return;

    this.cargandoCuadre.set(true);
    this.errorCuadre.set(null);
    this.cuadre.set(null);

    this.auditoriaBandasService.obtenerCuadre(origen.origen, origen.idOrigen).subscribe({
      next: (cuadre) => {
        this.cargandoCuadre.set(false);
        this.cuadre.set(cuadre);
      },
      error: (err: ErrorAuditoriaBandas) => {
        this.cargandoCuadre.set(false);
        // No se muestra "sin datos": el error queda visible aparte hasta que el operador
        // reintente — es la regla no negociable del contrato para esta pantalla.
        this.errorCuadre.set(err.mensaje);
      },
    });
  }

  reintentarCuadre(): void {
    this.cargarCuadre();
  }

  // ================= detalle =================

  private construirFiltro(): FiltroDetalleDistribucion | null {
    const origen = this.origenSeleccionado();
    if (!origen) return null;

    const idsEntidad = this.parsearListaNumeros(this.idsEntidadTexto);
    const cuentasContables = this.parsearListaTexto(this.cuentasContablesTexto);

    return {
      origen: origen.origen,
      idOrigen: origen.idOrigen,
      conceptos: this.conceptosSeleccionados().size ? Array.from(this.conceptosSeleccionados()) : undefined,
      idsBanda: this.bandasSeleccionadas().size ? Array.from(this.bandasSeleccionadas()) : undefined,
      idsEntidad: idsEntidad.length ? idsEntidad : undefined,
      cuentasContables: cuentasContables.length ? cuentasContables : undefined,
      fechaDesde: this.formatearFechaFiltro(this.fechaDesde()),
      fechaHasta: this.formatearFechaFiltro(this.fechaHasta()),
      pagina: this.pagina(),
      tamanio: this.tamanio(),
      ordenarPor: this.ordenarPor(),
      orden: this.orden(),
    };
  }

  private cargarDetalle(): void {
    const filtro = this.construirFiltro();
    if (!filtro) return;

    this.cargandoDetalle.set(true);
    this.errorDetalle.set(null);
    this.detalle.set(null);

    this.auditoriaBandasService.obtenerDetalle(filtro).subscribe({
      next: (respuesta) => {
        this.cargandoDetalle.set(false);
        this.detalle.set(respuesta);
      },
      error: (err: ErrorAuditoriaBandas) => {
        this.cargandoDetalle.set(false);
        this.errorDetalle.set(err.mensaje);
      },
    });
  }

  reintentarDetalle(): void {
    this.cargarDetalle();
  }

  aplicarFiltros(): void {
    this.pagina.set(0);
    this.cargarDetalle();
  }

  limpiarFiltros(recargar = true): void {
    this.conceptosSeleccionados.set(new Set());
    this.bandasSeleccionadas.set(new Set());
    this.fechaDesde.set(null);
    this.fechaHasta.set(null);
    this.idsEntidadTexto = '';
    this.cuentasContablesTexto = '';
    this.ordenarPor.set('valor');
    this.orden.set('desc');
    if (recargar) this.aplicarFiltros();
  }

  toggleConcepto(concepto: ConceptoDistribucion): void {
    const actuales = new Set(this.conceptosSeleccionados());
    if (actuales.has(concepto)) actuales.delete(concepto);
    else actuales.add(concepto);
    this.conceptosSeleccionados.set(actuales);
    this.aplicarFiltros();
  }

  /** El chip es por ETIQUETA, no por `idBanda` individual — puede agrupar varios ids (ver `bandasAgrupadas`). */
  grupoBandaActivo(ids: number[]): boolean {
    const actuales = this.bandasSeleccionadas();
    return ids.some((id) => actuales.has(id));
  }

  toggleGrupoBanda(ids: number[]): void {
    const actuales = new Set(this.bandasSeleccionadas());
    const activo = ids.some((id) => actuales.has(id));
    ids.forEach((id) => (activo ? actuales.delete(id) : actuales.add(id)));
    this.bandasSeleccionadas.set(actuales);
    this.aplicarFiltros();
  }

  onCambioOrden(): void {
    this.aplicarFiltros();
  }

  onCambioTamanio(): void {
    this.pagina.set(0);
    this.cargarDetalle();
  }

  irAPagina(pagina: number): void {
    if (pagina < 0 || pagina >= this.totalPaginas()) return;
    this.pagina.set(pagina);
    this.cargarDetalle();
  }

  // ================= vista resumen / detalle =================

  cambiarVista(vista: 'RESUMEN' | 'DETALLE'): void {
    this.vista.set(vista);
  }

  conceptoExpandido(concepto: ConceptoDistribucion): boolean {
    return this.conceptosExpandidos().has(concepto);
  }

  toggleConceptoExpandido(concepto: ConceptoDistribucion): void {
    const actuales = new Set(this.conceptosExpandidos());
    if (actuales.has(concepto)) actuales.delete(concepto);
    else actuales.add(concepto);
    this.conceptosExpandidos.set(actuales);
  }

  /**
   * Abrir un renglón del resumen salta a Detalle con ESE filtro ya aplicado (§ "Las DOS vistas":
   * contabilidad tiene que responder "por qué fue este saldo a esta cuenta" en dos clics).
   */
  irADetalleDesdeResumen(concepto: ConceptoDistribucion, detalle: DetalleJerarquico): void {
    this.conceptosSeleccionados.set(new Set([concepto]));
    this.bandasSeleccionadas.set(detalle.idBanda != null ? new Set([detalle.idBanda]) : new Set());
    this.cuentasContablesTexto = detalle.cuentaContable ?? '';
    this.vista.set('DETALLE');
    this.aplicarFiltros();
  }

  // ================= exportar =================

  exportarCsv(): void {
    const filas = this.detalle()?.filas ?? [];
    if (!filas.length) {
      this.snackBar.open('No hay filas en esta página para exportar.', 'Cerrar', { duration: 3000 });
      return;
    }

    const contabilidadConectada = this.cuadre()?.contabilidadConectada ?? true;
    const headers = [
      'Concepto', 'Valor', 'Partícipe', 'Cédula', 'Préstamo', 'Cuota', 'Producto',
      'Tipo de cartera', 'Días', 'Banda', 'Fecha aplicación',
      ...(contabilidadConectada ? ['Cuenta contable', 'Nombre cuenta', 'Asiento'] : []),
    ];
    const dataKeys = [
      'concepto', 'valor', 'participe', 'cedula', 'idPrestamo', 'numeroCuota', 'producto',
      'tipoCartera', 'dias', 'banda', 'fechaAplicacion',
      ...(contabilidadConectada ? ['cuentaContable', 'nombreCuenta', 'idAsiento'] : []),
    ];

    const filasParaExportar = filas.map((f) => ({
      ...f,
      concepto: this.nombreConcepto[f.concepto],
      tipoCartera: this.nombreTipoCartera(f.tipoCartera),
    }));

    const origen = this.origenSeleccionado();
    const nombreArchivo = `auditoria-bandas-${origen?.origen ?? 'origen'}-${origen?.idOrigen ?? ''}-pag${this.pagina() + 1}`;
    this.exportService.exportToCSV(filasParaExportar, nombreArchivo, headers, dataKeys);
  }

  // ================= presentación =================

  formatFecha(fecha: unknown): string {
    return this.funcionesDatos.formatoFecha(fecha, 2) || '—';
  }

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** Participación de un valor sobre el total filtrado, para el árbol de la vista Resumen. */
  participacion(valor: number): string {
    const total = this.detalle()?.totalValorFiltrado ?? 0;
    if (total <= 0.004) return '—';
    return (100 * valor / total).toFixed(1) + '%';
  }

  trackByEtiquetaBanda(_index: number, grupo: { etiqueta: string; ids: number[] }): string {
    return grupo.etiqueta;
  }

  trackByBandaCatalogo(_index: number, banda: BandaFiltroDistribucion): number {
    return banda.idBanda;
  }

  trackByFila(_index: number, fila: FilaDistribucionBanda): number {
    return fila.id;
  }

  /** `tipoCartera` es un código (`TipoCarteraBanda`: 1/2), no el texto que muestra el contrato. */
  nombreTipoCartera(codigo: number | null): string {
    if (codigo == null) return '—';
    return TIPO_CARTERA_BANDA[codigo] ?? `Código ${codigo}`;
  }

  claseTipoCartera(codigo: number | null): string {
    return codigo != null ? 'tc-' + codigo : '';
  }

  private parsearListaNumeros(texto: string): number[] {
    return texto
      .split(',')
      .map((t) => Number(t.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
  }

  private parsearListaTexto(texto: string): string[] {
    return texto
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  /**
   * `LocalDate` como `yyyy-MM-dd` armado desde los componentes del `Date` local — nunca
   * `toISOString()` ni un `Date` crudo: el backend descarta el offset en vez de convertirlo y la
   * fecha queda corrida (mismo cuidado que en el resto de `crd`).
   */
  private formatearFechaFiltro(fecha: Date | null): string | undefined {
    if (!fecha) return undefined;
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
}
