import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ExportService } from '../../../../../shared/services/export.service';
import { leerUsuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { Filial } from '../../../model/filial';
import { Producto } from '../../../model/producto';
import {
  ESTADOS_CANCELACION,
  FORMAS_CANCELACION,
  FiltroPrestamosCancelados,
  PrestamoCanceladoFila,
  ReportePrestamosCancelados,
} from '../../../model/prestamo-cancelado';
import { CAMPOS_PRESTAMO_CANCELADO } from '../../../model/prestamo-cancelado-campos';
import { FilialService } from '../../../service/filial.service';
import { PrestamoCanceladoService } from '../../../service/prestamo-cancelado.service';
import { ProductoService } from '../../../service/producto.service';
import { DetallePrestamoCanceladoDialogComponent } from './detalle-prestamo-cancelado-dialog.component';

/** `yyyy-MM-dd` en hora local (nunca `toISOString()`, que convierte a UTC y corre el día). */
function aFechaIso(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function normalizar(texto: unknown): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Reporte de préstamos cancelados: pantalla, PDF y CSV.
 * Contrato: docs/crd/API-REPORTE-PRESTAMOS-CANCELADOS.md (§2, §5, §6 y §8).
 */
@Component({
  selector: 'app-reporte-prestamos-cancelados',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './reporte-prestamos-cancelados.component.html',
  styleUrls: ['./reporte-prestamos-cancelados.component.scss'],
})
export class ReportePrestamosCanceladosComponent implements OnInit {
  private readonly servicio = inject(PrestamoCanceladoService);
  private readonly productoService = inject(ProductoService);
  private readonly filialService = inject(FilialService);
  private readonly exportService = inject(ExportService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  @ViewChild(MatPaginator) set paginator(p: MatPaginator) {
    if (p) this.dataSource.paginator = p;
  }
  @ViewChild(MatSort) set sort(s: MatSort) {
    if (s) this.dataSource.sort = s;
  }

  readonly estados = ESTADOS_CANCELACION;
  readonly formas = FORMAS_CANCELACION;

  loading = signal(false);
  generandoPdf = signal(false);
  error = signal('');
  busquedaRealizada = signal(false);
  reporte = signal<ReportePrestamosCancelados | null>(null);

  /** Filtros con los que se hizo la última consulta: PDF y CSV usan estos, no lo que se esté editando. */
  private filtroConsultado: FiltroPrestamosCancelados | null = null;

  productos: Producto[] = [];
  filiales: Filial[] = [];
  productosFiltrados: Producto[] = [];
  filialesFiltradas: Filial[] = [];

  displayedColumns = [
    'fechaCancelacion', 'numeroOperacion', 'cedula', 'nombreSocio', 'producto', 'estado', 'formaDescripcion',
    'canal', 'montoSolicitado', 'totalPagado', 'totalCapitalPagado', 'totalInteresPagado', 'totalMoraPagada',
    'valorCondonado', 'prestamoNuevo', 'acciones',
  ];

  dataSource = new MatTableDataSource<PrestamoCanceladoFila>([]);

  filtrosForm = new FormGroup({
    fechaDesde: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    fechaHasta: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    producto: new FormControl<string | Producto | null>(null),
    filial: new FormControl<string | Filial | null>(null),
    estados: new FormControl<number[]>(this.estados.map((e) => e.codigo), { nonNullable: true }),
    formas: new FormControl<string[]>(this.formas.map((f) => f.codigo), { nonNullable: true }),
  });

  ngOnInit(): void {
    this.establecerMesEnCurso();

    // Ordenar por la columna sintética «Préstamo nuevo» = N° de operación del nuevo.
    this.dataSource.sortingDataAccessor = (fila, columna) => {
      const valor = columna === 'prestamoNuevo' ? fila.numeroOperacionNuevo : (fila as any)[columna];
      return valor ?? '';
    };

    this.productoService.getAll().subscribe((lista) => {
      this.productos = lista ?? [];
      this.productosFiltrados = this.productos;
    });
    this.filialService.getAll().subscribe((lista) => {
      this.filiales = lista ?? [];
      this.filialesFiltradas = this.filiales;
    });

    // Combos con búsqueda por al menos dos campos (CLAUDE.md): producto → nombre, código SBS y código Petro;
    // filial → nombre y código alterno.
    this.filtrosForm.controls.producto.valueChanges.subscribe((v) => {
      const t = normalizar(typeof v === 'string' ? v : '');
      this.productosFiltrados = this.productos.filter(
        (p) => !t || normalizar(p.nombre).includes(t) || normalizar(p.codigoSBS).includes(t) || normalizar(p.codigoPetro).includes(t),
      );
    });
    this.filtrosForm.controls.filial.valueChanges.subscribe((v) => {
      const t = normalizar(typeof v === 'string' ? v : '');
      this.filialesFiltradas = this.filiales.filter((f) => !t || normalizar(f.nombre).includes(t) || normalizar(f.codigoAlterno).includes(t));
    });
  }

  mostrarProducto = (p: Producto | string | null): string => (p && typeof p === 'object' ? p.nombre : (p ?? ''));
  mostrarFilial = (f: Filial | string | null): string => (f && typeof f === 'object' ? f.nombre : (f ?? ''));

  private establecerMesEnCurso(): void {
    const hoy = new Date();
    this.filtrosForm.patchValue({
      fechaDesde: aFechaIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
      fechaHasta: aFechaIso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)),
    });
  }

  limpiar(): void {
    this.establecerMesEnCurso();
    this.filtrosForm.patchValue({
      producto: null,
      filial: null,
      estados: this.estados.map((e) => e.codigo),
      formas: this.formas.map((f) => f.codigo),
    });
    this.reporte.set(null);
    this.dataSource.data = [];
    this.filtroConsultado = null;
    this.busquedaRealizada.set(false);
    this.error.set('');
  }

  /** Arma el cuerpo del contrato §2.1. Estados/formas completos se mandan como null (= todos). */
  private construirFiltro(): FiltroPrestamosCancelados | null {
    const v = this.filtrosForm.getRawValue();
    if (!v.fechaDesde || !v.fechaHasta) {
      this.error.set('Debe indicar fecha desde y fecha hasta.');
      return null;
    }
    if (v.fechaDesde > v.fechaHasta) {
      this.error.set('La fecha desde no puede ser mayor que la fecha hasta.');
      return null;
    }
    const producto = typeof v.producto === 'object' && v.producto ? v.producto : null;
    const filial = typeof v.filial === 'object' && v.filial ? v.filial : null;
    return {
      fechaDesde: v.fechaDesde,
      fechaHasta: v.fechaHasta,
      idProducto: producto ? producto.codigo : null,
      idFilial: filial ? filial.codigo : null,
      estados: v.estados.length && v.estados.length < this.estados.length ? v.estados : null,
      formas: v.formas.length && v.formas.length < this.formas.length ? v.formas : null,
      usuario: leerUsuarioSesion(),
    };
  }

  consultar(): void {
    this.error.set('');
    const filtro = this.construirFiltro();
    if (!filtro) return;

    this.loading.set(true);
    this.servicio.consultar(filtro).subscribe({
      next: (r) => {
        this.reporte.set(r);
        this.dataSource.data = r.filas ?? [];
        this.filtroConsultado = filtro;
        this.busquedaRealizada.set(true);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.reporte.set(null);
        this.dataSource.data = [];
        this.filtroConsultado = null;
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  verDetalle(fila: PrestamoCanceladoFila): void {
    this.dialog.open(DetallePrestamoCanceladoDialogComponent, { data: fila, maxWidth: '95vw' });
  }

  get hayResultado(): boolean {
    return (this.reporte()?.filas?.length ?? 0) > 0;
  }

  descargarPdf(): void {
    if (!this.filtroConsultado) return;
    const filtro = { ...this.filtroConsultado, usuario: leerUsuarioSesion() };
    this.generandoPdf.set(true);
    this.servicio.pdf(filtro).subscribe({
      next: (blob) => {
        this.descargarBlob(blob, `prestamos-cancelados-${filtro.fechaDesde}-a-${filtro.fechaHasta}.pdf`);
        this.generandoPdf.set(false);
      },
      error: (e: Error) => {
        this.generandoPdf.set(false);
        this.snackBar.open(e.message, 'Cerrar', { duration: 8000 });
      },
    });
  }

  private descargarBlob(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.style.visibility = 'hidden';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * CSV del §6: las 56 columnas de §5 en su orden, sin filas previas, delimitador ';'.
   * Los valores se convierten a texto aquí porque `ExportService.formatCSVValue` escribe los números con
   * punto decimal: Double → coma decimal, 2 decimales, sin separador de miles; Long → sin decimales; null → ''.
   */
  exportarCsv(): void {
    const r = this.reporte();
    const filtro = this.filtroConsultado;
    if (!r || !filtro || !r.filas?.length) return;

    const filas = r.filas.map((fila) => {
      const salida: Record<string, string> = {};
      for (const campo of CAMPOS_PRESTAMO_CANCELADO) {
        const v = fila[campo.clave];
        if (v === null || v === undefined) {
          salida[campo.clave] = '';
        } else if (campo.tipo === 'monto') {
          salida[campo.clave] = Number(v).toFixed(2).replace('.', ',');
        } else if (campo.tipo === 'entero') {
          salida[campo.clave] = String(Math.trunc(Number(v)));
        } else {
          salida[campo.clave] = String(v);
        }
      }
      return salida;
    });

    this.exportService.exportToCSV(
      filas,
      `prestamos-cancelados-${filtro.fechaDesde}-a-${filtro.fechaHasta}`,
      CAMPOS_PRESTAMO_CANCELADO.map((c) => c.encabezado),
      CAMPOS_PRESTAMO_CANCELADO.map((c) => c.clave),
      { delimiter: ';' },
    );
  }
}
