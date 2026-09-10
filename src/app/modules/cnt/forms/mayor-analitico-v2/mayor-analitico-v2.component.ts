import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../shared/services/app-state.service';
import { PlanCuentaSelectorDialogComponent } from '../../../../shared/components/plan-cuenta-selector-dialog/plan-cuenta-selector-dialog.component';
import { MayorAnalitico } from '../../model/mayor-analitico';
import { DetalleMayorAnalitico } from '../../model/detalle-mayor-analitico';
import { ReporteMyanService } from '../../service/reporte-myan.service';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../shared/services/funciones-datos.service';
import { MayorAnaliticoAsientoDialogComponent } from '../../dialog/mayor-analitico-asiento-dialog/mayor-analitico-asiento-dialog.component';
import { ExportService } from '../../../../shared/services/export.service';
import { PermisosService } from '../../../../shared/services/permisos.service';
import { Permisos } from '../../../../shared/model/permisos';

type VistaMyan = 'cuenta' | 'todos';

@Component({
  selector: 'cnt-mayor-analitico-v2',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialFormModule, MatButtonToggleModule],
  templateUrl: './mayor-analitico-v2.component.html',
  styleUrls: ['./mayor-analitico-v2.component.scss'],
})
export class MayorAnaliticoV2Component implements OnInit, OnDestroy, AfterViewChecked {

  // ── Services ────────────────────────────────────────────────
  private fb              = inject(FormBuilder);
  private snackBar        = inject(MatSnackBar);
  private dialog          = inject(MatDialog);
  private reporteService  = inject(ReporteMyanService);
  private appState        = inject(AppStateService);
  private funcionesDatos  = inject(FuncionesDatosService);
  private exportService   = inject(ExportService);
  private permisosService = inject(PermisosService);

  // ── Estado general ──────────────────────────────────────────
  loading          = signal(false);
  loadingDetalles  = signal(false);
  loadingTodos     = signal(false);
  loadingExportAll = signal(false);
  errorMsg         = signal('');
  generado         = signal(false);

  secuencialReporte = signal<number | null>(null);
  totalCabeceras    = signal<number | null>(null);
  totalDetalles     = signal<number | null>(null);
  fechaProceso      = signal<string | null>(null);

  filtrosAbierto     = signal(true);
  resumenFiltrosTexto = signal('');

  vista = signal<VistaMyan>('cuenta');

  // ── Vista A — por cuenta (maestro-detalle) ─────────────────
  cabeceras        = signal<MayorAnalitico[]>([]);
  selectedCabecera = signal<MayorAnalitico | null>(null);
  detalles         = signal<DetalleMayorAnalitico[]>([]);

  searchCuentas     = signal('');
  searchMovimientos = signal('');

  filteredCabeceras = computed(() => {
    const q = this.searchCuentas().trim().toLowerCase();
    const rows = this.cabeceras();
    if (!q) return rows;
    return rows.filter(c =>
      (c.numeroCuenta ?? '').toLowerCase().includes(q) ||
      (c.nombreCuenta ?? '').toLowerCase().includes(q)
    );
  });

  filteredDetalles = computed(() => {
    const q = this.searchMovimientos().trim().toLowerCase();
    const rows = this.detalles();
    if (!q) return rows;
    return rows.filter(d => this.textoBusquedaMovimiento(d, false).includes(q));
  });

  totalDebeVistaA  = computed(() => this.filteredDetalles().reduce((s, d) => s + (d.valorDebe  || 0), 0));
  totalHaberVistaA = computed(() => this.filteredDetalles().reduce((s, d) => s + (d.valorHaber || 0), 0));

  // ── Vista B — todos los movimientos ─────────────────────────
  todosMovimientos         = signal<DetalleMayorAnalitico[]>([]);
  todosMovimientosSecuencial = signal<number | null>(null);
  searchTodos               = signal('');

  filteredTodos = computed(() => {
    const q = this.searchTodos().trim().toLowerCase();
    const rows = this.todosMovimientos();
    if (!q) return rows;
    return rows.filter(d => this.textoBusquedaMovimiento(d, true).includes(q));
  });

