import { CommonModule } from '@angular/common';
import { AfterViewChecked, AfterViewInit, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { ExportService } from '../../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { Periodo } from '../../../../cnt/model/periodo';
import { PeriodoService } from '../../../../cnt/service/periodo.service';
import { CargaArchivoTxtService, ResumenCargaTxt } from '../../../service/carga-archivo-txt.service';

/**
 * Consulta de cargas (ítem 13, docs/cxp/API-CARGAS-TXT-BANDEJA-ELECTRONICA.md §3.2): más de 300
 * cargas acumuladas, imposibles de revisar con `getByEmpresa` (sin filtro ni tope). `GET
 * /crtx/buscar` es el reemplazo — un 404 (WAR viejo) se muestra tal cual, nunca como lista vacía.
 */
@Component({
  selector: 'app-consulta-cargas',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './consulta-cargas.component.html',
  styleUrl: './consulta-cargas.component.scss',
})
export class ConsultaCargasComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  private cargaService = inject(CargaArchivoTxtService);
  private periodoService = inject(PeriodoService);
  private exportService = inject(ExportService);
  private funcionesDatosS = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  private get idEmpresa(): number { return Number(localStorage.getItem('empresaCodigo') || localStorage.getItem('empresaId') || 1); }

  periodos = signal<Periodo[]>([]);

  // Filtros — por defecto, el mes en curso
  filtroDesde = '';
  filtroHasta = '';
  filtroPeriodo: number | null = null;
  filtroNombreArchivo = '';
  filtroEstado: number | null = null;

  cargando = signal(false);
  error = signal('');
  dataSource = new MatTableDataSource<ResumenCargaTxt>([]);
  readonly columnas = ['fechaCarga', 'nombreArchivo', 'periodo', 'usuario', 'totalLeidos', 'nuevos', 'duplicados', 'novedades', 'estado', 'acciones'];

  constructor() {
    this.dataSource.sortingDataAccessor = (row: ResumenCargaTxt, property: string): string | number => {
      switch (property) {
        case 'fechaCarga': return row.fechaCarga || '';
        case 'periodo': return row.periodo?.nombre || '';
        default: return (row as any)[property] ?? '';
      }
    };
  }

  ngOnInit(): void {
    this.setRangoMesActual();
    this.cargarPeriodos();
    this.buscar();
  }

  ngAfterViewInit(): void {
    this.conectarPaginadorYOrden();
  }

  /**
   * Idempotente (docs/logica-negocio/REGISTRO-RESERVAS-EQUIPOS.md §9): el paginador y el sort
   * viven detrás de un `@if (cargando()) {...} @else {...}` que arranca en `true`, así que el
   * primer `@ViewChild` en `ngAfterViewInit` resuelve `undefined`. Se reintenta en
   * `ngAfterViewChecked`, y solo se reasigna cuando la referencia realmente cambió.
   */
  ngAfterViewChecked(): void {
    this.conectarPaginadorYOrden();
  }

  private conectarPaginadorYOrden(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort && this.dataSource.sort !== this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  private setRangoMesActual(): void {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    this.filtroDesde = this.aFechaISO(primerDia);
    this.filtroHasta = this.aFechaISO(ultimoDia);
  }

  private aFechaISO(fecha: Date): string {
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private cargarPeriodos(): void {
    this.periodoService.getAll().subscribe({
      next: (data) => {
        const sorted = (data || []).sort((a, b) => b.anio !== a.anio ? b.anio - a.anio : b.mes - a.mes);
        this.periodos.set(sorted);
      },
      error: () => this.periodos.set([]),
    });
  }

  buscar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.cargaService.buscar({
      idEmpresa: this.idEmpresa,
      desde: this.filtroDesde || undefined,
      hasta: this.filtroHasta || undefined,
      idPeriodo: this.filtroPeriodo ?? undefined,
      nombreArchivo: this.filtroNombreArchivo.trim() || undefined,
      estado: this.filtroEstado ?? undefined,
    }).subscribe({
      next: (data) => {
        this.dataSource.data = data || [];
        this.cargando.set(false);
      },
      error: (err) => {
        // 404 (WAR viejo, /crtx/buscar todavía no existe del otro lado) u otro error: se muestra
        // tal cual, nunca como si simplemente no hubiera cargas.
        this.dataSource.data = [];
        this.cargando.set(false);
        this.error.set(mensajeDeError(err, 'No se pudieron consultar las cargas'));
      },
    });
  }

  limpiarFiltros(): void {
    this.setRangoMesActual();
    this.filtroPeriodo = null;
    this.filtroNombreArchivo = '';
    this.filtroEstado = null;
    this.buscar();
  }

  verDocumentos(fila: ResumenCargaTxt): void {
    this.router.navigate(['/menucuentaxpagar/procesos/bandeja-electronica'], {
      queryParams: {
        idCargaTxt: fila.idCarga,
        idPeriodo: fila.periodo?.idPeriodo,
      },
    });
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '—';
    const d = this.funcionesDatosS.convertirFechaDesdeBackend(fecha);
    if (!d) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  exportarCSV(): void {
    const filas = this.dataSource.data;
    if (!filas.length) {
      this.snackBar.open('No hay cargas para exportar', 'Cerrar', { duration: 3500 });
      return;
    }
    const plano = filas.map((f) => ({
      fecha: this.formatearFecha(f.fechaCarga),
      archivo: f.nombreArchivo,
      periodo: f.periodo?.nombre || '',
      usuario: f.usuario || '',
      leidos: f.totalLeidos,
      nuevos: f.nuevos,
      duplicados: f.duplicados,
      novedades: f.novedades,
      estado: f.estadoTexto,
    }));
    const headers = ['Fecha', 'Archivo', 'Período', 'Usuario', 'Leídos', 'Nuevos', 'Duplicados', 'Novedades', 'Estado'];
    const keys = ['fecha', 'archivo', 'periodo', 'usuario', 'leidos', 'nuevos', 'duplicados', 'novedades', 'estado'];
    this.exportService.exportToCSV(plano, `consulta_cargas_txt_${this.fechaArchivo()}`, headers, keys);
    this.snackBar.open('Exportación CSV iniciada', 'Cerrar', { duration: 2500 });
  }

  private fechaArchivo(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }
}
