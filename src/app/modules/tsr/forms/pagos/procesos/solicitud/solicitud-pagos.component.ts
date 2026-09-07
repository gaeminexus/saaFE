import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ViewChild, computed, effect, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

interface SolicitudPagoRow {
  numero: string;
  proveedor: string;
  documento: string;
  fecha: string; // ISO
  valor: number;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'GENERADO';
}

@Component({
  selector: 'app-solicitud-pagos',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatCheckboxModule,
    MatSortModule,
    MatPaginatorModule,
  ],
  templateUrl: './solicitud-pagos.component.html',
  styleUrls: ['./solicitud-pagos.component.scss'],
})
export class SolicitudPagosComponent implements AfterViewChecked {
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  // Filtros
  fechaInicio = signal<Date | null>(null);
  fechaFin = signal<Date | null>(null);
  proveedor = signal<string>('');
  estado = signal<'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'GENERADO' | ''>('');
  /** Buscador rápido: filtra por número, proveedor, documento o estado a la vez. */
  busqueda = signal<string>('');

  readonly displayedColumns = ['select', 'numero', 'proveedor', 'documento', 'fecha', 'valor', 'estado'];

  readonly dataSource = new MatTableDataSource<SolicitudPagoRow>([]);
  @ViewChild(MatSort) sort?: MatSort;
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  constructor() {
    effect(() => { this.dataSource.data = this.filtered(); });
    // Orden inicial: por fecha, más reciente primero — el criterio natural de una bandeja de solicitudes.
    this.dataSource.sortingDataAccessor = (row, property) => {
      switch (property) {
        case 'fecha': return new Date(row.fecha).getTime();
        case 'valor': return row.valor;
        default: return (row as any)[property];
      }
    };
  }

  ngAfterViewChecked(): void {
    if (this.sort && this.dataSource.sort !== this.sort) {
      this.dataSource.sort = this.sort;
      this.sort.sort({ id: 'fecha', start: 'desc', disableClear: false });
    }
    if (this.paginator && this.dataSource.paginator !== this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }

  rows = signal<SolicitudPagoRow[]>([
    {
      numero: 'SP-001',
      proveedor: 'Proveedor A',
      documento: 'FAC-100',
      fecha: new Date().toISOString().slice(0, 10),
      valor: 500,
      estado: 'PENDIENTE',
    },
    {
      numero: 'SP-002',
      proveedor: 'Proveedor B',
      documento: 'FAC-101',
      fecha: new Date().toISOString().slice(0, 10),
      valor: 1200,
      estado: 'APROBADO',
    },
  ]);

  filtered = computed(() => {
    const fi = this.fechaInicio();
    const ff = this.fechaFin();
    const prov = this.proveedor().toLowerCase();
    const es = this.estado();
    const q = this.busqueda().trim().toLowerCase();
    return this.rows().filter((r) => {
      const inRange =
        (!fi || r.fecha >= fi.toISOString().slice(0, 10)) &&
        (!ff || r.fecha <= ff.toISOString().slice(0, 10));
      const matchProv = !prov || r.proveedor.toLowerCase().includes(prov);
      const matchEst = !es || r.estado === es;
      const matchBusqueda =
        !q ||
        [r.numero, r.proveedor, r.documento, r.estado].some((v) => v.toLowerCase().includes(q));
      return inRange && matchProv && matchEst && matchBusqueda;
    });
  });

  /** Set por `numero` (identificador natural de la fila), no por índice: con orden y
   *  paginación el índice de una fila dentro de `filtered()` deja de ser estable. */
  selected = signal<Set<string>>(new Set());
  selectedCount = computed(() => this.selected().size);
  selectedTotal = computed(() => {
    const sel = this.selected();
    return this.rows()
      .filter((r) => sel.has(r.numero))
      .reduce((s, r) => s + (r.valor || 0), 0);
  });

  estaSeleccionado(numero: string): boolean {
    return this.selected().has(numero);
  }

  toggleOne(numero: string, checked: boolean): void {
    this.selected.update((s) => {
      const copy = new Set(s);
      if (checked) copy.add(numero);
      else copy.delete(numero);
      return copy;
    });
  }

  aprobarSeleccionados(): void {
    if (this.selected().size === 0) {
      this.errorMsg.set('Seleccione al menos una solicitud.');
      return;
    }
    this.loading.set(true);
    const sel = this.selected();
    const payload = this.rows().filter((r) => sel.has(r.numero));
    console.log('Aprobar solicitudes:', payload);
    setTimeout(() => {
      this.loading.set(false);
      this.selected.set(new Set());
    }, 700);
  }

  limpiar(): void {
    this.fechaInicio.set(null);
    this.fechaFin.set(null);
    this.proveedor.set('');
    this.estado.set('');
    this.busqueda.set('');
    this.errorMsg.set('');
    this.selected.set(new Set());
  }
}
