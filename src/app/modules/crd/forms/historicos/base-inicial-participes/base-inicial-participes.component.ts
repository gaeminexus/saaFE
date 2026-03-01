import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, computed, signal, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';

import { BaseInicialParticipes } from '../../../model/base-inicial-participes';
import { BaseInicialParticipesService } from '../../../service/base-inicial-participes.service';
import { ExportService } from '../../../../../shared/services/export.service';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';

@Component({
  selector: 'app-base-inicial-participes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './base-inicial-participes.component.html',
  styleUrl: './base-inicial-participes.component.scss',
})
export class BaseInicialParticipesComponent implements OnInit {

  @ViewChild('paginator') paginator!: MatPaginator;

  private service      = inject(BaseInicialParticipesService);
  private exportService = inject(ExportService);
  private router       = inject(Router);
  private snackBar     = inject(MatSnackBar);

  // ── Estado ──────────────────────────────────────────────────
  loading    = signal(false);
  errorMsg   = signal('');
  buscado    = signal(false);

  registrosAll      = signal<BaseInicialParticipes[]>([]);
  registrosFiltrados = signal<BaseInicialParticipes[]>([]);
  registrosPage     = signal<BaseInicialParticipes[]>([]);

  pageSize  = 15;
  pageIndex = 0;

  // ── Controles de filtro ──────────────────────────────────────
  nombreCtrl = new FormControl('');
  cedulaCtrl = new FormControl('');
  idSaaCtrl  = new FormControl<number | null>(null);

  // ── Columnas ─────────────────────────────────────────────────
  readonly cols: string[] = [
    'idSaa', 'cedula', 'nombre',
    'cesantiaPatronal', 'cesantiaPersonal', 'cesantiaRetiroVoluntario',
    'jubilacionPatronal', 'jubilacionPersonal', 'jubilacionRetiroVoluntario',
    'pensionComplementaria',
    'totalGeneral',
    'acciones',
  ];

  // ── Totales (computed) ────────────────────────────────────────
  totalGeneral = computed(() =>
    this.registrosFiltrados().reduce((s, r) => s + (r.totalGeneral || 0), 0)
  );
  totalCesantia = computed(() =>
    this.registrosFiltrados().reduce(
      (s, r) => s + (r.cesantiaPatronal || 0) + (r.cesantiaPersonal || 0), 0
    )
  );
  totalJubilacion = computed(() =>
    this.registrosFiltrados().reduce(
      (s, r) => s + (r.jubilacionPatronal || 0) + (r.jubilacionPersonal || 0), 0
    )
  );
  totalRegistros = computed(() => this.registrosFiltrados().length);

  // ─────────────────────────────────────────────────────────────
  ngOnInit(): void {}

  // ─────────────────────────────────────────────────────────────
  // Buscar
  // ─────────────────────────────────────────────────────────────
  buscar(): void {
    const nombre = this.nombreCtrl.value?.trim() || '';
    const cedula = this.cedulaCtrl.value?.trim() || '';
    const idSaa  = this.idSaaCtrl.value;

    const hayFiltros = nombre || cedula || idSaa !== null;

    if (hayFiltros) {
      this.buscarConCriterios(nombre, cedula, idSaa);
    } else {
      this.cargarTodos();
    }
  }

  private cargarTodos(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.buscado.set(false);

    this.service.getAll().subscribe({
      next: (res) => {
        const lista = Array.isArray(res) ? res : [];
        this.registrosAll.set(lista);
        this.registrosFiltrados.set(lista);
        this.pageIndex = 0;
        this.actualizarPagina();
        this.loading.set(false);
        this.buscado.set(true);
      },
      error: () => {
        this.errorMsg.set('Error al cargar registros');
        this.registrosAll.set([]);
        this.registrosFiltrados.set([]);
        this.registrosPage.set([]);
        this.loading.set(false);
        this.buscado.set(true);
      },
    });
  }

  private buscarConCriterios(nombre: string, cedula: string, idSaa: number | null): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.buscado.set(false);

    const criterios: DatosBusqueda[] = [];

