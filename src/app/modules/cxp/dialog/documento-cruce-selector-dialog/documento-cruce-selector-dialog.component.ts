import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
import { empresaSesionCodigo } from '../../../../shared/services/empresa-sesion';
import { mensajeDeError } from '../../../../shared/utils/mensaje-error.util';
import { etiquetaTipoComprobanteFactura } from '../../../../shared/utils/tipo-comprobante-cxp.util';
import { FacturaCompra } from '../../model/factura-compra';
import { LiquidacionCompraCompra } from '../../model/liquidacion-compra-compra';
import { DocumentoCartera } from '../../model/cartera';
import { FacturaCompraService } from '../../service/factura-compra.service';
import { LiquidacionCompraCompraService } from '../../service/liquidacion-compra-compra.service';
import { AplicacionPagoCxpService } from '../../service/aplicacion-pago-cxp.service';

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
  /** Solo en `tipo: 'FACTURA'` — distingue factura ("01") de nota de venta manual ("02"). */
  tipoComprobante?: string;
  /**
   * Solo con el check "todas los proveedores" encendido (docs/cxp/API-CRUCE-ANTICIPO-OTRO-PROVEEDOR.md
   * §4.1) — en el modo de siempre (un solo proveedor) quedan sin usar, porque ya se sabe de quién
   * es el documento por `data.codigoTitular`/`data.nombreTitular`.
   */
  idTitular?: number;
  nombreTitular?: string;
  /**
   * Identificación (RUC/cédula) del titular — no está en la lista original de "tres campos" del
   * contrato, pero el filtro de texto que el propio contrato pide ("busca por proveedor, RUC o
   * número de documento") no se puede armar sin ella. Agregada para que ese filtro funcione.
   */
  identificacion?: string;
  saldo?: number;
}

export interface DocumentoCruceSelectorDialogData {
  codigoTitular: number;
  nombreTitular: string;
  /** Oculta los documentos ya pagados por completo. */
  soloPendientes?: boolean;
  /**
   * Habilita el check "Mostrar las facturas pendientes de todos los proveedores"
   * (docs/cxp/API-CRUCE-ANTICIPO-OTRO-PROVEEDOR.md §4.1). Apagado por defecto y ausente en la
   * caja chica (`gastos-caja-chica.component.ts`): ese llamador no cambia de comportamiento.
   */
  permitirOtrosProveedores?: boolean;
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
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './documento-cruce-selector-dialog.component.html',
})
export class DocumentoCruceSelectorDialogComponent implements OnInit {
  cargando = signal(false);
  error = signal('');

  private readonly columnasBase = ['tipo', 'id', 'numero', 'fecha', 'total', 'estadoPago', 'accion'];
  private readonly columnasConProveedor = ['tipo', 'id', 'numero', 'proveedor', 'fecha', 'total', 'estadoPago', 'accion'];

  /** Check "todos los proveedores" — apagado al abrir, y solo visible si `data.permitirOtrosProveedores`. */
  mostrarTodosProveedores = signal(false);

  private todos: DocumentoCruceProveedor[] = [];
  /** Documentos del proveedor del diálogo — lo de siempre; se recupera al apagar el check. */
  private porProveedor: DocumentoCruceProveedor[] = [];
  /** Cache de la cartera completa, para no volver a pedirla si se prende/apaga el check varias veces. */
  private cacheTodosProveedores: DocumentoCruceProveedor[] | null = null;

  dataSource = new MatTableDataSource<DocumentoCruceProveedor>([]);
  columnas = this.columnasBase;

  textoBusqueda = '';

