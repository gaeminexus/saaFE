import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import {
  ESTADO_PAGO_LABELS,
  EstadoPagoFactura,
} from '../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { FacturaCompra } from '../../model/factura-compra';
import { FacturaCompraService } from '../../service/factura-compra.service';

export interface FacturaCompraSelectorDialogData {
  codigoTitular: number;
  nombreTitular: string;
  /** Oculta las facturas ya pagadas por completo. */
  soloPendientes?: boolean;
}

/**
 * Selector de facturas de compra de un proveedor. Equivalente de CXP al
 * selector de facturas de venta de CXC.
 */
@Component({
  selector: 'app-factura-compra-selector-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatTableModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './factura-compra-selector-dialog.component.html',
})
export class FacturaCompraSelectorDialogComponent implements OnInit {
  cargando = signal(false);
  error = signal('');

  todasLasFacturas: FacturaCompra[] = [];
  dataSource = new MatTableDataSource<FacturaCompra>([]);
  columnas = ['id', 'numero', 'fecha', 'total', 'estadoPago', 'accion'];

  textoBusqueda = '';

  constructor(
    private dialogRef: MatDialogRef<FacturaCompraSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FacturaCompraSelectorDialogData,
    private facturaService: FacturaCompraService,
  ) {}

  ngOnInit(): void {
    this.cargarFacturas();
  }

  cargarFacturas(): void {
    if (!this.data.codigoTitular) {
      this.error.set('No se especificó el proveedor');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.error.set('');

    const cTitular = new DatosBusqueda();
    cTitular.asignaValorConCampoPadre(
      TipoDatos.LONG, 'titular', 'codigo', String(this.data.codigoTitular), TipoComandosBusqueda.IGUAL
    );
    cTitular.setNumeroCampoRepetido(0);

    this.facturaService.selectByCriteria([cTitular]).subscribe({
      next: (data) => {
        let lista = (data || []).sort((a, b) => (b.id || 0) - (a.id || 0));
        if (this.data.soloPendientes) {
          // Si el backend no informa estadoPago se conserva la fila: no se puede
          // afirmar que esté pagada.
          lista = lista.filter((f) => f.estadoPago !== EstadoPagoFactura.PAGADA);
        }
        this.todasLasFacturas = lista;
        this.dataSource.data = [...lista];
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las facturas del proveedor');
        this.cargando.set(false);
      },
    });
  }

  filtrar(): void {
    const termino = this.textoBusqueda.trim().toLowerCase();
    if (!termino) {
      this.dataSource.data = [...this.todasLasFacturas];
      return;
    }
    this.dataSource.data = this.todasLasFacturas.filter((f) =>
      (f.numero || '').toLowerCase().includes(termino) ||
      String(f.id || '').includes(termino)
    );
  }

  etiquetaEstadoPago(row: FacturaCompra): { texto: string; clase: string } | null {
    if (row.estadoPago == null) return null;
    return ESTADO_PAGO_LABELS[row.estadoPago] ?? null;
  }

  formatFecha(fecha: Date | string | null | undefined): string {
    if (!fecha) return '-';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  seleccionar(factura: FacturaCompra): void {
    this.dialogRef.close(factura);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
