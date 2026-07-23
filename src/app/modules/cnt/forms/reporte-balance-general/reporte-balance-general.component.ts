import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../shared/services/app-state.service';
import { TemporalReporte } from '../../model/temporal-reporte';
import { ReporteContable } from '../../model/reporte-contable';
import { ReporteBalanceService } from '../../service/reporte-balance.service';
import { ReporteContableService } from '../../service/reporte-contable.service';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../shared/services/funciones-datos.service';
import { ExportService } from '../../../../shared/services/export.service';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

@Component({
  selector: 'cnt-reporte-balance-general',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './reporte-balance-general.component.html',
  styleUrls: ['./reporte-balance-general.component.scss'],
})
export class ReporteBalanceGeneralComponent implements OnInit, OnDestroy {

  // ── Services ────────────────────────────────────────────────
  private fb                    = inject(FormBuilder);
  private snackBar              = inject(MatSnackBar);
  private balanceService        = inject(ReporteBalanceService);
  private reporteContableService = inject(ReporteContableService);
  private appState              = inject(AppStateService);
  private funcionesDatos        = inject(FuncionesDatosService);
  private exportService         = inject(ExportService);

  // ── Catálogos ────────────────────────────────────────────────
  reportes = signal<ReporteContable[]>([]);

  // ── Estado ──────────────────────────────────────────────────
  loading       = signal(false);
  errorMsg      = signal('');
  generado      = signal(false);
  mostrarDebeHaber = signal(false);

  idEjecucion   = signal<number | null>(null);
  totalRegistros = signal<number | null>(null);
  fechaProceso  = signal<string | null>(null);
  balanceData   = signal<TemporalReporte[]>([]);

  // ── Computed totales ────────────────────────────────────
  totalSaldoAnterior = computed(() =>
    this.balanceData().reduce((s, r) => s + (r.saldoCuenta || 0), 0));
  totalDebe = computed(() =>
    this.balanceData().reduce((s, r) => s + (r.valorDebe || 0), 0));
  totalHaber = computed(() =>
    this.balanceData().reduce((s, r) => s + (r.valorHaber || 0), 0));
  totalSaldoActual = computed(() =>
    this.balanceData().reduce((s, r) => s + (r.valorActual || 0), 0));

  // ── Columnas ───────────────────────────────────────────
  colsBalance = computed(() => {
    const base = ['cuentaContable', 'nombreCuenta', 'nivel', 'saldoCuenta'];
    if (this.mostrarDebeHaber()) {
      base.push('valorDebe', 'valorHaber');
    }
    base.push('valorActual');
    return base;
  });

  // ── Formulario ───────────────────────────────────────────────
  form!: FormGroup;

  @ViewChild('fechaInicioInput', { read: ElementRef }) fechaInicioInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaFinInput', { read: ElementRef }) fechaFinInputRef!: ElementRef<HTMLInputElement>;
  private _rawFechaInicio = '';
  private _rawFechaFin = '';

  // ── Datepicker: Fecha Inicio ─────────────────────────────────
  capturarFechaInicioRaw(event: Event): void {
    this._rawFechaInicio = (event.target as HTMLInputElement).value;
  }
  syncFechaInicioFromRaw(event: FocusEvent): void {
    const raw = (this._rawFechaInicio || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaInicio = '';
    const date = this.parseFechaLocalBG(raw);
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

  // ── Datepicker: Fecha Fin ────────────────────────────────────
  capturarFechaFinRaw(event: Event): void {
    this._rawFechaFin = (event.target as HTMLInputElement).value;
  }
  syncFechaFinFromRaw(event: FocusEvent): void {
    const raw = (this._rawFechaFin || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaFin = '';
    const date = this.parseFechaLocalBG(raw);
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

  private parseFechaLocalBG(raw: string): Date | null {
    if (!raw) return null;
    const parts = raw.split('/');
    if (parts.length !== 3) return null;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (isNaN(dia) || dia < 1 || dia > 31 || isNaN(mes) || mes < 0 || mes > 11 || isNaN(anio) || anio < 1000) return null;
    const d = new Date(anio, mes, dia);
    return d.getFullYear() === anio && d.getMonth() === mes && d.getDate() === dia ? d : null;
  }

  ngOnInit(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    this.form = this.fb.group({
      fechaInicio:         [firstDay, Validators.required],
      fechaFin:            [today,    Validators.required],
      codigoAlterno:       [null,     Validators.required],
      acumulacion:         ['0'],
      incluyeCentrosCosto: [false],
      reporteDistribuido:  [false],
      eliminarSaldosCero:  [true],
    });

    this.cargarReportes();
  }

  private cargarReportes(): void {
    const empresa = this.appState.getEmpresa()?.codigo
      ?? parseInt(localStorage.getItem('idSucursal') || '0', 10);

    const criterioEmpresa = new DatosBusqueda();
    criterioEmpresa.asignaValorConCampoPadre(TipoDatos.LONG, 'empresa', 'codigo', String(empresa), TipoComandosBusqueda.IGUAL);
    this.reporteContableService.selectByCriteria([criterioEmpresa]).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.reportes.set(data);
        } else {
          // Fallback: intentar getAll si selectByCriteria no devuelve datos
          this.reporteContableService.getAll().subscribe({
            next: (all) => this.reportes.set(all ?? []),
            error: (err) => this.errorMsg.set('No se pudieron cargar los tipos de reporte: ' + (err?.message ?? ''))
          });
        }
      },
      error: () => {
        this.reporteContableService.getAll().subscribe({
          next: (all) => this.reportes.set(all ?? []),
          error: (err) => this.errorMsg.set('No se pudieron cargar los tipos de reporte: ' + (err?.message ?? ''))
        });
      }
    });
  }

