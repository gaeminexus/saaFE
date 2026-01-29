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
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { ExportService } from '../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { BancoExterno } from '../../model/banco-externo.model';
import { BancoExternoService } from '../../service/banco-externo.service';

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
    MatTooltipModule,
  ],
  templateUrl: './bancos-nacionales-extranjeros.component.html',
  styleUrls: ['./bancos-nacionales-extranjeros.component.scss'],
})
export class BancosNacionalesExtranjerosComponent implements OnInit {
  // Estado UI
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  // Datos
  allData = signal<BancoExterno[]>([]);
  pageData = signal<BancoExterno[]>([]);
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
  codigoEdicion: number | null = null; // null = crear, número = editar

  displayedColumns: string[] = [
    'codigo',
    'nombre',
    'tarjeta',
    'estado',
    'fechaIngreso',
    'acciones',
  ];
  hasItems = computed(() => this.pageData().length > 0);

  constructor(
    private bancoExternoService: BancoExternoService,
    private exportService: ExportService,
    private funcionesDatos: FuncionesDatosService,
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.errorMsg.set('');

    // Usar getAll y ordenar en el frontend
    this.bancoExternoService.getAll().subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : [];
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

  buscarPorCriterio(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    const criterios: DatosBusqueda[] = [];

    // Orden por código
    const dbOrder = new DatosBusqueda();
    dbOrder.orderBy('codigo');
    criterios.push(dbOrder);

    // Filtros opcionales por nombre y estado
    if (this.entidadBancaria?.trim()) {
      const byNombre = new DatosBusqueda();
      byNombre.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'nombre',
        this.entidadBancaria.trim(),
        TipoComandosBusqueda.LIKE,
      );
      criterios.push(byNombre);
    }

    if (this.estado === 0 || this.estado === 1) {
      const byEstado = new DatosBusqueda();
      byEstado.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.INTEGER,
        'estado',
        String(this.estado),
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(byEstado);
    }

    // criterio por tarjetaCredito eliminado: no soportado por el backend

    this.bancoExternoService.selectByCriteria(criterios).subscribe({
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
        this.bancoExternoService.getAll().subscribe({
          next: (data2) => {
            const items2 = Array.isArray(data2) ? data2 : [];
            this.allData.set(items2);
            this.totalItems.set(items2.length);
            this.pageIndex.set(0);
            this.updatePageData();
            this.loading.set(false);
          },
          error: () => {
            this.errorMsg.set('Error al buscar bancos por criterio');
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
      nombre: this.entidadBancaria?.trim(),
      estado: this.estado,
      tarjeta: this.tarjetaCredito ? 1 : 0, // Backend espera Long (1 o 0)
    };

    this.loading.set(true);

    if (this.codigoEdicion === null) {
      // Crear nuevo
      this.bancoExternoService.add(payload).subscribe({
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
      const registroOriginal = this.allData().find(
        (item) => (item as any).codigo === this.codigoEdicion,
      );
      if (registroOriginal && (registroOriginal as any).fechaIngreso) {
        payload.fechaIngreso = (registroOriginal as any).fechaIngreso;
      }

      this.bancoExternoService.update(payload).subscribe({
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

  editar(row: BancoExterno): void {
    this.codigoEdicion = (row as any).codigo ?? null;
    this.entidadBancaria = (row as any).nombre ?? '';
    this.tarjetaCredito = !!((row as any).tarjetaCredito ?? (row as any).tarjeta);
    this.estado = (row as any).estado ?? 1;
    this.errorMsg.set('');

    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  eliminar(row: BancoExterno): void {
    const nombre = (row as any).nombre ?? 'este banco';
    const codigo = (row as any).codigo;

    if (!confirm(`¿Está seguro de eliminar ${nombre}?`)) {
      return;
    }

    this.loading.set(true);
    this.bancoExternoService.delete(codigo).subscribe({
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
    this.entidadBancaria = '';
    this.tarjetaCredito = false;
    this.estado = 1;
    this.errorMsg.set('');
  }

  estaEditando(): boolean {
    return this.codigoEdicion !== null;
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

  trackByCodigo(index: number, item: BancoExterno): number {
    return (item as any).codigo;
  }

  mostrarEstado(row: BancoExterno): string {
    const e = (row as any).estado;
    return e === 1 ? 'Activo' : 'Inactivo';
  }

  mostrarNombre(row: BancoExterno): string {
    return (row as any).nombre ?? (row as any).entidadBancaria ?? '—';
  }

  mostrarTarjeta(row: BancoExterno): string {
    // Intentar múltiples nombres de campo por compatibilidad
    const v = (row as any).tarjetaCredito ?? (row as any).tarjeta;
    if (v === null || v === undefined) return '—';
    return !!v ? 'Sí' : 'No';
  }

  mostrarFechaIngreso(row: BancoExterno): string {
    const fecha = (row as any).fechaIngreso;
    if (!fecha) return '—';
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA);
  }

  // Export helpers
  exportToCSV(): void {
    const headers = ['Código', 'Nombre', 'Tarjeta', 'Estado', 'Fecha Ingreso'];
    const dataKeys = ['codigo', 'nombre', 'tarjetaLabel', 'estadoLabel', 'fechaIngreso'];
    const exportData = (this.allData() || []).map((row: any) => ({
      codigo: row.codigo ?? '',
      nombre: this.mostrarNombre(row),
      tarjetaLabel: this.mostrarTarjeta(row),
      estadoLabel: this.mostrarEstado(row),
      fechaIngreso: this.mostrarFechaIngreso(row),
    }));
    this.exportService.exportToCSV(exportData, 'bancos-nacionales-extranjeros', headers, dataKeys);
  }

  exportToPDF(): void {
    const headers = ['Código', 'Nombre', 'Tarjeta', 'Estado', 'Fecha Ingreso'];
    const dataKeys = ['codigo', 'nombre', 'tarjetaLabel', 'estadoLabel', 'fechaIngreso'];
    const exportData = (this.allData() || []).map((row: any) => ({
      codigo: row.codigo ?? '',
      nombre: this.mostrarNombre(row),
      tarjetaLabel: this.mostrarTarjeta(row),
      estadoLabel: this.mostrarEstado(row),
      fechaIngreso: this.mostrarFechaIngreso(row),
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
