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
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { ESTADO_PAGO_LABELS, EstadoPagoFactura } from '../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { FacturaCompra } from '../../model/factura-compra';
import { LiquidacionCompraCompra } from '../../model/liquidacion-compra-compra';
import { FacturaCompraService } from '../../service/factura-compra.service';
import { LiquidacionCompraCompraService } from '../../service/liquidacion-compra-compra.service';

/**
 * Tipo del documento afectado por el cruce de anticipo de proveedor — determina a qué ruta de
 * saldo y de aplicación se manda el cruce (docs/logica-negocio/cxp/
 * DISENO-CRUCE-ANTICIPO-CONTRA-LIQUIDACION.md en saaBE).
 *
 * ⚠️ No confundir con el 'LIQUIDACION' de `FacturaCompraSelectorDialogComponent`: ese es
 * CBR.LQCS, la liquidación que ASOPREP EMITE (vive en cxc, la usa el selector de documentos de
 * retención). Este 'LIQUIDACION_COMPRA' es PGS.LQCC, la liquidación que ASOPREP RECIBE de un
 * proveedor (vive en cxp). Mismo nombre en español, dos entidades de backend distintas.
 */
export type TipoDocumentoCruceProveedor = 'FACTURA' | 'LIQUIDACION_COMPRA';

/** Fila unificada del selector: lo mínimo que necesita la pantalla de cruce para operar. */
export interface DocumentoCruceProveedor {
  tipo: TipoDocumentoCruceProveedor;
  id: number;
  numero: string;
  fecha: any;
  total: number;
  estadoPago: number | null;
}

export interface DocumentoCruceSelectorDialogData {
  codigoTitular: number;
  nombreTitular: string;
  /** Oculta los documentos ya pagados por completo. */
  soloPendientes?: boolean;
}

/**
 * Selector de documentos afectables por un cruce de anticipo de proveedor: facturas de compra
 * (PGS.FCTC) y liquidaciones de compra (PGS.LQCC), lado a lado. No existe un endpoint del
 * backend que devuelva ambos juntos —se verificó y no hay— así que se arma acá con las dos
 * consultas que ya existían por separado.
 */
@Component({
  selector: 'app-documento-cruce-selector-dialog',
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
  templateUrl: './documento-cruce-selector-dialog.component.html',
})
export class DocumentoCruceSelectorDialogComponent implements OnInit {
  cargando = signal(false);
  error = signal('');

  private todos: DocumentoCruceProveedor[] = [];
  dataSource = new MatTableDataSource<DocumentoCruceProveedor>([]);
  columnas = ['tipo', 'id', 'numero', 'fecha', 'total', 'estadoPago', 'accion'];

  textoBusqueda = '';

  constructor(
    private dialogRef: MatDialogRef<DocumentoCruceSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DocumentoCruceSelectorDialogData,
    private facturaService: FacturaCompraService,
    private liquidacionService: LiquidacionCompraCompraService,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    if (!this.data.codigoTitular) {
      this.error.set('No se especificó el proveedor');
      return;
    }

    this.cargando.set(true);
    this.error.set('');

    const criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatos.LONG, 'titular', 'codigo', String(this.data.codigoTitular), TipoComandosBusqueda.IGUAL
    );
    criterio.setNumeroCampoRepetido(0);

    forkJoin({
      facturas: this.facturaService.selectByCriteria([criterio]).pipe(catchError(() => of(null))),
      liquidaciones: this.liquidacionService.selectByCriteria([criterio]).pipe(catchError(() => of(null))),
    }).subscribe(({ facturas, liquidaciones }) => {
      this.cargando.set(false);

      if (facturas == null && liquidaciones == null) {
        this.error.set('No se pudieron cargar los documentos del proveedor');
        this.todos = [];
        this.dataSource.data = [];
        return;
      }

      const filasFactura: DocumentoCruceProveedor[] = (facturas || []).map((f: FacturaCompra) => ({
        tipo: 'FACTURA',
        id: f.id,
        numero: f.numero,
        fecha: f.fecha,
        total: Number(f.total ?? 0),
        estadoPago: f.estadoPago ?? null,
      }));
      const filasLiquidacion: DocumentoCruceProveedor[] = (liquidaciones || []).map((l: LiquidacionCompraCompra) => ({
        tipo: 'LIQUIDACION_COMPRA',
        id: l.id,
        numero: l.numero,
        fecha: l.fecha,
        total: Number(l.total ?? 0),
        estadoPago: l.estadoPago ?? null,
      }));

      let lista = [...filasFactura, ...filasLiquidacion].sort((a, b) => (b.id || 0) - (a.id || 0));
      if (this.data.soloPendientes) {
        // Si no informa estadoPago se conserva la fila: no se puede afirmar que esté pagada
        // (mismo criterio que FacturaCompraSelectorDialogComponent).
        lista = lista.filter((d) => d.estadoPago !== EstadoPagoFactura.PAGADA);
      }

      this.todos = lista;
      this.dataSource.data = [...lista];
    });
  }

  filtrar(): void {
    const termino = this.textoBusqueda.trim().toLowerCase();
    if (!termino) { this.dataSource.data = [...this.todos]; return; }
    this.dataSource.data = this.todos.filter((d) =>
      (d.numero || '').toLowerCase().includes(termino) || String(d.id || '').includes(termino)
    );
  }

  etiquetaTipo(tipo: TipoDocumentoCruceProveedor): string {
    return tipo === 'FACTURA' ? 'Factura' : 'Liquidación';
  }

  etiquetaEstadoPago(row: DocumentoCruceProveedor): { texto: string; clase: string } | null {
    if (row.estadoPago == null) return null;
    return ESTADO_PAGO_LABELS[row.estadoPago] ?? null;
  }

  formatFecha(fecha: any): string {
    if (!fecha) return '-';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  seleccionar(row: DocumentoCruceProveedor): void {
    this.dialogRef.close(row);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
