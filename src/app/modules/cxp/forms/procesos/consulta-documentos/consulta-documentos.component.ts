import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { DocumentoCxp } from '../../../model/documento-cxp';
import { DetalleFacturaCompraService } from '../../../service/detalle-factura-compra.service';
import { DetalleLiquidacionCompraCompraService } from '../../../service/detalle-liquidacion-compra-compra.service';
import { DetalleNotaCreditoCompraService } from '../../../service/detalle-nota-credito-compra.service';
import { DetalleNotaDebitoCompraService } from '../../../service/detalle-nota-debito-compra.service';
import { DetalleRetencionCompraService } from '../../../service/detalle-retencion-compra.service';
import { DocumentoCxpService } from '../../../service/documento-cxp.service';
import { FacturaCompraService } from '../../../service/factura-compra.service';
import { FormaPagoFacturaCompraService } from '../../../service/forma-pago-factura-compra.service';
import { FormaPagoLiquidacionCompraCompraService } from '../../../service/forma-pago-liquidacion-compra-compra.service';
import { LiquidacionCompraCompraService } from '../../../service/liquidacion-compra-compra.service';
import { NotaCreditoCompraService } from '../../../service/nota-credito-compra.service';
import { NotaDebitoCompraService } from '../../../service/nota-debito-compra.service';
import { RetencionCompraService } from '../../../service/retencion-compra.service';

@Component({
  selector: 'app-consulta-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './consulta-documentos.component.html',
  styleUrl: './consulta-documentos.component.scss',
})
export class ConsultaDocumentosComponent implements OnInit {
  private snackBar = inject(MatSnackBar);
  private docService = inject(DocumentoCxpService);
  private facturaService = inject(FacturaCompraService);
  private detalleFacturaService = inject(DetalleFacturaCompraService);
  private formaPagoFacturaService = inject(FormaPagoFacturaCompraService);
  private liqService = inject(LiquidacionCompraCompraService);
  private detalleLiqService = inject(DetalleLiquidacionCompraCompraService);
  private formaPagoLiqService = inject(FormaPagoLiquidacionCompraCompraService);
  private ncService = inject(NotaCreditoCompraService);
  private detalleNcService = inject(DetalleNotaCreditoCompraService);
  private ndService = inject(NotaDebitoCompraService);
  private detalleNdService = inject(DetalleNotaDebitoCompraService);
  private retService = inject(RetencionCompraService);
  private detalleRetService = inject(DetalleRetencionCompraService);

  // Vista
  vista: 'lista' | 'detalle' = 'lista';
  cargando = signal(false);
  cargandoDetalle = signal(false);

  // Lista (usa DocumentoCxp estado=3 como índice)
  todosDocumentos: DocumentoCxp[] = [];
  dsDocumentos = new MatTableDataSource<DocumentoCxp>([]);
  columnas = ['tipoComprobante', 'tipoTablaDestino', 'rucEmisor', 'razonSocialEmisor', 'serieComprobante', 'fechaEmision', 'valorSinImpuestos', 'iva', 'importeTotal', 'acciones'];

  // Filtros
  filtroRuc = '';
  filtroProveedor = '';
  filtroTipo = '';
  filtroTabla = '';
  filtroFechaDesde = '';
  filtroFechaHasta = '';

  // Detalle — datos reales de la tabla destino
  docSeleccionado: DocumentoCxp | null = null;
  docReal: any = null;
  detallesDoc = new MatTableDataSource<any>([]);
  formasPagoDoc: any[] = [];
  columnasDetalle: string[] = [];

  private get idEmpresa(): number { return Number(localStorage.getItem('empresaCodigo') || localStorage.getItem('empresaId') || 1); }

  ngOnInit(): void { this.cargar(); }

  // ─── LISTA ─────────────────────────────────────────────

  cargar(): void {
    this.cargando.set(true);
    this.docService.getByEmpresaEstado(this.idEmpresa, 3).subscribe({
      next: (data) => { this.todosDocumentos = data || []; this.aplicarFiltros(); this.cargando.set(false); },
      error: () => { this.snackBar.open('No se pudo cargar los documentos', 'Cerrar', { duration: 4000 }); this.cargando.set(false); },
    });
  }

  buscar(): void { this.aplicarFiltros(); }

  limpiarFiltros(): void {
    this.filtroRuc = ''; this.filtroProveedor = ''; this.filtroTipo = '';
    this.filtroTabla = ''; this.filtroFechaDesde = ''; this.filtroFechaHasta = '';
    this.aplicarFiltros();
  }

  private aplicarFiltros(): void {
    let r = [...this.todosDocumentos];
    if (this.filtroRuc.trim()) r = r.filter(d => d.rucEmisor?.toLowerCase().includes(this.filtroRuc.trim().toLowerCase()));
    if (this.filtroProveedor.trim()) r = r.filter(d => d.razonSocialEmisor?.toLowerCase().includes(this.filtroProveedor.trim().toLowerCase()));
    if (this.filtroTipo.trim()) r = r.filter(d => d.tipoComprobante?.toLowerCase().includes(this.filtroTipo.trim().toLowerCase()));
    if (this.filtroTabla.trim()) r = r.filter(d => d.tipoTablaDestino?.toLowerCase().includes(this.filtroTabla.trim().toLowerCase()));
    if (this.filtroFechaDesde) r = r.filter(d => this.strFecha(d.fechaEmision) >= this.filtroFechaDesde);
    if (this.filtroFechaHasta) r = r.filter(d => this.strFecha(d.fechaEmision) <= this.filtroFechaHasta);
    this.dsDocumentos.data = r;
  }

