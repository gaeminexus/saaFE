import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../shared/services/app-state.service';
import { PlanCuentaSelectorDialogComponent } from '../../../../shared/components/plan-cuenta-selector-dialog/plan-cuenta-selector-dialog.component';
import { MayorAnalitico } from '../../model/mayor-analitico';
import { DetalleMayorAnalitico } from '../../model/detalle-mayor-analitico';
import { ReporteMyanService } from '../../service/reporte-myan.service';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../shared/services/funciones-datos.service';
import { MayorAnaliticoAsientoDialogComponent } from '../../dialog/mayor-analitico-asiento-dialog/mayor-analitico-asiento-dialog.component';
import { ExportService } from '../../../../shared/services/export.service';

@Component({
  selector: 'cnt-reporte-mayor-analitico',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './reporte-mayor-analitico.component.html',
  styleUrls: ['./reporte-mayor-analitico.component.scss'],
})
export class ReporteMayorAnaliticoComponent implements OnInit, OnDestroy {

  // ── Services ────────────────────────────────────────────────
  private fb              = inject(FormBuilder);
  private snackBar        = inject(MatSnackBar);
  private dialog          = inject(MatDialog);
  private reporteService  = inject(ReporteMyanService);
  private appState        = inject(AppStateService);
  private funcionesDatos  = inject(FuncionesDatosService);
  private exportService   = inject(ExportService);

  // ── Estado ──────────────────────────────────────────────────
  loading          = signal(false);
  loadingDetalles  = signal(false);
  errorMsg         = signal('');
  generado         = signal(false);

  secuencialReporte = signal<number | null>(null);
  totalCabeceras    = signal<number | null>(null);
  totalDetalles     = signal<number | null>(null);
  fechaProceso      = signal<string | null>(null);

  cabeceras          = signal<MayorAnalitico[]>([]);
  selectedCabecera   = signal<MayorAnalitico | null>(null);
  detalles           = signal<DetalleMayorAnalitico[]>([]);

  // ── Computed ─────────────────────────────────────────────────
  totalDebe    = computed(() => this.detalles().reduce((s, d) => s + (d.valorDebe  || 0), 0));
  totalHaber   = computed(() => this.detalles().reduce((s, d) => s + (d.valorHaber || 0), 0));

  // ── Columnas ─────────────────────────────────────────────────
  readonly colsCabecera  = ['numeroCuenta', 'nombreCuenta', 'saldoAnterior'];
  readonly colsDetalle   = ['fechaAsiento', 'numeroAsiento', 'descripcionAsiento', 'observacionAsiento', 'valorDebe', 'valorHaber', 'saldoActual', 'estadoAsiento'];

  // ── Formulario ───────────────────────────────────────────────
  form!: FormGroup;

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
    // Limpiar registros temporales del backend al salir de la pantalla
    const sec = this.secuencialReporte();
    if (sec) {
      this.reporteService.eliminarReporte(sec).subscribe();
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
      this.form.patchValue({ cuentaInicio: cuenta.cuentaContable });
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
        this.cargarCabeceras(resp.secuencialReporte);
      },
      error: () => {
        this.errorMsg.set('Error de conexión al generar el reporte.');
        this.loading.set(false);
      },
    });
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

  // ── Utilidades ───────────────────────────────────────────────
  formatFecha(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return fecha ?? '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatEstadoAsiento(estado: number): string {
    return this.estadoLabel(estado);
  }

  getTipoAsientoNombre(detalle: DetalleMayorAnalitico): string {
    return detalle?.asiento?.tipoAsiento?.nombre || 'Sin tipo';
  }

  getObservacionAsiento(detalle: DetalleMayorAnalitico): string {
    return detalle?.asiento?.observaciones || '—';
  }

  exportarDetalleCSV(): void {
    const movimientos = this.detalles();
    if (!movimientos.length) {
      this.snackBar.open('No hay movimientos para exportar.', 'Cerrar', { duration: 3000 });
      return;
    }

    const rows = movimientos.map((mov) => ({
      'Fecha': this.formatFecha(mov.fechaAsiento),
      'N° Asiento': `${mov.numeroAsiento ?? ''} - ${this.getTipoAsientoNombre(mov)}`,
      'Descripción': mov.descripcionAsiento ?? '',
      'Observación Asiento': this.getObservacionAsiento(mov),
      'Debe': Number(mov.valorDebe ?? 0).toFixed(2),
      'Haber': Number(mov.valorHaber ?? 0).toFixed(2),
      'Saldo': Number(mov.saldoActual ?? 0).toFixed(2),
      'Estado': this.formatEstadoAsiento(mov.estadoAsiento),
      'Centro Costo': mov.numeroCentroCosto || mov.nombreCosto || '',
    }));

    const numeroCuenta = this.selectedCabecera()?.numeroCuenta || 'detalle';
    const filename = `mayor-analitico-${String(numeroCuenta).replace(/\s+/g, '-')}`;
    const headers = ['Fecha', 'N° Asiento', 'Descripción', 'Observación Asiento', 'Debe', 'Haber', 'Saldo', 'Estado', 'Centro Costo'];
    const dataKeys = ['Fecha', 'N° Asiento', 'Descripción', 'Observación Asiento', 'Debe', 'Haber', 'Saldo', 'Estado', 'Centro Costo'];

    this.exportService.exportToCSV(rows, filename, headers, dataKeys);
  }

  abrirAsientoRelacionado(detalle: DetalleMayorAnalitico): void {
    this.dialog.open(MayorAnaliticoAsientoDialogComponent, {
      width: '95vw',
      maxWidth: '1600px',
      maxHeight: '92vh',
      data: { detalle },
      panelClass: 'mayor-analitico-asiento-dialog-panel',
    });
  }

  estadoLabel(estado: number): string {
    const map: Record<number, string> = { 1: 'Activo', 2: 'Anulado', 3: 'Preliminar', 4: 'Incompleto' };
    return map[estado] ?? String(estado);
  }
}