  totalDebeVistaB  = computed(() => this.filteredTodos().reduce((s, d) => s + (d.valorDebe  || 0), 0));
  totalHaberVistaB = computed(() => this.filteredTodos().reduce((s, d) => s + (d.valorHaber || 0), 0));

  // ── DataSources (para matSort / paginator) ──────────────────
  readonly cuentasDataSource          = new MatTableDataSource<MayorAnalitico>([]);
  readonly movimientosDataSource      = new MatTableDataSource<DetalleMayorAnalitico>([]);
  readonly todosMovimientosDataSource = new MatTableDataSource<DetalleMayorAnalitico>([]);

  @ViewChild('sortCuentas') sortCuentas?: MatSort;
  @ViewChild('sortMovimientos') sortMovimientos?: MatSort;
  @ViewChild('sortTodos') sortTodos?: MatSort;
  @ViewChild('paginatorTodos') paginatorTodos?: MatPaginator;

  // ── Columnas ─────────────────────────────────────────────────
  readonly colsCabecera   = ['numeroCuenta', 'nombreCuenta', 'saldoAnterior'];
  readonly colsDetalle    = ['fechaAsiento', 'numeroAlterno', 'numeroAsiento', 'tipoAsiento', 'descripcionAsiento', 'observacionAsiento', 'valorDebe', 'valorHaber', 'saldoActual', 'estadoAsiento', 'centroCosto'];
  readonly colsTodos      = ['cuenta', 'nombreCuenta', 'fechaAsiento', 'numeroAlterno', 'numeroAsiento', 'tipoAsiento', 'descripcionAsiento', 'observacionAsiento', 'valorDebe', 'valorHaber', 'saldoActual', 'estadoAsiento', 'centroCosto'];

  // ── Formulario ───────────────────────────────────────────────
  form!: FormGroup;

  @ViewChild('fechaInicioInput', { read: ElementRef }) fechaInicioInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaFinInput', { read: ElementRef }) fechaFinInputRef!: ElementRef<HTMLInputElement>;
  private _rawFechaInicio = '';
  private _rawFechaFin = '';

  readonly opcionesTipoDistribucion = [
    { label: 'Sin centro de costo', value: 0 },
    { label: 'Centro por cuenta',   value: 1 },
    { label: 'Cuenta por centro',   value: 2 },
  ];
  readonly opcionesAcumulacion = [
    { label: 'Sin acumular', value: 0 },
    { label: 'Acumulado',    value: 1 },
  ];

  private get idEmpresa(): number {
    return this.appState.getEmpresa()?.codigo
      ?? parseInt(localStorage.getItem('idSucursal') || '0', 10);
  }

  constructor() {
    // Mantiene las tres MatTableDataSource sincronizadas con los signals filtrados,
    // así matSort/matPaginator siguen funcionando sin depender de dataSource.filter.
    effect(() => { this.cuentasDataSource.data = this.filteredCabeceras(); });
    effect(() => { this.movimientosDataSource.data = this.filteredDetalles(); });
    effect(() => { this.todosMovimientosDataSource.data = this.filteredTodos(); });

    const accessorDetalle = (item: DetalleMayorAnalitico, property: string): string | number => {
      switch (property) {
        case 'numeroAlterno': return this.getNumeroAlterno(item);
        case 'tipoAsiento':   return this.getTipoAsientoNombre(item);
        case 'observacionAsiento': return this.getObservacionAsiento(item);
        case 'centroCosto':   return item.numeroCentroCosto || item.nombreCosto || '';
        case 'cuenta':        return (item.planCuenta as any)?.cuentaContable || '';
        case 'nombreCuenta':  return (item.planCuenta as any)?.nombre || '';
        case 'fechaAsiento':  return this.fechaSortValue(item.fechaAsiento);
        default:              return (item as any)[property] ?? '';
      }
    };
    this.movimientosDataSource.sortingDataAccessor = accessorDetalle;
    this.todosMovimientosDataSource.sortingDataAccessor = accessorDetalle;
  }

