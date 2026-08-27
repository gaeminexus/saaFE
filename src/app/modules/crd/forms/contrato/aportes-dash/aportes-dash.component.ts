import { Component, OnInit, computed, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { AporteService } from '../../../service/aporte.service';
import { EntidadService } from '../../../service/entidad.service';
import { TipoAporteService } from '../../../service/tipo-aporte.service';
import { ExportService } from '../../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { Entidad } from '../../../model/entidad';
import { TipoAporte } from '../../../model/tipo-aporte';
import { EstadoCuentaAportes, PeriodoEstadoCuentaAporte } from '../../../model/estado-cuenta-aportes';

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Clave única de una fila periodo+tipo, para trackBy y para el set de filas expandidas. */
function claveFila(p: PeriodoEstadoCuentaAporte): string {
  return `${p.periodo ?? 'SIN_PERIODO'}-${p.idTipoAporte}`;
}

@Component({
  selector: 'app-aportes-dash',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './aportes-dash.component.html',
  styleUrls: ['./aportes-dash.component.scss'],
})
export class AportesDashComponent implements OnInit {
  @ViewChild('dashContainer') dashContainer!: ElementRef;

  loading = signal<boolean>(false);
  error = signal<string>('');
  entidad = signal<Entidad | null>(null);
  tiposAporte = signal<TipoAporte[]>([]);
  estadoCuenta = signal<EstadoCuentaAportes | null>(null);
  filasExpandidas = signal<Set<string>>(new Set());
  isScrolled = signal<boolean>(false);

  codigoEntidad: number = 0;

  anios: number[] = [];
  meses = NOMBRES_MES.map((nombre, i) => ({ value: i + 1, nombre }));

  filtrosForm = new FormGroup({
    anioDesde: new FormControl<number | null>(null),
    mesDesde: new FormControl<number | null>(null),
    anioHasta: new FormControl<number | null>(null),
    mesHasta: new FormControl<number | null>(null),
    tipoAporte: new FormControl<number | null>(null),
  });

  /**
   * Espejo en signal del control `tipoAporte` del FormGroup. El filtro por tipo es del lado del
   * cliente (§4.2 no acepta `tipoAporte` como query param), y un `computed()` solo se invalida
   * cuando cambia un SIGNAL que leyó — leer `filtrosForm.value` directamente adentro de un
   * computed no crea esa dependencia y la lista se queda con el filtro viejo hasta que
   * `estadoCuenta` vuelva a cambiar por otra razón. Mismo defecto que el pedido 5 de devolución
   * de aportes, evitado acá desde el diseño.
   */
  private tipoAporteFiltro = signal<number | null>(null);

  /** Filas con periodo (excluye el bloque "SIN PERIODO"), filtradas por tipo si aplica. */
  filasConPeriodo = computed(() => {
    const estado = this.estadoCuenta();
    if (!estado) return [];
    const tipoFiltro = this.tipoAporteFiltro();
    return estado.periodos
      .filter((p) => p.periodo !== null)
      .filter((p) => !tipoFiltro || p.idTipoAporte === tipoFiltro)
      .sort((a, b) => (a.periodo! < b.periodo! ? 1 : a.periodo! > b.periodo! ? -1 : a.idTipoAporte - b.idTipoAporte));
  });

  /** Bloque aparte para los históricos sin devengo y los retiros de saldo. Nunca se mezcla arriba. */
  filasSinPeriodo = computed(() => {
    const estado = this.estadoCuenta();
    if (!estado) return [];
    const tipoFiltro = this.tipoAporteFiltro();
    return estado.periodos
      .filter((p) => p.periodo === null)
      .filter((p) => !tipoFiltro || p.idTipoAporte === tipoFiltro);
  });

  totalFaltante = computed(() => this.estadoCuenta()?.totalFaltante ?? 0);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private aporteService: AporteService,
    private entidadService: EntidadService,
    private tipoAporteService: TipoAporteService,
    private exportService: ExportService,
    private funcionesDatos: FuncionesDatosService
  ) {
    this.filtrosForm.get('tipoAporte')!.valueChanges.subscribe((valor) => this.tipoAporteFiltro.set(valor));
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.codigoEntidad = +params['codigoEntidad'];
      if (this.codigoEntidad) {
        this.generarAnios();
        this.inicializarFiltrosPorDefecto();
        this.cargarEntidad();
        this.cargarTiposAporte();
        this.cargarEstadoCuenta();
      }
    });
    this.setupScrollDetection();
  }

  generarAnios(): void {
    const anioActual = new Date().getFullYear();
    this.anios = Array.from({ length: 10 }, (_, i) => anioActual - i + 1).reverse();
  }

  /** Por defecto, los últimos 12 meses (incluye el mes en curso). */
  private inicializarFiltrosPorDefecto(): void {
    const hoy = new Date();
    const hasta = { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
    const desdeDate = new Date(hoy.getFullYear(), hoy.getMonth() - 11, 1);
    const desde = { anio: desdeDate.getFullYear(), mes: desdeDate.getMonth() + 1 };

    this.filtrosForm.patchValue({
      anioDesde: desde.anio,
      mesDesde: desde.mes,
      anioHasta: hasta.anio,
      mesHasta: hasta.mes,
    });
  }

  cargarEntidad(): void {
    this.entidadService.getById(this.codigoEntidad.toString()).subscribe({
      next: (data) => this.entidad.set(data),
      error: (err) => {
        console.error('Error al cargar entidad:', err);
        this.error.set('Error al cargar información de la entidad');
      },
    });
  }

  cargarTiposAporte(): void {
    this.tipoAporteService.getAll().subscribe({
      next: (data) => this.tiposAporte.set(data || []),
      error: (err) => console.error('Error al cargar tipos de aporte:', err),
    });
  }

  cargarEstadoCuenta(): void {
    const { anioDesde, mesDesde, anioHasta, mesHasta } = this.filtrosForm.value;
    if (!anioDesde || !mesDesde || !anioHasta || !mesHasta) return;

    const desde = `${anioDesde}-${String(mesDesde).padStart(2, '0')}`;
    const hasta = `${anioHasta}-${String(mesHasta).padStart(2, '0')}`;

    this.loading.set(true);
    this.error.set('');

    this.aporteService.obtenerEstadoCuenta(this.codigoEntidad, desde, hasta).subscribe({
      next: (data) => {
        this.estadoCuenta.set(data);
        this.filasExpandidas.set(new Set());
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar el estado de cuenta de aportes:', err);
        this.error.set(err?.mensaje || 'No se pudo cargar el estado de cuenta de aportes');
        this.loading.set(false);
      },
    });
  }

  aplicarFiltros(): void {
    this.cargarEstadoCuenta();
  }

  limpiarFiltros(): void {
    this.filtrosForm.patchValue({ tipoAporte: null });
    this.inicializarFiltrosPorDefecto();
    this.cargarEstadoCuenta();
  }

  volver(): void {
    this.router.navigate(['/menucontabilidad/menucreditos/contrato-dash']);
  }

  // ── Presentación de periodo/estado ──────────────────────────────────

  claveFila = claveFila;

  toggleFila(p: PeriodoEstadoCuentaAporte): void {
    const clave = claveFila(p);
    const set = new Set(this.filasExpandidas());
    if (set.has(clave)) {
      set.delete(clave);
    } else {
      set.add(clave);
    }
    this.filasExpandidas.set(set);
  }

  estaExpandida(p: PeriodoEstadoCuentaAporte): boolean {
    return this.filasExpandidas().has(claveFila(p));
  }

  /** "2026-07" → "Julio 2026". */
  nombrePeriodo(periodo: string | null): string {
    if (!periodo) return 'Sin periodo';
    const [anio, mes] = periodo.split('-').map(Number);
    return `${NOMBRES_MES[mes - 1] || periodo} ${anio}`;
  }

  claseEstado(estado: string): string {
    switch (estado) {
      case 'COMPLETO':
        return 'estado-completo';
      case 'PARCIAL':
        return 'estado-parcial';
      case 'SIN APORTE':
        return 'estado-sin-aporte';
      case 'ANTICIPADO':
        return 'estado-anticipado';
      default:
        return 'estado-sin-periodo';
    }
  }

  iconoEstado(estado: string): string {
    switch (estado) {
      case 'COMPLETO':
        return 'check_circle';
      case 'PARCIAL':
        return 'error_outline';
      case 'SIN APORTE':
        return 'cancel';
      case 'ANTICIPADO':
        return 'schedule_send';
      default:
        return 'history';
    }
  }

  /**
   * Indica si la fecha de cobro cayó fuera del mes de periodo, para el aviso discreto del
   * detalle ("cobrado en agosto 2026"). `null` cuando coincide o cuando el periodo es null.
   */
  indicadorCobroFueraDePeriodo(periodo: string | null, fechaTransaccion: string | number[]): string | null {
    if (!periodo) return null;
    const fecha = this.convertirFecha(fechaTransaccion);
    if (!fecha) return null;
    const periodoCobro = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    if (periodoCobro === periodo) return null;
    return `cobrado en ${this.nombrePeriodo(periodoCobro).toLowerCase()}`;
  }

  formatearFecha(fecha: unknown): string {
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA) || '—';
  }

  private convertirFecha(fecha: string | number[] | null | undefined): Date | null {
    if (!fecha) return null;
    if (Array.isArray(fecha)) {
      const [year, month, day] = fecha;
      return new Date(year, (month ?? 1) - 1, day ?? 1);
    }
    const limpia = String(fecha).replace(/\[.*?\]/, '');
    const d = new Date(limpia.includes('T') ? limpia : limpia + 'T12:00:00');
    return isNaN(d.getTime()) ? null : d;
  }

  // ── Exportación ──────────────────────────────────────────────────────

  exportarCSV(): void {
    const filas = this.filasConPeriodo();
    const rows = filas.map((p) => ({
      Periodo: this.nombrePeriodo(p.periodo),
      Tipo: p.nombreTipoAporte,
      Esperado: p.esperado,
      Aportado: p.aportado,
      Faltante: p.faltante,
      Estado: p.estado,
    }));
    const headers = ['Periodo', 'Tipo', 'Esperado', 'Aportado', 'Faltante', 'Estado'];
    const filename = `estado-cuenta-aportes-entidad-${this.codigoEntidad}`;
    this.exportService.exportToCSV(rows, filename, headers, headers);
  }

  exportarPDF(): void {
    const filas = this.filasConPeriodo();
    const rows = filas.map((p) => ({
      periodo: this.nombrePeriodo(p.periodo),
      tipo: p.nombreTipoAporte,
      esperado: (p.esperado || 0).toFixed(2),
      aportado: (p.aportado || 0).toFixed(2),
      faltante: (p.faltante || 0).toFixed(2),
      estado: p.estado,
    }));
    const headers = ['Periodo', 'Tipo', 'Esperado', 'Aportado', 'Faltante', 'Estado'];
    const dataKeys = ['periodo', 'tipo', 'esperado', 'aportado', 'faltante', 'estado'];
    const titulo = `Estado de cuenta de aportes - ${this.entidad()?.razonSocial || 'Entidad'}`;
    const filename = `estado-cuenta-aportes-entidad-${this.codigoEntidad}`;
    this.exportService.exportToPDF(rows, filename, titulo, headers, dataKeys);
  }

  // ── Scroll ─────────────────────────────────────────────────────────

  private setupScrollDetection(): void {
    setTimeout(() => {
      if (this.dashContainer) {
        this.dashContainer.nativeElement.addEventListener('scroll', () => {
          this.isScrolled.set(this.dashContainer.nativeElement.scrollTop > 100);
        });
      }
    }, 100);
  }

  scrollToTop(): void {
    this.dashContainer?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