    if (nombre) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(TipoDatosBusqueda.STRING, 'nombre', nombre, TipoComandosBusqueda.LIKE);
      criterios.push(db);
    }

    if (cedula) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(TipoDatosBusqueda.STRING, 'cedula', cedula, TipoComandosBusqueda.LIKE);
      criterios.push(db);
    }

    if (idSaa !== null) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'idSaa', idSaa.toString(), TipoComandosBusqueda.IGUAL);
      criterios.push(db);
    }

    this.service.selectByCriteria(criterios).subscribe({
      next: (res) => {
        const lista = Array.isArray(res) ? res : [];
        this.registrosAll.set(lista);
        this.registrosFiltrados.set(lista);
        this.pageIndex = 0;
        this.actualizarPagina();
        this.loading.set(false);
        this.buscado.set(true);
      },
      error: () => {
        // Si selectByCriteria falla con 0 resultados, normalizar a lista vacía
        this.registrosAll.set([]);
        this.registrosFiltrados.set([]);
        this.registrosPage.set([]);
        this.loading.set(false);
        this.buscado.set(true);
      },
    });
  }

  limpiar(): void {
    this.nombreCtrl.reset();
    this.cedulaCtrl.reset();
    this.idSaaCtrl.reset();
    this.registrosAll.set([]);
    this.registrosFiltrados.set([]);
    this.registrosPage.set([]);
    this.buscado.set(false);
    this.errorMsg.set('');
  }

  // ─────────────────────────────────────────────────────────────
  // Paginación local
  // ─────────────────────────────────────────────────────────────
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize  = event.pageSize;
    this.actualizarPagina();
  }

  private actualizarPagina(): void {
    const start = this.pageIndex * this.pageSize;
    this.registrosPage.set(this.registrosFiltrados().slice(start, start + this.pageSize));
  }

  // ─────────────────────────────────────────────────────────────
  // Navegación a DatosSaa
  // ─────────────────────────────────────────────────────────────
  irADatosSaa(registro: BaseInicialParticipes): void {
    this.router.navigate(['/menucreditos/participe-dash'], {
      queryParams: { codigoEntidad: registro.idSaa, from: 'base-inicial-participes' },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Exportar
  // ─────────────────────────────────────────────────────────────
  private readonly exportHeaders = [
    'ID SAA', 'Nombre', 'Cédula', 'Cesantía Patronal', 'Cesantía Personal',
    'Cesantía Retiro Vol.', 'Jubilación Patronal', 'Jubilación Personal',
    'Jubilación Retiro Vol.', 'Pensión Complementaria',
    'Rend. Ces. Patronal', 'Rend. Ces. Personal',
    'Rend. Jub. Patronal', 'Rend. Jub. Personal', 'Total General',
  ];
  private readonly exportKeys = [
    'idSaa', 'nombre', 'cedula', 'cesantiaPatronal', 'cesantiaPersonal',
    'cesantiaRetiroVoluntario', 'jubilacionPatronal', 'jubilacionPersonal',
    'jubilacionRetiroVoluntario', 'pensionComplementaria',
    'rendimientoCesantiaPatronal', 'rendimientoCesantiaPersonal',
    'rendimientoJubilacionPatronal', 'rendimientoJubilacionPersonal', 'totalGeneral',
  ];

  exportarCSV(): void {
    const data = this.registrosFiltrados();
    if (!data.length) { this.mostrarMensaje('No hay datos para exportar', 'warn'); return; }
    this.exportService.exportToCSV(data, 'base-inicial-participes', this.exportHeaders, this.exportKeys);
  }

  exportarPDF(): void {
    const data = this.registrosFiltrados();
    if (!data.length) { this.mostrarMensaje('No hay datos para exportar', 'warn'); return; }
    this.exportService.exportToPDF(
      data, 'base-inicial-participes', 'Base Inicial de Partícipes',
      this.exportHeaders, this.exportKeys
    );
  }

  // Utilidades
  private mostrarMensaje(msg: string, tipo: 'success' | 'error' | 'warn' = 'error'): void {
    this.snackBar.open(msg, 'Cerrar', {
      duration: 4000,
      panelClass: [`snackbar-${tipo}`],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}

