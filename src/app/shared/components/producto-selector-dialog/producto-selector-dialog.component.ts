import { CommonModule } from '@angular/common';
import { Component, Inject, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../modules/material-form.module';
import { ProductoCobro } from '../../../modules/cxc/model/producto-cobro';
import { ProductoCobroService } from '../../../modules/cxc/service/producto-cobro.service';

export interface ProductoSelectorDialogData {
  titulo?: string;
}

interface GrupoProductoFiltro {
  codigo: number;
  nombre: string;
}

@Component({
  selector: 'app-producto-selector-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialFormModule, MatDialogModule],
  templateUrl: './producto-selector-dialog.component.html',
  styleUrl: './producto-selector-dialog.component.scss',
})
export class ProductoSelectorDialogComponent {
  private dialogRef = inject(MatDialogRef<ProductoSelectorDialogComponent, ProductoCobro | null>);
  private productoService = inject(ProductoCobroService);

  cargando = signal(false);
  productos = signal<ProductoCobro[]>([]);
  grupoSeleccionado = signal<number | null>(null);
  nombreBusqueda = signal('');

  columnas = ['codigo', 'grupo', 'nombre', 'precio', 'stock', 'acciones'];
  dataSource = new MatTableDataSource<ProductoCobro>([]);

  grupos = computed<GrupoProductoFiltro[]>(() => {
    const gruposMap = new Map<number, string>();

    for (const producto of this.productos()) {
      const grupo = producto.grupoProducto;
      if (grupo?.codigo) {
        gruposMap.set(Number(grupo.codigo), grupo.nombre || '');
      }
    }

    return Array.from(gruposMap.entries())
      .map(([codigo, nombre]) => ({ codigo, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  get titulo(): string {
    return this.data?.titulo || 'Buscar Producto';
  }

  constructor(@Inject(MAT_DIALOG_DATA) public data: ProductoSelectorDialogData) {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.cargando.set(true);
    this.productoService.getAll().subscribe({
      next: (productos) => {
        const rows = (productos || []).filter((producto) => Number(producto.estado) === 1);
        this.productos.set(rows);
        this.aplicarFiltros();
        this.cargando.set(false);
      },
      error: () => {
        this.productos.set([]);
        this.dataSource.data = [];
        this.cargando.set(false);
      },
    });
  }

  onGrupoChange(codigo: number | null): void {
    this.grupoSeleccionado.set(codigo);
    this.aplicarFiltros();
  }

  onNombreChange(valor: string): void {
    this.nombreBusqueda.set(valor || '');
    this.aplicarFiltros();
  }

  private aplicarFiltros(): void {
    const nombre = this.nombreBusqueda().trim().toLowerCase();
    const grupo = this.grupoSeleccionado();

    const rows = this.productos().filter((producto) => {
      const coincideGrupo = grupo === null || Number(producto.grupoProducto?.codigo || 0) === Number(grupo);
      const textoGrupo = (producto.grupoProducto?.nombre || '').toLowerCase();
      const textoProducto = (producto.nombre || '').toLowerCase();
      const coincideNombre = !nombre || textoProducto.includes(nombre) || textoGrupo.includes(nombre);
      return coincideGrupo && coincideNombre;
    });

    this.dataSource.data = rows.sort((a, b) => {
      const grupoA = a.grupoProducto?.nombre || '';
      const grupoB = b.grupoProducto?.nombre || '';
      return `${grupoA} ${a.nombre}`.localeCompare(`${grupoB} ${b.nombre}`);
    });
  }

  seleccionar(producto: ProductoCobro): void {
    this.dialogRef.close(producto);
  }

  cerrar(): void {
    this.dialogRef.close(null);
  }
}