  // ── Acciones ──────────────────────────────────────────────────
  generar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.errorMsg.set('');

    // Limpiar ejecución anterior
    const prevId = this.idEjecucion();
    if (prevId) {
      this.balanceService.eliminarBalance(prevId).subscribe();
      this.idEjecucion.set(null);
    }

    this.loading.set(true);
    this.generado.set(false);
    this.balanceData.set([]);

    const v = this.form.value;
    const empresa = this.appState.getEmpresa()?.codigo
      ?? parseInt(localStorage.getItem('idSucursal') || '0', 10);

    this.balanceService.generarBalance({
      fechaInicio: this.funcionesDatos.formatearFechaParaBackend(v.fechaInicio, TipoFormatoFechaBackend.SOLO_FECHA)!,
      fechaFin: this.funcionesDatos.formatearFechaParaBackend(v.fechaFin, TipoFormatoFechaBackend.SOLO_FECHA)!,
      empresa,
      codigoAlterno: Number(v.codigoAlterno),
      acumulacion: Number(v.acumulacion),
      incluyeCentrosCosto: v.incluyeCentrosCosto,
      reporteDistribuido: v.reporteDistribuido,
      eliminarSaldosCero: v.eliminarSaldosCero,
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (!res || !res.exitoso) {
          this.errorMsg.set(res?.mensaje || 'Error al generar el balance');
          return;
        }
        this.idEjecucion.set(res.idEjecucion);
        this.totalRegistros.set(res.totalRegistros);
        this.fechaProceso.set(res.fechaProceso);
        this.cargarBalance(res.idEjecucion!);
      },
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('Error de comunicación con el servidor');
      }
    });
  }

  private cargarBalance(idEjecucion: number): void {
    this.balanceService.obtenerBalance(idEjecucion).subscribe({
      next: (data) => {
        const sorted = (data ?? []).slice().sort((a, b) =>
          (a.cuentaContable ?? '').localeCompare(b.cuentaContable ?? '')
        );
        this.balanceData.set(sorted);
        this.generado.set(true);
      },
      error: () => {
        this.errorMsg.set('Error al obtener los datos del balance');
        this.generado.set(false);
      }
    });
  }

  exportarBalanceCsv(): void {
    const data = this.balanceData();
    if (!data || data.length === 0) {
      this.snackBar.open('No hay datos del balance para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    const incluyeDebeHaber = this.mostrarDebeHaber();

    const rows = data.map((row) => {
      const registro: any = {
        cuentaContable: row.cuentaContable ?? '',
        nombreCuenta: row.nombreCuenta ?? '',
        nivel: row.nivel ?? '',
        saldoCuenta: this.formatearMontoCsv(row.saldoCuenta),
        valorActual: this.formatearMontoCsv(row.valorActual),
      };

      if (incluyeDebeHaber) {
        registro.valorDebe = this.formatearMontoCsv(row.valorDebe);
        registro.valorHaber = this.formatearMontoCsv(row.valorHaber);
      }

      return registro;
    });

    const filaTotales: any = {
      cuentaContable: 'TOTALES',
      nombreCuenta: '',
      nivel: '',
      saldoCuenta: this.formatearMontoCsv(this.totalSaldoAnterior()),
      valorActual: this.formatearMontoCsv(this.totalSaldoActual()),
    };

    if (incluyeDebeHaber) {
      filaTotales.valorDebe = this.formatearMontoCsv(this.totalDebe());
      filaTotales.valorHaber = this.formatearMontoCsv(this.totalHaber());
    }

    rows.push(filaTotales);

    const headers = ['N° Cuenta', 'Nombre', 'Nivel', 'Saldo Anterior'];
    const dataKeys = ['cuentaContable', 'nombreCuenta', 'nivel', 'saldoCuenta'];

    if (incluyeDebeHaber) {
      headers.push('Debe', 'Haber');
      dataKeys.push('valorDebe', 'valorHaber');
    }

    headers.push('Saldo Actual');
    dataKeys.push('valorActual');

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    this.exportService.exportToCSV(
      rows,
      `balance_general_${yyyy}${mm}${dd}_${hh}${min}`,
      headers,
      dataKeys
    );
  }

  onMostrarDebeHaberChange(checked: boolean): void {
    this.mostrarDebeHaber.set(checked);
  }

  private formatearMontoCsv(valor: number | null | undefined): string {
    const numero = Number(valor ?? 0);
    if (!Number.isFinite(numero)) {
      return '0.00';
    }
    return numero.toFixed(2);
  }

  // ── Cleanup ───────────────────────────────────────────────────
  formatFecha(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return fecha ?? '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  ngOnDestroy(): void {
    const id = this.idEjecucion();
    if (id) {
      this.balanceService.eliminarBalance(id).subscribe();
    }
  }
}

