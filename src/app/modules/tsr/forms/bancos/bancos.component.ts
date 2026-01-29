import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
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
import { MatToolbarModule } from '@angular/material/toolbar';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { DetalleRubro } from '../../../../shared/model/detalle-rubro';
import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { ExportService } from '../../../../shared/services/export.service';
import { Banco } from '../../model/banco';
import { BancoService } from '../../service/banco.service';

@Component({
  selector: 'app-bancos',
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
    MatToolbarModule,
  ],
  templateUrl: './bancos.component.html',
  styleUrls: ['./bancos.component.scss'],
})
export class BancosComponent implements OnInit {
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
  nombre = '';
  tipoBancoSeleccion: DetalleRubro | null = null;
  permiteDescuadre = false;
  estado: 0 | 1 = 1;

  // Rubros tipo de banco (id 24)
  rubrosTipoBanco = signal<DetalleRubro[]>([]);

  displayedColumns: string[] = ['codigo', 'nombre', 'tipo', 'permite', 'estado'];
  hasItems = computed(() => this.pageData().length > 0);

  constructor(
    private bancoService: BancoService,
    private detalleRubroService: DetalleRubroService,
    private exportService: ExportService,
  ) {}

  ngOnInit(): void {
    this.cargarRubrosTipoBanco();
    this.cargarDatos();
  }

  cargarRubrosTipoBanco(): void {
    const cached = this.detalleRubroService.getDetallesByParent(24);
    if (Array.isArray(cached) && cached.length > 0) {
      this.rubrosTipoBanco.set(cached);
      return;
    }
    this.detalleRubroService.getRubros(24).subscribe({
      next: (rubros) => this.rubrosTipoBanco.set(Array.isArray(rubros) ? rubros : []),
      error: () => this.errorMsg.set('Error al cargar rubros de tipo de banco'),
    });
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.errorMsg.set('');
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
    if (!this.formValido()) return;
    const payload: any = {
      nombre: this.nombre?.trim(),
      permiteDescuadre: this.permiteDescuadre,
      estado: this.estado,
    };
    if (this.tipoBancoSeleccion) {
      payload.rubroTipoBancoP = this.tipoBancoSeleccion.rubro?.codigoAlterno ?? 24;
      payload.rubroTipoBancoH = this.tipoBancoSeleccion.codigoAlterno;
    }

    this.loading.set(true);
    this.bancoService.add(payload).subscribe({
      next: () => {
        this.nombre = '';
        this.tipoBancoSeleccion = null;
        this.permiteDescuadre = false;
        this.estado = 1;
        this.cargarDatos();
      },
      error: () => {
        this.errorMsg.set('No se pudo guardar el banco');
        this.loading.set(false);
      },
    });
  }

  mostrarTipo(row: Banco): string {
    const p: number = (row as any).rubroTipoBancoP;
    const h: number = (row as any).rubroTipoBancoH;
    const found = this.rubrosTipoBanco().find(
      (r) => r.rubro?.codigoAlterno === p && r.codigoAlterno === h,
    );
    return found ? found.descripcion : '—';
  }

  mostrarPermite(row: Banco): string {
    return (row as any).permiteDescuadre ? 'Sí' : 'No';
  }

  mostrarEstado(row: Banco): string {
    return (row as any).estado === 1 ? 'Activo' : 'Inactivo';
  }

  formValido(): boolean {
    return !!this.nombre?.trim() && !!this.tipoBancoSeleccion;
  }

  onTipoBancoChange(rubro: DetalleRubro | null): void {
    this.tipoBancoSeleccion = rubro;
  }

  aplicarFiltro(value: string): void {
    this.filtro.set(value || '');
    this.pageIndex.set(0);
    this.updatePageData();
  }

  updatePageData(): void {
    const filtroTxt = this.filtro().toLowerCase();
    const filtered = this.allData().filter((item) => {
      const base = `${(item as any).codigo ?? ''} ${(item as any).nombre ?? ''}`.toLowerCase();
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

  trackByCodigoAlterno(index: number, item: DetalleRubro): number {
    return item.codigoAlterno;
  }

  // Export helpers
  exportToCSV(): void {
    const headers = ['Código', 'Descripción', 'Tipo', 'Permite Descuadre', 'Estado'];
    const dataKeys = ['codigo', 'nombre', 'tipoLabel', 'permiteLabel', 'estadoLabel'];
    const exportData = (this.allData() || []).map((row: any) => ({
      codigo: row.codigo ?? '',
      nombre: row.nombre ?? '',
      tipoLabel: this.mostrarTipo(row),
      permiteLabel: this.mostrarPermite(row),
      estadoLabel: this.mostrarEstado(row),
    }));
    this.exportService.exportToCSV(exportData, 'bancos', headers, dataKeys);
  }

  exportToPDF(): void {
    const headers = ['Código', 'Descripción', 'Tipo', 'Permite Descuadre', 'Estado'];
    const dataKeys = ['codigo', 'nombre', 'tipoLabel', 'permiteLabel', 'estadoLabel'];
    const exportData = (this.allData() || []).map((row: any) => ({
      codigo: row.codigo ?? '',
      nombre: row.nombre ?? '',
      tipoLabel: this.mostrarTipo(row),
      permiteLabel: this.mostrarPermite(row),
      estadoLabel: this.mostrarEstado(row),
    }));
    try {
      this.exportService.exportToPDF(exportData, 'bancos', 'Bancos', headers, dataKeys);
    } catch (e) {
      const w = window as any;
      if (typeof w.loadJsPDF === 'function') {
        w.loadJsPDF().then(() =>
          this.exportService.exportToPDF(exportData, 'bancos', 'Bancos', headers, dataKeys),
        );
      }
    }
  }
}
