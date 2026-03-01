import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../shared/services/app-state.service';
import { TemporalReporte } from '../../model/temporal-reporte';
import { ReporteContable } from '../../model/reporte-contable';
import { ReporteBalanceService } from '../../service/reporte-balance.service';
import { ReporteContableService } from '../../service/reporte-contable.service';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../shared/services/funciones-datos.service';
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

  // ── Catálogos ────────────────────────────────────────────────
  reportes = signal<ReporteContable[]>([]);

  // ── Estado ──────────────────────────────────────────────────
  loading       = signal(false);
  errorMsg      = signal('');
  generado      = signal(false);

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
  readonly colsBalance = [
    'cuentaContable', 'nombreCuenta', 'nivel',
    'saldoCuenta', 'valorDebe', 'valorHaber', 'valorActual'
  ];

  // ── Formulario ───────────────────────────────────────────────
  form!: FormGroup;

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

