import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { ExportService } from '../../../../shared/services/export.service';
import { Banco } from '../../model/banco';
import { BancoService } from '../../service/banco.service';

@Component({
  selector: 'app-bancos-nacionales-extranjeros',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
  ],
  templateUrl: './bancos-nacionales-extranjeros.component.html',
  styleUrls: ['./bancos-nacionales-extranjeros.component.scss'],
})
export class BancosNacionalesExtranjerosComponent implements OnInit {
  // Estado UI
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  // Datos
  allData = signal<Banco[]>([]);
  pageData = signal<Banco[]>([]);
  totalItems = signal<number>(0);

  // Paginación
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);

  // Filtro
  filtro = signal<string>('');

  // Formulario
  entidadBancaria = '';
  tarjetaCredito = false;
  estado: 0 | 1 = 1;

  displayedColumns: string[] = ['codigo', 'entidad', 'tarjeta', 'estado'];
  hasItems = computed(() => this.pageData().length > 0);

  constructor(
    private bancoService: BancoService,
    private exportService: ExportService,
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    // Priorizar selectByCriteria con orderBy por defecto; fallback a getAll
    const criterios: DatosBusqueda[] = [];
    const dbOrder = new DatosBusqueda();
    dbOrder.orderBy('codigo');
    criterios.push(dbOrder);

    this.bancoService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : [];
        this.allData.set(items);
        this.totalItems.set(items.length);
        this.pageIndex.set(0);
        this.updatePageData();
        this.loading.set(false);
      },
      error: () => {
        // Fallback a GET si criteria falla
        this.bancoService.getAll().subscribe({
          next: (data2) => {
            const items2 = Array.isArray(data2) ? data2 : [];
            this.allData.set(items2);
            this.totalItems.set(items2.length);
            this.pageIndex.set(0);
            this.updatePageData();
            this.loading.set(false);
          },
          error: () => {
            this.errorMsg.set('Error al cargar bancos');
            this.loading.set(false);
          },
        });
      },
    });
  }

  guardar(): void {
    if (!this.formValido()) {
      return;
    }
    const payload: any = {
      // Backend acepta 'nombre' y 'estado';
      // evitar propiedades desconocidas como 'entidadBancaria' y 'tarjetaCredito'.
      nombre: this.entidadBancaria?.trim(),
      estado: this.estado,
    };

    this.loading.set(true);
    this.bancoService.add(payload).subscribe({
      next: () => {
        // Recargar listado tras crear
        this.entidadBancaria = '';
        this.tarjetaCredito = false;
        this.estado = 1;
        this.cargarDatos();
      },
      error: () => {
        this.errorMsg.set('No se pudo guardar el banco');
        this.loading.set(false);
      },
    });
  }

  formValido(): boolean {
    return !!this.entidadBancaria?.trim();
  }

  aplicarFiltro(value: string): void {
    this.filtro.set(value || '');
    this.pageIndex.set(0);
    this.updatePageData();
  }

  updatePageData(): void {
    const filtroTxt = this.filtro().toLowerCase();
    const filtered = this.allData().filter((item) => {
      const tarjetaTxt = (item as any).tarjetaCredito ? 'si' : 'no';
      const base =
        `${(item as any).codigo ?? ''} ${(item as any).nombre ?? ''} ${tarjetaTxt}`.toLowerCase();
      return base.includes(filtroTxt);
    });

    this.totalItems.set(filtered.length);
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    this.pageData.set(filtered.slice(start, end));
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.updatePageData();
  }

  trackByCodigo(index: number, item: Banco): number {
    return (item as any).codigo;
  }

  mostrarEstado(row: Banco): string {
    const e = (row as any).estado;
    return e === 1 ? 'Activo' : 'Inactivo';
  }

  mostrarEntidad(row: Banco): string {
    return (row as any).nombre ?? (row as any).entidadBancaria ?? '—';
  }

  mostrarTarjeta(row: Banco): string {
    const v = (row as any).tarjetaCredito;
    if (v === null || v === undefined) return '—';
    return !!v ? 'Sí' : 'No';
  }

  // Export helpers
  exportToCSV(): void {
    const headers = ['Código', 'Entidad Bancaria', 'Tarjeta de Crédito', 'Estado'];
    const dataKeys = ['codigo', 'entidadLabel', 'tarjetaLabel', 'estadoLabel'];
    const exportData = (this.allData() || []).map((row: any) => ({
      codigo: row.codigo ?? '',
      entidadLabel: this.mostrarEntidad(row),
      tarjetaLabel: this.mostrarTarjeta(row),
      estadoLabel: this.mostrarEstado(row),
    }));
    this.exportService.exportToCSV(exportData, 'bancos-nacionales-extranjeros', headers, dataKeys);
  }

  exportToPDF(): void {
    const headers = ['Código', 'Entidad Bancaria', 'Tarjeta de Crédito', 'Estado'];
    const dataKeys = ['codigo', 'entidadLabel', 'tarjetaLabel', 'estadoLabel'];
    const exportData = (this.allData() || []).map((row: any) => ({
      codigo: row.codigo ?? '',
      entidadLabel: this.mostrarEntidad(row),
      tarjetaLabel: this.mostrarTarjeta(row),
      estadoLabel: this.mostrarEstado(row),
    }));
    this.exportService.exportToPDF(
      exportData,
      'bancos-nacionales-extranjeros',
      'Bancos Nacionales y Extranjeros',
      headers,
      dataKeys,
    );
  }
}
