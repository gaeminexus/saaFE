import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { DocumentoCxp } from '../../../../model/documento-cxp';
import { ProductoPago } from '../../../../model/producto_pago';
import { ProductoPagoService } from '../../../../service/producto-pago.service';

export interface RegistrarDocumentoDialogData {
  documento: DocumentoCxp;
}

export interface RegistrarDocumentoDialogResult {
  esIntermediario: boolean;
  idProductoIntermediario: number | null;
}

/**
 * Confirmación de «Registrar en BD», con la opción de marcar el documento como
 * factura de intermediario (docs/logica-negocio/cxp/DISENO-FACTURA-INTERMEDIARIO.md
 * en saaBE): el fondo no es el gasto real, es intermediario entre un
 * arrendatario y el gasto — el asiento manda el total a la cuenta del grupo
 * del producto elegido, sin detalle ni IVA.
 */
@Component({
  selector: 'app-registrar-documento-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, MatDialogModule],
  templateUrl: './registrar-documento-dialog.component.html',
  styleUrl: './registrar-documento-dialog.component.scss',
})
export class RegistrarDocumentoDialogComponent {
  esIntermediario = false;
  idProducto: number | null = null;

  // Producto (combo con búsqueda por nombre + código — regla de la casa para combos)
  productos: ProductoPago[] = [];
  productosFiltrados: ProductoPago[] = [];
  productoBusqueda = '';
  cargandoProductos = false;

  constructor(
    private ref: MatDialogRef<RegistrarDocumentoDialogComponent, RegistrarDocumentoDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public data: RegistrarDocumentoDialogData,
    private productoService: ProductoPagoService,
  ) {}

  get productoSeleccionadoNombre(): string {
    if (this.idProducto == null) return '';
    const p = this.productos.find(x => x.id === this.idProducto);
    if (!p) return `#${this.idProducto}`;
    const grupo = p.grupoProducto?.nombre ? ` — ${p.grupoProducto.nombre}` : '';
    return `${p.nombre} (${p.codigo})${grupo}`;
  }

  get puedeConfirmar(): boolean {
    return !this.esIntermediario || this.idProducto != null;
  }

  /** Se carga recién al marcar la casilla: la mayoría de los registros no la usan. */
  onToggleIntermediario(marcado: boolean): void {
    this.esIntermediario = marcado;
    if (!marcado) {
      this.idProducto = null;
      this.productoBusqueda = '';
      return;
    }
    if (this.productos.length === 0 && !this.cargandoProductos) {
      this.cargarProductos();
    }
  }

  private cargarProductos(): void {
    this.cargandoProductos = true;
    this.productoService.getAll().subscribe({
      next: (data) => {
        this.productos = data || [];
        this.cargandoProductos = false;
        this.filtrarProductos();
      },
      error: () => {
        this.productos = [];
        this.productosFiltrados = [];
        this.cargandoProductos = false;
      },
    });
  }

  filtrarProductos(): void {
    const q = (this.productoBusqueda || '').toLowerCase().trim();
    if (!q) { this.productosFiltrados = this.productos.slice(0, 50); return; }
    this.productosFiltrados = this.productos
      .filter(p => p.nombre?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q))
      .slice(0, 50);
  }

  seleccionarProducto(p: ProductoPago): void {
    this.idProducto = p.id;
    this.productoBusqueda = `${p.nombre} (${p.codigo})`;
  }

  cancelar(): void { this.ref.close(null); }

  confirmar(): void {
    if (!this.puedeConfirmar) return;
    this.ref.close({
      esIntermediario: this.esIntermediario,
      idProductoIntermediario: this.esIntermediario ? this.idProducto : null,
    });
  }
}