  // ── Datepicker: Fecha Inicio ──────────────────────────────────
  capturarFechaInicioRaw(event: Event): void {
    this._rawFechaInicio = (event.target as HTMLInputElement).value;
  }
  syncFechaInicioFromRaw(event: FocusEvent): void {
    const raw = (this._rawFechaInicio || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaInicio = '';
    const date = this.parseFechaLocalMyan(raw);
    if (!date) return;
    const formatted = this.funcionesDatos.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
    this.form.patchValue({ fechaInicio: date }, { emitEvent: false });
    this.form.get('fechaInicio')?.setErrors(null);
    this.form.get('fechaInicio')?.markAsUntouched();
    setTimeout(() => { if (this.fechaInicioInputRef?.nativeElement) this.fechaInicioInputRef.nativeElement.value = formatted; });
  }
  onFechaInicioPickerChange(date: Date | null | undefined): void {
    const d = date || new Date();
    const formatted = this.funcionesDatos.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
    this.form.patchValue({ fechaInicio: d }, { emitEvent: false });
    this.form.get('fechaInicio')?.setErrors(null);
    this.form.get('fechaInicio')?.markAsUntouched();
    setTimeout(() => { if (this.fechaInicioInputRef?.nativeElement) this.fechaInicioInputRef.nativeElement.value = formatted; });
  }

  // ── Datepicker: Fecha Fin ──────────────────────────────────────
  capturarFechaFinRaw(event: Event): void {
    this._rawFechaFin = (event.target as HTMLInputElement).value;
  }
  syncFechaFinFromRaw(event: FocusEvent): void {
    const raw = (this._rawFechaFin || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaFin = '';
    const date = this.parseFechaLocalMyan(raw);
    if (!date) return;
    const formatted = this.funcionesDatos.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
    this.form.patchValue({ fechaFin: date }, { emitEvent: false });
    this.form.get('fechaFin')?.setErrors(null);
    this.form.get('fechaFin')?.markAsUntouched();
    setTimeout(() => { if (this.fechaFinInputRef?.nativeElement) this.fechaFinInputRef.nativeElement.value = formatted; });
  }
  onFechaFinPickerChange(date: Date | null | undefined): void {
    const d = date || new Date();
    const formatted = this.funcionesDatos.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
    this.form.patchValue({ fechaFin: d }, { emitEvent: false });
    this.form.get('fechaFin')?.setErrors(null);
    this.form.get('fechaFin')?.markAsUntouched();
    setTimeout(() => { if (this.fechaFinInputRef?.nativeElement) this.fechaFinInputRef.nativeElement.value = formatted; });
  }

  private parseFechaLocalMyan(raw: string): Date | null {
    if (!raw) return null;
    const parts = raw.split('/');
    if (parts.length !== 3) return null;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (isNaN(dia) || dia < 1 || dia > 31 || isNaN(mes) || mes < 0 || mes > 11 || isNaN(anio) || anio < 1000) return null;
    const d = new Date(anio, mes, dia);
    return d.getFullYear() === anio && d.getMonth() === mes && d.getDate() === dia ? d : null;
  }

  // ───────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.form = this.fb.group({
      fechaInicio:       [null, Validators.required],
      fechaFin:          [null, Validators.required],
      cuentaInicio:      [null],
      cuentaFin:         [null],
      tipoDistribucion:  [0],
      tipoAcumulacion:   [0],
      centroInicio:      [null],
      centroFin:         [null],
    });
  }

  ngOnDestroy(): void {
    const sec = this.secuencialReporte();
    if (sec) {
      this.reporteService.eliminarReporte(sec).subscribe();
    }
  }

  ngAfterViewChecked(): void {
    if (this.sortCuentas && this.cuentasDataSource.sort !== this.sortCuentas) {
      this.cuentasDataSource.sort = this.sortCuentas;
    }
    if (this.sortMovimientos && this.movimientosDataSource.sort !== this.sortMovimientos) {
      this.movimientosDataSource.sort = this.sortMovimientos;
    }
    if (this.sortTodos && this.todosMovimientosDataSource.sort !== this.sortTodos) {
      this.todosMovimientosDataSource.sort = this.sortTodos;
    }
    if (this.paginatorTodos && this.todosMovimientosDataSource.paginator !== this.paginatorTodos) {
      this.todosMovimientosDataSource.paginator = this.paginatorTodos;
    }
  }

  // ── Selectores de Plan de Cuentas ─────────────────────────────
  abrirSelectorCuentaInicio(): void {
    const ref = this.dialog.open(PlanCuentaSelectorDialogComponent, {
      width: '900px', maxWidth: '95vw',
      data: { titulo: 'Seleccionar Cuenta Inicio', mostrarSoloMovimiento: false }
    });
    ref.afterClosed().subscribe(cuenta => {
      if (!cuenta) return;
      // Siempre sobreescribe cuentaFin (aunque ya tenga un valor): la mayoría de
      // las veces el mayor se saca de una sola cuenta, y "solo si está vacío"
      // deja rangos inválidos (desde=B, hasta=A de una elección anterior) que
      // salen vacíos sin avisar. Quien quiera un rango pone "hasta" después.
      this.form.patchValue({ cuentaInicio: cuenta.cuentaContable, cuentaFin: cuenta.cuentaContable });
    });
  }

  abrirSelectorCuentaFin(): void {
    const ref = this.dialog.open(PlanCuentaSelectorDialogComponent, {
      width: '900px', maxWidth: '95vw',
      data: { titulo: 'Seleccionar Cuenta Fin', mostrarSoloMovimiento: false }
    });
    ref.afterClosed().subscribe(cuenta => {
      if (!cuenta) return;
      this.form.patchValue({ cuentaFin: cuenta.cuentaContable });
    });
  }

  // ── Cambiar vista ────────────────────────────────────────────
  cambiarVista(v: VistaMyan): void {
    this.vista.set(v);
    if (v === 'todos') {
      this.asegurarTodosMovimientosCargados();
    }
  }

  // ── Generar Reporte ──────────────────────────────────────────
  generar(): void {
    if (this.form.invalid) {
      this.errorMsg.set('Fecha inicio y fecha fin son obligatorias.');
      return;
    }
    const v = this.form.value;
    if (new Date(v.fechaInicio) > new Date(v.fechaFin)) {
      this.errorMsg.set('La fecha inicial no puede ser mayor que la fecha final.');
      return;
    }

    this.errorMsg.set('');
    this.loading.set(true);
    this.generado.set(false);
    this.cabeceras.set([]);
    this.detalles.set([]);
    this.selectedCabecera.set(null);
    this.todosMovimientos.set([]);
    this.todosMovimientosSecuencial.set(null);
    this.vista.set('cuenta');
    this.searchCuentas.set('');
    this.searchMovimientos.set('');
    this.searchTodos.set('');

    // Si ya hay un reporte anterior, limpiarlo antes de generar uno nuevo
    const secAnterior = this.secuencialReporte();
    if (secAnterior) {
      this.reporteService.eliminarReporte(secAnterior).subscribe();
      this.secuencialReporte.set(null);
    }

    const params = {
      fechaInicio:      this.funcionesDatos.formatearFechaParaBackend(v.fechaInicio, TipoFormatoFechaBackend.SOLO_FECHA) ?? '',
      fechaFin:         this.funcionesDatos.formatearFechaParaBackend(v.fechaFin, TipoFormatoFechaBackend.SOLO_FECHA) ?? '',
      empresa:          this.idEmpresa,
      cuentaInicio:     v.cuentaInicio  || null,
      cuentaFin:        v.cuentaFin     || null,
      tipoDistribucion: v.tipoDistribucion ?? 0,
      tipoAcumulacion:  v.tipoAcumulacion  ?? 0,
      centroInicio:     v.centroInicio  || null,
      centroFin:        v.centroFin     || null,
    };

    this.reporteService.generarReporte(params).subscribe({
      next: (resp) => {
        if (!resp || !resp.exitoso || resp.secuencialReporte == null) {
          this.errorMsg.set(resp?.mensaje || 'Error al generar el reporte.');
          this.loading.set(false);
          return;
        }
        this.secuencialReporte.set(resp.secuencialReporte);
        this.totalCabeceras.set(resp.totalCabeceras);
        this.totalDetalles.set(resp.totalDetalles);
        this.fechaProceso.set(resp.fechaProceso);
        this.resumenFiltrosTexto.set(this.construirResumenFiltros(v));
        this.filtrosAbierto.set(false);
        this.cargarCabeceras(resp.secuencialReporte);
      },
      error: () => {
        this.errorMsg.set('Error de conexión al generar el reporte.');
        this.loading.set(false);
      },
    });
  }

  private construirResumenFiltros(v: any): string {
    const fIni = this.funcionesDatos.formatoFecha(v.fechaInicio, FuncionesDatosService.SOLO_FECHA) || '—';
    const fFin = this.funcionesDatos.formatoFecha(v.fechaFin, FuncionesDatosService.SOLO_FECHA) || '—';
    const cuentas = (v.cuentaInicio || v.cuentaFin)
      ? `Cuentas ${v.cuentaInicio || '...'}–${v.cuentaFin || '...'}`
      : 'Todas las cuentas';
    const centro = (v.centroInicio || v.centroFin)
      ? `Centro ${v.centroInicio || '...'}–${v.centroFin || '...'}`
      : 'Sin centro de costo';
    return `${fIni} – ${fFin} · ${cuentas} · ${centro}`;
  }

  private cargarCabeceras(secuencial: number): void {
    this.reporteService.obtenerCabeceras(secuencial).subscribe({
      next: (data) => {
        const cabeceras = data ?? [];
        this.cabeceras.set(cabeceras);
        this.generado.set(true);
        this.loading.set(false);
        if (cabeceras.length === 0) {
          this.snackBar.open('El reporte no generó resultados para los filtros indicados.', 'Cerrar', { duration: 4000 });
          return;
        }
        this.seleccionarCuenta(cabeceras[0]);
      },
      error: () => {
        this.errorMsg.set('Error al cargar las cuentas del reporte.');
        this.loading.set(false);
      },
    });
  }

  // ── Seleccionar cabecera (cargar detalle) ────────────────────
  seleccionarCuenta(cuenta: MayorAnalitico): void {
    if (this.selectedCabecera()?.codigo === cuenta.codigo) return;
    this.selectedCabecera.set(cuenta);
    this.loadingDetalles.set(true);
    this.detalles.set([]);
    this.searchMovimientos.set('');

    this.reporteService.obtenerDetalles(cuenta.codigo).subscribe({
      next: (data) => {
        this.detalles.set(data ?? []);
        this.loadingDetalles.set(false);
      },
      error: () => {
        this.snackBar.open('Error al cargar el detalle de la cuenta.', 'Cerrar', { duration: 3000 });
        this.loadingDetalles.set(false);
      },
    });
  }

  // ── Vista B: cargar todos los movimientos del reporte (una sola llamada) ──
  private asegurarTodosMovimientosCargados(onReady?: () => void): void {
    const sec = this.secuencialReporte();
    if (!sec) return;

    if (this.todosMovimientosSecuencial() === sec && this.todosMovimientos().length > 0) {
      onReady?.();
      return;
    }

    this.loadingTodos.set(true);
    this.reporteService.obtenerDetalleReporte(sec).subscribe({
      next: (data) => {
        this.todosMovimientos.set(data ?? []);
        this.todosMovimientosSecuencial.set(sec);
        this.loadingTodos.set(false);
        onReady?.();
      },
      error: () => {
        this.snackBar.open('Error al cargar todos los movimientos del reporte.', 'Cerrar', { duration: 4000 });
        this.loadingTodos.set(false);
      },
    });
  }

  // ── Utilidades ───────────────────────────────────────────────
  formatFecha(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return fecha ?? '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private fechaSortValue(fecha: any): number {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    return d ? d.getTime() : 0;
  }

  formatEstadoAsiento(estado: number): string {
    return this.estadoLabel(estado);
  }

  estadoLabel(estado: number): string {
    const map: Record<number, string> = { 1: 'Activo', 2: 'Anulado', 3: 'Preliminar', 4: 'Incompleto' };
    return map[estado] ?? String(estado);
  }

  getTipoAsientoNombre(detalle: DetalleMayorAnalitico): string {
    return detalle?.asiento?.tipoAsiento?.nombre || 'Sin tipo';
  }

  getObservacionAsiento(detalle: DetalleMayorAnalitico): string {
    return detalle?.asiento?.observaciones || '—';
  }

  /**
   * Identificación del asiento que el contador reconoce. Los asientos viejos o creados por
   * caminos que no pasan por la numeración pueden no tener `numeroAlterno` — respaldo
   * obligatorio al consecutivo interno, y nunca la celda vacía (contrato §4).
   */
  getNumeroAlterno(detalle: DetalleMayorAnalitico): string {
    return detalle?.asiento?.numeroAlterno || String(detalle?.numeroAsiento ?? '') || '—';
  }

  private textoBusquedaMovimiento(d: DetalleMayorAnalitico, incluirCuenta: boolean): string {
    const partes = [
      this.getNumeroAlterno(d),
      String(d.numeroAsiento ?? ''),
      this.getTipoAsientoNombre(d),
      d.descripcionAsiento ?? '',
      this.getObservacionAsiento(d),
      this.estadoLabel(d.estadoAsiento),
      d.numeroCentroCosto || '',
      d.nombreCosto || '',
    ];
    if (incluirCuenta) {
      partes.push((d.planCuenta as any)?.cuentaContable || '', (d.planCuenta as any)?.nombre || '');
    }
    return partes.join(' ').toLowerCase();
  }

  abrirAsientoRelacionado(detalle: DetalleMayorAnalitico): void {
    this.permisosService.ejecutarSiPermitido(
      Permisos.CNT_MAYOR_ANALITICO_V2_ASIENTO_DEL_MAYOR,
      () => this.dialog.open(MayorAnaliticoAsientoDialogComponent, {
        width: '95vw',
        maxWidth: '1600px',
        maxHeight: '92vh',
        data: { detalle },
        panelClass: 'mayor-analitico-asiento-dialog-panel',
      }),
      (mensaje) => this.snackBar.open(mensaje.toUpperCase(), 'Cerrar', { duration: 4000 }),
    );
  }

  // ── Exports CSV ────────────────────────────────────────────
  private filaCSVMovimiento(mov: DetalleMayorAnalitico, conCuenta: boolean): Record<string, string> {
    const fila: Record<string, string> = {};
    if (conCuenta) {
      fila['N° Cuenta']     = (mov.planCuenta as any)?.cuentaContable || '';
      fila['Nombre Cuenta'] = (mov.planCuenta as any)?.nombre || '';
    }
    fila['N° Asiento']  = this.getNumeroAlterno(mov);
    fila['N° Interno']  = String(mov.numeroAsiento ?? '');
    fila['Fecha']       = this.formatFecha(mov.fechaAsiento);
    fila['Tipo']        = this.getTipoAsientoNombre(mov);
    fila['Descripción'] = mov.descripcionAsiento ?? '';
    fila['Observación'] = this.getObservacionAsiento(mov);
    fila['Debe']        = Number(mov.valorDebe  ?? 0).toFixed(2);
    fila['Haber']       = Number(mov.valorHaber ?? 0).toFixed(2);
    fila['Saldo']       = Number(mov.saldoActual ?? 0).toFixed(2);
    fila['Estado']      = this.estadoLabel(mov.estadoAsiento);
    fila['Centro Costo'] = mov.numeroCentroCosto || mov.nombreCosto || '';
    return fila;
  }

  /** CSV de la cuenta seleccionada (Vista A). */
  exportarDetalleCSV(): void {
    const movimientos = this.detalles();
    if (!movimientos.length) {
      this.snackBar.open('No hay movimientos para exportar.', 'Cerrar', { duration: 3000 });
      return;
    }
    const rows = movimientos.map(m => this.filaCSVMovimiento(m, false));
    const headers = ['N° Asiento', 'N° Interno', 'Fecha', 'Tipo', 'Descripción', 'Observación', 'Debe', 'Haber', 'Saldo', 'Estado', 'Centro Costo'];
    const numeroCuenta = this.selectedCabecera()?.numeroCuenta || 'detalle';
    const filename = `mayor-analitico-v2-${String(numeroCuenta).replace(/\s+/g, '-')}`;
    this.exportService.exportToCSV(rows, filename, headers, headers);
  }

  /** CSV de todo el reporte (todas las cuentas), con el endpoint nuevo — una sola petición. */
  exportarTodoReporteCSV(): void {
    if (!this.secuencialReporte()) {
      this.snackBar.open('Genere el reporte antes de exportar.', 'Cerrar', { duration: 3000 });
      return;
    }
    this.loadingExportAll.set(true);
    this.asegurarTodosMovimientosCargados(() => {
      this.loadingExportAll.set(false);
      const movimientos = this.todosMovimientos();
      if (!movimientos.length) {
        this.snackBar.open('El reporte no tiene movimientos para exportar.', 'Cerrar', { duration: 3000 });
        return;
      }
      const rows = movimientos.map(m => this.filaCSVMovimiento(m, true));
      const headers = ['N° Cuenta', 'Nombre Cuenta', 'N° Asiento', 'N° Interno', 'Fecha', 'Tipo', 'Descripción', 'Observación', 'Debe', 'Haber', 'Saldo', 'Estado', 'Centro Costo'];
      this.exportService.exportToCSV(rows, 'mayor-analitico-v2-completo', headers, headers);
      this.snackBar.open(`CSV generado: ${rows.length} filas exportadas.`, 'Cerrar', {
        duration: 4000, panelClass: ['success-snackbar'],
      });
    });
  }

  /** Aplica el orden de un MatSort a un arreglo ya filtrado, sin explotar si aún no hay sort conectado. */
  private aplicarOrden<T>(dataSource: MatTableDataSource<T>, rows: T[]): T[] {
    return dataSource.sort ? dataSource.sortData(rows, dataSource.sort) : rows;
  }

  /** CSV de lo que está en pantalla ahora mismo (respeta filtro y orden aplicados). */
  exportarPantallaCSV(): void {
    if (this.vista() === 'cuenta') {
      const rows = this.aplicarOrden(this.movimientosDataSource, this.movimientosDataSource.data);
      if (!rows.length) {
        this.snackBar.open('No hay movimientos en pantalla para exportar.', 'Cerrar', { duration: 3000 });
        return;
      }
      const csvRows = rows.map(m => this.filaCSVMovimiento(m, false));
      const headers = ['N° Asiento', 'N° Interno', 'Fecha', 'Tipo', 'Descripción', 'Observación', 'Debe', 'Haber', 'Saldo', 'Estado', 'Centro Costo'];
      this.exportService.exportToCSV(csvRows, 'mayor-analitico-v2-pantalla', headers, headers);
    } else {
      const rows = this.aplicarOrden(this.todosMovimientosDataSource, this.todosMovimientosDataSource.data);
      if (!rows.length) {
        this.snackBar.open('No hay movimientos en pantalla para exportar.', 'Cerrar', { duration: 3000 });
        return;
      }
      const csvRows = rows.map(m => this.filaCSVMovimiento(m, true));
      const headers = ['N° Cuenta', 'Nombre Cuenta', 'N° Asiento', 'N° Interno', 'Fecha', 'Tipo', 'Descripción', 'Observación', 'Debe', 'Haber', 'Saldo', 'Estado', 'Centro Costo'];
      this.exportService.exportToCSV(csvRows, 'mayor-analitico-v2-pantalla', headers, headers);
    }
  }
}