  constructor(
    private dialogRef: MatDialogRef<DocumentoCruceSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DocumentoCruceSelectorDialogData,
    private facturaService: FacturaCompraService,
    private liquidacionService: LiquidacionCompraCompraService,
    private aplicacionPagoS: AplicacionPagoCxpService,
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
        tipoComprobante: f.tipoComprobante,
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

      this.porProveedor = lista;
      this.todos = lista;
      this.dataSource.data = [...lista];
    });
  }

  /**
   * Check "Mostrar las facturas pendientes de todos los proveedores" — opt-in, apagado al abrir
   * (docs/cxp/API-CRUCE-ANTICIPO-OTRO-PROVEEDOR.md §4.1). Apagado: lo de siempre, sin volver a
   * pedir nada. Encendido: carga (o reusa) la cartera completa.
   */
  toggleTodosProveedores(encendido: boolean): void {
    this.mostrarTodosProveedores.set(encendido);
    this.columnas = encendido ? this.columnasConProveedor : this.columnasBase;

    if (!encendido) {
      this.todos = this.porProveedor;
      this.filtrar();
      return;
    }

    if (this.cacheTodosProveedores) {
      this.todos = this.cacheTodosProveedores;
      this.filtrar();
      return;
    }

    this.cargarTodosProveedores();
  }

  /**
   * ⛔ Nunca `selectByCriteria` sin filtro sobre facturas: cargaría el grafo EAGER completo de
   * todas las facturas (el `ORA-04036` del 03-09). Se usa la cartera, que ya está agregada en la
   * base y solo trae escalares.
   */
  private cargarTodosProveedores(): void {
    const idEmpresa = empresaSesionCodigo();
    if (!idEmpresa) {
      this.error.set('No se pudo determinar la empresa de la sesión');
      this.toggleTodosProveedores(false);
      return;
    }

    this.cargando.set(true);
    this.error.set('');

    this.aplicacionPagoS.carteraPorPagar({ idEmpresa }).subscribe({
      next: (resp) => {
        this.cargando.set(false);
        const lista = (resp.documentos ?? [])
          .filter((d) => Number(d.saldo) > 0)
          .map((d) => this.mapearDocumentoCartera(d));
        this.cacheTodosProveedores = lista;
        this.todos = lista;
        this.filtrar();
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err, 'No se pudieron cargar las facturas pendientes de todos los proveedores'));
        // El check vuelve a apagarse: no se deja al usuario en un estado a medias.
        this.toggleTodosProveedores(false);
      },
    });
  }

  /** §4.1 del contrato: FACTURA/NOTA_VENTA → 'FACTURA' (la nota de venta con tipoComprobante '02'); LIQUIDACION → 'LIQUIDACION_COMPRA' (mismo tipo que ya usa este diálogo, ver el comentario de cabecera sobre no confundirlo con el 'LIQUIDACION' de cxc). */
  private mapearDocumentoCartera(d: DocumentoCartera): DocumentoCruceProveedor {
    const esLiquidacion = d.tipoDocumento === 'LIQUIDACION';
    return {
      tipo: esLiquidacion ? 'LIQUIDACION_COMPRA' : 'FACTURA',
      id: d.idDocumento,
      numero: d.numeroDocumento,
      fecha: d.fechaEmision,
      total: Number(d.total ?? 0),
      estadoPago: null,
      tipoComprobante: d.tipoDocumento === 'NOTA_VENTA' ? '02' : undefined,
      idTitular: d.idTitular,
      nombreTitular: d.titular,
      identificacion: d.identificacion,
      saldo: Number(d.saldo ?? 0),
    };
  }

  filtrar(): void {
    const termino = this.textoBusqueda.trim().toLowerCase();
    if (!termino) { this.dataSource.data = [...this.todos]; return; }
    this.dataSource.data = this.todos.filter((d) => {
      const coincideDocumento = (d.numero || '').toLowerCase().includes(termino) || String(d.id || '').includes(termino);
      if (coincideDocumento) return true;
      if (!this.mostrarTodosProveedores()) return false;
      // Solo con el check encendido se busca además por proveedor/RUC — en el modo de siempre
      // esos campos ni se llenan.
      return (d.nombreTitular || '').toLowerCase().includes(termino)
        || (d.identificacion || '').toLowerCase().includes(termino);
    });
  }

  etiquetaTipo(row: DocumentoCruceProveedor): string {
    return row.tipo === 'FACTURA' ? etiquetaTipoComprobanteFactura(row.tipoComprobante) : 'Liquidación';
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