  // ─── DETALLE ──────────────────────────────────────────

  verDetalle(doc: DocumentoCxp): void {
    this.docSeleccionado = doc;
    this.docReal = null;
    this.detallesDoc.data = [];
    this.formasPagoDoc = [];
    this.vista = 'detalle';
    this.cargandoDetalle.set(true);
    const id = doc.idDocumentoBD;

    switch (doc.tipoTablaDestino) {
      case 'FACTURA_COMPRA':
        this.columnasDetalle = ['descripcion', 'cantidad', 'valor', 'subTotal', 'descuento', 'baseImponible', 'porcentajeIVA', 'valorIVA', 'total'];
        forkJoin({
          cab: this.facturaService.getById(id).pipe(catchError(() => of(null))),
          det: this.detalleFacturaService.selectByCriteria({ factura: { id } }).pipe(catchError(() => of([]))),
          fp:  this.formaPagoFacturaService.selectByCriteria({ factura: { id } }).pipe(catchError(() => of([]))),
        }).subscribe(({ cab, det, fp }) => {
          this.docReal = cab; this.detallesDoc.data = det || []; this.formasPagoDoc = fp || []; this.cargandoDetalle.set(false);
        });
        break;

      case 'LIQUIDACION_COMPRA':
        this.columnasDetalle = ['descripcion', 'cantidad', 'valor', 'subTotal', 'descuento', 'baseImponible', 'porcentajeIVA', 'valorIVA', 'total'];
        forkJoin({
          cab: this.liqService.getById(id).pipe(catchError(() => of(null))),
          det: this.detalleLiqService.selectByCriteria({ liquidacion: { id } }).pipe(catchError(() => of([]))),
          fp:  this.formaPagoLiqService.selectByCriteria({ liquidacion: { id } }).pipe(catchError(() => of([]))),
        }).subscribe(({ cab, det, fp }) => {
          this.docReal = cab; this.detallesDoc.data = det || []; this.formasPagoDoc = fp || []; this.cargandoDetalle.set(false);
        });
        break;

      case 'NOTA_CREDITO_COMPRA':
        this.columnasDetalle = ['descripcion', 'cantidad', 'valor', 'subTotal', 'descuento', 'baseImponible', 'porcentajeIVA', 'valorIVA', 'total'];
        forkJoin({
          cab: this.ncService.getById(id).pipe(catchError(() => of(null))),
          det: this.detalleNcService.selectByCriteria({ notaCredito: { id } }).pipe(catchError(() => of([]))),
        }).subscribe(({ cab, det }) => {
          this.docReal = cab; this.detallesDoc.data = det || []; this.cargandoDetalle.set(false);
        });
        break;

      case 'NOTA_DEBITO_COMPRA':
        this.columnasDetalle = ['descripcion', 'valor', 'baseImponible', 'porcentajeIVA', 'valorIVA', 'total'];
        forkJoin({
          cab: this.ndService.getById(id).pipe(catchError(() => of(null))),
          det: this.detalleNdService.selectByCriteria({ notaDebito: { id } }).pipe(catchError(() => of([]))),
        }).subscribe(({ cab, det }) => {
          this.docReal = cab; this.detallesDoc.data = det || []; this.cargandoDetalle.set(false);
        });
        break;

      case 'RETENCION_COMPRA':
        this.columnasDetalle = ['codigoRetencion', 'descripcion', 'baseImponible', 'porcentaje', 'valorRetenido'];
        forkJoin({
          cab: this.retService.getById(id).pipe(catchError(() => of(null))),
          det: this.detalleRetService.selectByCriteria({ retencion: { id } }).pipe(catchError(() => of([]))),
        }).subscribe(({ cab, det }) => {
          this.docReal = cab; this.detallesDoc.data = det || []; this.cargandoDetalle.set(false);
        });
        break;

      default:
        this.cargandoDetalle.set(false);
    }
  }

  volverLista(): void { this.vista = 'lista'; this.docSeleccionado = null; this.docReal = null; }

  tieneFormasPago(): boolean { return ['FACTURA_COMPRA', 'LIQUIDACION_COMPRA'].includes(this.docSeleccionado?.tipoTablaDestino || ''); }

  // ─── HELPERS ──────────────────────────────────────────

  tipoTablaLabel(tabla: string): string {
    const map: Record<string, string> = {
      'FACTURA_COMPRA': 'Factura Compra', 'NOTA_CREDITO_COMPRA': 'Nota Crédito Compra',
      'NOTA_DEBITO_COMPRA': 'Nota Débito Compra', 'LIQUIDACION_COMPRA': 'Liquidación Compra', 'RETENCION_COMPRA': 'Retención Compra',
    };
    return map[tabla] || tabla;
  }

  tipoTablaColor(tabla: string): string {
    const map: Record<string, string> = {
      'FACTURA_COMPRA': 'chip-factura', 'NOTA_CREDITO_COMPRA': 'chip-nc',
      'NOTA_DEBITO_COMPRA': 'chip-nd', 'LIQUIDACION_COMPRA': 'chip-liq', 'RETENCION_COMPRA': 'chip-ret',
    };
    return map[tabla] || '';
  }

  toDate(value: any): Date | null {
    if (!value) return null;
    if (Array.isArray(value)) { const [y, mo, d, h = 0, m = 0, s = 0] = value as number[]; return new Date(y, mo - 1, d, h, m, s); }
    const d = new Date(value); return isNaN(d.getTime()) ? null : d;
  }

  private strFecha(val: any): string {
    if (!val) return '';
    if (Array.isArray(val)) { const [y, mo, d] = val as number[]; return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
    return String(val).substring(0, 10);
  }
}

