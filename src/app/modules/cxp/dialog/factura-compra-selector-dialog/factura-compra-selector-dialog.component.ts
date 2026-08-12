import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
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
import { NotaCreditoCompra } from '../../model/nota-credito-compra';
import { NotaDebitoCompra } from '../../model/nota-debito-compra';
import { FacturaCompraService } from '../../service/factura-compra.service';
import { NotaCreditoCompraService } from '../../service/nota-credito-compra.service';
import { NotaDebitoCompraService } from '../../service/nota-debito-compra.service';

/** Documentos de compra que se pueden elegir desde este selector. */
export type TipoDocumentoCompra = 'FACTURA' | 'NOTA_CREDITO' | 'NOTA_DEBITO';

/** Cualquiera de los documentos de compra que devuelve el selector. */
export type DocumentoCompraSeleccionable = FacturaCompra | NotaCreditoCompra | NotaDebitoCompra;

export interface FacturaCompraSelectorDialogData {
  codigoTitular: number;
  nombreTitular: string;
  /** Oculta los documentos ya pagados por completo. */
  soloPendientes?: boolean;
  /** Qué documento se está buscando; por defecto, facturas de compra. */
  tipoDocumento?: TipoDocumentoCompra;
}

const ETIQUETAS: Record<TipoDocumentoCompra, { titulo: string; singular: string; plural: string }> = {
  FACTURA: { titulo: 'Seleccionar Factura de Compra', singular: 'factura', plural: 'facturas' },
  NOTA_CREDITO: { titulo: 'Seleccionar Nota de Crédito de Compra', singular: 'nota de crédito', plural: 'notas de crédito' },
  NOTA_DEBITO: { titulo: 'Seleccionar Nota de Débito de Compra', singular: 'nota de débito', plural: 'notas de débito' },
};

/**
 * Selector de documentos de compra de un proveedor (facturas, notas de
 * crédito y notas de débito). Equivalente de CXP al selector de facturas de
 * venta de CXC.
 *
 * Solo las facturas llevan `estadoPago`, así que `soloPendientes` únicamente
 * descarta filas en ese caso: las notas se aplican completas contra una
 * factura y no arrastran saldo propio.
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

  todasLasFacturas: DocumentoCompraSeleccionable[] = [];
  dataSource = new MatTableDataSource<DocumentoCompraSeleccionable>([]);
  columnas = ['id', 'numero', 'fecha', 'total', 'estadoPago', 'accion'];

  textoBusqueda = '';

  constructor(
    private dialogRef: MatDialogRef<FacturaCompraSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FacturaCompraSelectorDialogData,
    private facturaService: FacturaCompraService,
    private notaCreditoService: NotaCreditoCompraService,
    private notaDebitoService: NotaDebitoCompraService,
  ) {}

  get tipo(): TipoDocumentoCompra {
    return this.data.tipoDocumento ?? 'FACTURA';
  }

  get titulo(): string {
    return ETIQUETAS[this.tipo].titulo;
  }

  get nombreSingular(): string {
    return ETIQUETAS[this.tipo].singular;
  }

  get nombrePlural(): string {
    return ETIQUETAS[this.tipo].plural;
  }

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

    this.consultaPorTipo([cTitular]).subscribe({
      next: (data) => {
        let lista = ((data || []) as DocumentoCompraSeleccionable[])
          .sort((a, b) => (b.id || 0) - (a.id || 0));
        if (this.data.soloPendientes) {
          // Si el backend no informa estadoPago se conserva la fila: no se puede
          // afirmar que esté pagada.
          lista = lista.filter((f) => (f as FacturaCompra).estadoPago !== EstadoPagoFactura.PAGADA);
        }
        this.todasLasFacturas = lista;
        this.dataSource.data = [...lista];
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(`No se pudieron cargar las ${this.nombrePlural} del proveedor`);
        this.cargando.set(false);
      },
    });
  }

  private consultaPorTipo(criterios: DatosBusqueda[]): Observable<DocumentoCompraSeleccionable[] | null> {
    switch (this.tipo) {
      case 'NOTA_CREDITO':
        return this.notaCreditoService.selectByCriteria(criterios);
      case 'NOTA_DEBITO':
        return this.notaDebitoService.selectByCriteria(criterios);
      default:
        return this.facturaService.selectByCriteria(criterios);
    }
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

  etiquetaEstadoPago(row: DocumentoCompraSeleccionable): { texto: string; clase: string } | null {
    const estadoPago = (row as FacturaCompra).estadoPago;
    if (estadoPago == null) return null;
    return ESTADO_PAGO_LABELS[estadoPago] ?? null;
  }

  formatFecha(fecha: Date | string | null | undefined): string {
    if (!fecha) return '-';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  seleccionar(factura: DocumentoCompraSeleccionable): void {
    this.dialogRef.close(factura);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
