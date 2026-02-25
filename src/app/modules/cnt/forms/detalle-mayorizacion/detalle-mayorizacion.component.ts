import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, ViewChild, computed, signal, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { Mayorizacion } from '../../model/mayorizacion';
import { DetalleMayorizacion } from '../../model/detalle-mayorizacion';
import { Periodo } from '../../model/periodo';
import { MayorizacionService } from '../../service/mayorizacion.service';
import { DetalleMayorizacionService } from '../../service/detalle-mayorizacion.service';
import { PeriodoService } from '../../service/periodo.service';
import { AppStateService } from '../../../../shared/services/app-state.service';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';

@Component({
  selector: 'app-detalle-mayorizacion',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialFormModule,
  ],
  templateUrl: './detalle-mayorizacion.component.html',
  styleUrl: './detalle-mayorizacion.component.scss',
})
export class DetalleMayorizacionComponent implements OnInit, AfterViewInit {

  @ViewChild('paginatorDetalle') paginatorDetalle!: MatPaginator;

  // ── Services ────────────────────────────────────────────────
  private mayorizacionService = inject(MayorizacionService);
  private detalleService      = inject(DetalleMayorizacionService);
  private periodoService      = inject(PeriodoService);
  private appState            = inject(AppStateService);
  private snackBar            = inject(MatSnackBar);
  private funcionesDatos      = inject(FuncionesDatosService);

  // ── Estado ──────────────────────────────────────────────────
  periodos                = signal<Periodo[]>([]);
  mayorizaciones          = signal<Mayorizacion[]>([]);
  mayorizacionesFiltradas = signal<Mayorizacion[]>([]);
  selectedMayorizacion    = signal<Mayorizacion | null>(null);

  detallesAll       = signal<DetalleMayorizacion[]>([]);
  detallesFiltrados = signal<DetalleMayorizacion[]>([]);
  detallesPage      = signal<DetalleMayorizacion[]>([]);

  loadingMayorizaciones = signal(false);
  loadingDetalles       = signal(false);
  errorMayorizaciones   = signal('');
  errorDetalles         = signal('');

  pageSize  = 20;
  pageIndex = 0;

  // ── Filtros maestro ─────────────────────────────────────────
  periodoDesdeCtrl = new FormControl<number | null>(null);
  periodoHastaCtrl = new FormControl<number | null>(null);
  fechaDesdeCtrl   = new FormControl<Date | null>(null);
  fechaHastaCtrl   = new FormControl<Date | null>(null);

  // ── Filtro detalle ───────────────────────────────────────────
  filtroDetalle = new FormControl('');

  // ── Columnas ─────────────────────────────────────────────────
  readonly colsDetalle: string[] = [
    'numeroCuenta',
    'nombreCuenta',
    'nivelCuenta',
    'saldoAnterior',
    'valorDebe',
    'valorHaber',
    'saldoActual',
  ];

  // ── Totales (computed) — solo nivel 1 para evitar doble conteo en árbol ──
  totalSaldoAnterior = computed(() =>
    this.detallesFiltrados().filter(d => d.nivelCuenta === 1)
      .reduce((s, d) => s + (d.saldoAnterior || 0), 0)
  );
  totalDebe = computed(() =>
    this.detallesFiltrados().filter(d => d.nivelCuenta === 1)
      .reduce((s, d) => s + (d.valorDebe || 0), 0)
  );
  totalHaber = computed(() =>
    this.detallesFiltrados().filter(d => d.nivelCuenta === 1)
      .reduce((s, d) => s + (d.valorHaber || 0), 0)
  );
  totalSaldoActual = computed(() =>
    this.detallesFiltrados().filter(d => d.nivelCuenta === 1)
      .reduce((s, d) => s + (d.saldoActual || 0), 0)
  );
  totalRegistrosDetalle = computed(() => this.detallesFiltrados().length);

  // ── Empresa ──────────────────────────────────────────────────
  private get idEmpresa(): number {
    return this.appState.getEmpresa()?.codigo
      ?? parseInt(localStorage.getItem('idSucursal') || '0', 10);
  }

  // ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.cargarPeriodos();
  }

  ngAfterViewInit(): void { /* paginatorDetalle se enlaza vía #paginatorDetalle */ }

  // ─────────────────────────────────────────────────────────────
  // Carga inicial de períodos
  // ─────────────────────────────────────────────────────────────
  cargarPeriodos(): void {
    this.periodoService.getAll().subscribe({
      next: (data) => {
        const sorted = (data || []).sort((a, b) => {
          if (a.anio !== b.anio) return a.anio - b.anio;
          return a.mes - b.mes;
        });
        this.periodos.set(sorted);
      },
      error: () => this.periodos.set([]),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Buscar mayorizaciones con los filtros aplicados
  // ─────────────────────────────────────────────────────────────
  buscarMayorizaciones(): void {
    this.loadingMayorizaciones.set(true);
    this.errorMayorizaciones.set('');
    this.selectedMayorizacion.set(null);
    this.limpiarDetalle();

    this.mayorizacionService.getAll().subscribe({
      next: (res) => {
        let lista: Mayorizacion[] = (Array.isArray(res) ? res : [])
          .filter(m => m?.periodo?.empresa?.codigo === this.idEmpresa);

        lista = this.aplicarFiltrosMaestro(lista);

        // Ordenar por fecha descendente
        lista.sort((a, b) => {
          const fa = this.funcionesDatos.convertirFechaDesdeBackend(a.fecha)?.getTime() ?? 0;
          const fb = this.funcionesDatos.convertirFechaDesdeBackend(b.fecha)?.getTime() ?? 0;
          return fb - fa;
        });

        this.mayorizaciones.set(lista);
        this.mayorizacionesFiltradas.set(lista);
        this.loadingMayorizaciones.set(false);
      },
      error: () => {
        this.errorMayorizaciones.set('Error al cargar mayorizaciones');
        this.mayorizaciones.set([]);
        this.mayorizacionesFiltradas.set([]);
        this.loadingMayorizaciones.set(false);
      },
    });
  }

  private aplicarFiltrosMaestro(lista: Mayorizacion[]): Mayorizacion[] {
    const periodoDesde = this.periodoDesdeCtrl.value;
    const periodoHasta = this.periodoHastaCtrl.value;
    const fechaDesde   = this.fechaDesdeCtrl.value;
    const fechaHasta   = this.fechaHastaCtrl.value;

    return lista.filter(m => {
      if (periodoDesde !== null && m.periodo && m.periodo.codigo < periodoDesde) return false;
      if (periodoHasta !== null && m.periodo && m.periodo.codigo > periodoHasta) return false;

      if (fechaDesde && m.fecha) {
        const fMyrz = this.funcionesDatos.convertirFechaDesdeBackend(m.fecha);
        if (fMyrz && fMyrz < new Date(fechaDesde)) return false;
      }
      if (fechaHasta && m.fecha) {
        const fMyrz = this.funcionesDatos.convertirFechaDesdeBackend(m.fecha);
        const hasta = new Date(fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        if (fMyrz && fMyrz > hasta) return false;
      }

      return true;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Seleccionar mayorizacion → cargar detalle
  // ─────────────────────────────────────────────────────────────
  seleccionarMayorizacion(m: Mayorizacion): void {
    if (this.selectedMayorizacion()?.codigo === m.codigo) return;
    this.selectedMayorizacion.set(m);
    this.cargarDetalle(m.codigo);
  }

  private cargarDetalle(idMayorizacion: number): void {
    this.loadingDetalles.set(true);
    this.errorDetalles.set('');
    this.filtroDetalle.setValue('', { emitEvent: false });
    this.pageIndex = 0;

    const criterios: DatosBusqueda[] = [];
    const dbMyrz = new DatosBusqueda();
    dbMyrz.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'mayorizacion',
      'codigo',
      idMayorizacion.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(dbMyrz);

    this.detalleService.selectByCriteria(criterios).subscribe({
      next: (res) => {
        const lista = Array.isArray(res) ? res : [];
        this.detallesAll.set(lista);
        this.detallesFiltrados.set(lista);
        this.actualizarPagina();
        this.loadingDetalles.set(false);
      },
      error: () => {
        this.errorDetalles.set('Error al cargar el detalle de mayorización');
        this.limpiarDetalle();
        this.loadingDetalles.set(false);
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Filtro texto en detalle
  // ─────────────────────────────────────────────────────────────
  aplicarFiltroDetalle(): void {
    const texto = (this.filtroDetalle.value || '').trim().toLowerCase();
    const base  = this.detallesAll();

    this.detallesFiltrados.set(
      !texto
        ? base
        : base.filter(d =>
            (d.numeroCuenta || '').toLowerCase().includes(texto) ||
            (d.nombreCuenta || '').toLowerCase().includes(texto)
          )
    );

    this.pageIndex = 0;
    this.actualizarPagina();
    if (this.paginatorDetalle) this.paginatorDetalle.firstPage();
  }

  limpiarFiltroDetalle(): void {
    this.filtroDetalle.setValue('');
    this.aplicarFiltroDetalle();
  }

  // ─────────────────────────────────────────────────────────────
  // Paginación local del detalle
  // ─────────────────────────────────────────────────────────────
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize  = event.pageSize;
    this.actualizarPagina();
  }

  private actualizarPagina(): void {
    const start = this.pageIndex * this.pageSize;
    this.detallesPage.set(this.detallesFiltrados().slice(start, start + this.pageSize));
  }

  // ─────────────────────────────────────────────────────────────
  // Utilidades
  // ─────────────────────────────────────────────────────────────
  limpiarFiltros(): void {
    this.periodoDesdeCtrl.reset();
    this.periodoHastaCtrl.reset();
    this.fechaDesdeCtrl.reset();
    this.fechaHastaCtrl.reset();
    this.mayorizaciones.set([]);
    this.mayorizacionesFiltradas.set([]);
    this.selectedMayorizacion.set(null);
    this.limpiarDetalle();
  }

  private limpiarDetalle(): void {
    this.detallesAll.set([]);
    this.detallesFiltrados.set([]);
    this.detallesPage.set([]);
    this.pageIndex = 0;
  }

  formatFecha(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return '—';
    return d.toLocaleDateString('es-EC', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  }

  periodoLabel(periodo: Periodo | null): string {
    if (!periodo) return '—';
    return `${periodo.nombre || ''} ${periodo.anio}`.trim();
  }
}
