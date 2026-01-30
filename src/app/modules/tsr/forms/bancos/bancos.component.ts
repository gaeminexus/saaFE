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
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatTooltipModule,
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
  conciliaDescuadre = false;
  estado: 0 | 1 = 1;
  codigoEdicion: number | null = null; // null = crear, número = editar

  // Rubros tipo de banco (id 24)
  rubrosTipoBanco = signal<DetalleRubro[]>([]);

  displayedColumns: string[] = ['codigo', 'nombre', 'tipo', 'permite', 'estado', 'acciones'];
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
    // Acceso síncrono - datos ya cargados en memoria por AppStateService
    const rubros = this.detalleRubroService.getDetallesByParent(24);
    this.rubrosTipoBanco.set(Array.isArray(rubros) ? rubros : []);
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.errorMsg.set('');

    // Obtener código de empresa del localStorage
    const empresaCodigo = localStorage.getItem('empresaCodigo');
    const empresaCodigoNum = empresaCodigo ? parseInt(empresaCodigo, 10) : null;

    // Usar getAll y ordenar/filtrar en el frontend
    this.bancoService.getAll().subscribe({
      next: (data) => {
        let items = Array.isArray(data) ? data : [];

        // Filtrar por empresa si existe el código
        if (empresaCodigoNum) {
          items = items.filter((item) => (item as any).empresa === empresaCodigoNum);
        }

        // Ordenar por código
        items.sort((a, b) => (a.codigo ?? 0) - (b.codigo ?? 0));
        this.allData.set(items);
        this.totalItems.set(items.length);
        this.pageIndex.set(0);
        this.updatePageData();
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Error al cargar bancos');
        this.loading.set(false);
      },
    });
  }

  guardar(): void {
    if (!this.formValido()) return;

    // Obtener código de empresa del localStorage
    const empresaCodigo = localStorage.getItem('empresaCodigo');
    const empresaCodigoNum = empresaCodigo ? parseInt(empresaCodigo, 10) : null;

    const payload: any = {
      nombre: this.nombre?.trim(),
      conciliaDescuadre: this.conciliaDescuadre ? 1 : 0,
      estado: this.estado,
    };

    // Agregar empresa si existe
    if (empresaCodigoNum) {
      payload.empresa = empresaCodigoNum;
    }

    if (this.tipoBancoSeleccion) {
      payload.rubroTipoBancoP = this.tipoBancoSeleccion.rubro?.codigoAlterno ?? 24;
      payload.rubroTipoBancoH = this.tipoBancoSeleccion.codigoAlterno;
    }

    this.loading.set(true);

    if (this.codigoEdicion === null) {
      // Crear nuevo
      this.bancoService.add(payload).subscribe({
        next: () => {
          this.limpiarFormulario();
          this.cargarDatos();
        },
        error: () => {
          this.errorMsg.set('No se pudo guardar el banco');
          this.loading.set(false);
        },
      });
    } else {
      // Actualizar existente - incluir código y preservar fechaIngreso
      payload.codigo = this.codigoEdicion;

      // Buscar el registro original para preservar la fechaIngreso
      const registroOriginal = this.allData().find((item) => item.codigo === this.codigoEdicion);
      if (registroOriginal && registroOriginal.fechaIngreso) {
        payload.fechaIngreso = registroOriginal.fechaIngreso;
      }

      this.bancoService.update(payload).subscribe({
        next: () => {
          this.limpiarFormulario();
          this.cargarDatos();
        },
        error: () => {
          this.errorMsg.set('No se pudo actualizar el banco');
          this.loading.set(false);
        },
      });
    }
  }

  editar(row: Banco): void {
    this.codigoEdicion = row.codigo ?? null;
    this.nombre = row.nombre ?? '';
    this.conciliaDescuadre = !!(row as any).conciliaDescuadre;
    this.estado = (row.estado ?? 1) as 0 | 1;

    // Buscar el tipo de banco en los rubros
    const p: number = (row as any).rubroTipoBancoP;
    const h: number = (row as any).rubroTipoBancoH;
    const found = this.rubrosTipoBanco().find(
      (r) => r.rubro?.codigoAlterno === p && r.codigoAlterno === h,
    );
    this.tipoBancoSeleccion = found ?? null;

    this.errorMsg.set('');

    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  eliminar(row: Banco): void {
    const nombre = row.nombre ?? 'este banco';
    const codigo = row.codigo;

    if (!confirm(`¿Está seguro de eliminar ${nombre}?`)) {
      return;
    }

    this.loading.set(true);
    this.bancoService.delete(codigo).subscribe({
      next: () => {
        this.cargarDatos();
      },
      error: () => {
        this.errorMsg.set('No se pudo eliminar el banco');
        this.loading.set(false);
      },
    });
  }

  cancelarEdicion(): void {
    this.limpiarFormulario();
  }

  limpiarFormulario(): void {
    this.codigoEdicion = null;
    this.nombre = '';
    this.tipoBancoSeleccion = null;
    this.conciliaDescuadre = false;
    this.estado = 1;
    this.errorMsg.set('');
  }

  estaEditando(): boolean {
    return this.codigoEdicion !== null;
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
    return (row as any).conciliaDescuadre ? 'Sí' : 'No';
  }

  mostrarEstado(row: Banco): string {
    return (row as any).estado === 1 ? 'Activo' : 'Inactivo';
  }

  formValido(): boolean {
    // Tipo de banco es opcional si no hay rubros disponibles
    return !!this.nombre?.trim();
  }

  // Función para comparar rubros en el mat-select
  compararRubros(r1: DetalleRubro | null, r2: DetalleRubro | null): boolean {
    if (!r1 || !r2) return r1 === r2;
    return (
      r1.codigoAlterno === r2.codigoAlterno && r1.rubro?.codigoAlterno === r2.rubro?.codigoAlterno
    );
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
