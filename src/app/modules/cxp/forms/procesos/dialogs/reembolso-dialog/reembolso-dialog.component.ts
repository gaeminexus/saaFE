import { CommonModule } from '@angular/common';
import { Component, ElementRef, Inject, ViewChild, inject } from '@angular/core';
import { FormsModule, UntypedFormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../../shared/services/funciones-datos.service';
import {
  SRI_TIPO_DOC_SUSTENTO,
  SRI_TIPO_IDENTIFICACION,
  SRI_TIPO_PROVEEDOR_REEMBOLSO,
  TARIFAS_IVA,
} from '../../../../model/catalogos-sri-reembolso';
import { ProductoPago } from '../../../../model/producto_pago';
import { ReembolsoFacturaCompra } from '../../../../model/reembolso-factura-compra';
import { CargaDocumentosService } from '../../../../service/carga-documentos.service';
import { ProductoPagoService } from '../../../../service/producto-pago.service';
import { ReembolsoFacturaCompraService } from '../../../../service/reembolso-factura-compra.service';

export interface ReembolsoDialogData {
  idFacturaCompra: number;
  reembolso: ReembolsoFacturaCompra | null;  // null = alta
  idUsuario: number;
  idEmpresa: number;
}

@Component({
  selector: 'app-reembolso-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, MatDialogModule],
  templateUrl: './reembolso-dialog.component.html',
  styleUrl: './reembolso-dialog.component.scss',
})
export class ReembolsoDialogComponent {
  private ref = inject(MatDialogRef<ReembolsoDialogComponent, boolean>);
  private reembolsoService = inject(ReembolsoFacturaCompraService);
  private productoService = inject(ProductoPagoService);
  private cargaDocumentosService = inject(CargaDocumentosService);
  private snackBar = inject(MatSnackBar);
  private funcionesDatos = inject(FuncionesDatosService);

  // Catálogos SRI
  readonly tiposIdentificacion = SRI_TIPO_IDENTIFICACION;
  readonly tiposProveedor = SRI_TIPO_PROVEEDOR_REEMBOLSO;
  readonly tiposDocSustento = SRI_TIPO_DOC_SUSTENTO;
  readonly tarifasIva = TARIFAS_IVA;

  @ViewChild('fechaEmisionInput', { read: ElementRef }) fechaInputRef!: ElementRef<HTMLInputElement>;
  fechaControl = new UntypedFormControl(new Date());
  private _rawFecha = '';

  form = {
    id: 0,
    tipoIdentificacion: '',
    identificacion: '',
    tipoProveedor: '',
    codPais: '593',
    codDoc: '01',
    establecimiento: '',
    puntoEmision: '',
    secuencial: '',
    numeroAutorizacion: '',
    baseCero: 0,
    baseGravada: 0,
    tarifaIva: 15 as number | null,
    valorIva: 0,
    valorIce: 0,
    observacion: '',
    idProducto: null as number | null,
  };

  // Producto (combo con búsqueda por nombre + código)
  productos: ProductoPago[] = [];
  productosFiltrados: ProductoPago[] = [];
  productoBusqueda = '';
  guardando = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: ReembolsoDialogData) {
    if (data.reembolso) {
      const r = data.reembolso;
      this.form = {
        id: r.id,
        tipoIdentificacion: r.tipoIdentificacionProveedor || '',
        identificacion: r.identificacionProveedor || '',
        tipoProveedor: r.tipoProveedor || '',
        codPais: r.codPaisPago || '593',
        codDoc: r.codDoc || '01',
        establecimiento: r.establecimiento || '',
        puntoEmision: r.puntoEmision || '',
        secuencial: r.secuencial || '',
        numeroAutorizacion: r.numeroAutorizacion || '',
        baseCero: r.baseImponibleCero || 0,
        baseGravada: r.baseImponibleGravada || 0,
        tarifaIva: r.tarifaIva ?? 15,
        valorIva: r.valorIva || 0,
        valorIce: r.valorIce || 0,
        observacion: r.observacion || '',
        idProducto: r.producto ?? null,
      };
      const d = this.parseAny(r.fechaEmision);
      if (d) this.fechaControl.setValue(d, { emitEvent: false });
    }
    this.cargarProductos();
  }

  get modoEdicion(): boolean { return !!this.data.reembolso; }

  get totalCalculado(): number {
    const t = Number(this.form.baseCero || 0) + Number(this.form.baseGravada || 0)
      + Number(this.form.valorIva || 0) + Number(this.form.valorIce || 0);
    return Math.round(t * 100) / 100;
  }

  get productoSeleccionadoNombre(): string {
    if (this.form.idProducto == null) return '';
    const p = this.productos.find(x => x.id === this.form.idProducto);
    return p ? `${p.nombre} (${p.codigo})` : `#${this.form.idProducto}`;
  }

  // ─── PRODUCTOS ──────────────────────────────────────────

  private cargarProductos(): void {
    this.productoService.getAll().subscribe({
      next: (data) => {
        this.productos = data || [];
        this.filtrarProductos();
      },
      error: () => { this.productos = []; this.productosFiltrados = []; },
    });
  }

  filtrarProductos(): void {
    const q = (this.productoBusqueda || '').toLowerCase().trim();
    if (!q) { this.productosFiltrados = this.productos.slice(0, 50); return; }
    // Regla de la casa: filtrar por al menos dos campos (nombre y código).
    this.productosFiltrados = this.productos
      .filter(p => p.nombre?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q))
      .slice(0, 50);
  }

  seleccionarProducto(p: ProductoPago): void {
    this.form.idProducto = p.id;
    this.productoBusqueda = `${p.nombre} (${p.codigo})`;
  }

  crearProductoPorClasificar(): void {
    const identificacion = (this.form.identificacion || '').trim();
    const nombre = `REEMBOLSO ${identificacion}`.trim();
    const codigo = identificacion || null;
    this.cargaDocumentosService.crearProductoPorClasificar(nombre, codigo, this.data.idEmpresa).subscribe({
      next: (prod: any) => {
        if (prod && prod.id != null) {
          this.productos = [prod, ...this.productos];
          this.form.idProducto = prod.id;
          this.productoBusqueda = `${prod.nombre} (${prod.codigo})`;
          this.filtrarProductos();
          this.snackBar.open('Producto creado en POR CLASIFICAR — recuerde clasificarlo antes de contabilizar', 'Cerrar', { duration: 6000, panelClass: ['warning-snackbar'] });
        } else {
          this.snackBar.open('No se pudo crear el producto', 'Cerrar', { duration: 4000, panelClass: ['snack-error'] });
        }
      },
      error: (err) => this.snackBar.open('Error al crear producto: ' + this.extraerMensajeError(err), 'Cerrar', { duration: 5000, panelClass: ['snack-error'] }),
    });
  }

  // ─── IVA AUTOCÁLCULO ────────────────────────────────────

  recalcularIva(): void {
    const base = Number(this.form.baseGravada || 0);
    const tarifa = Number(this.form.tarifaIva || 0);
    if (base > 0 && tarifa > 0) {
      this.form.valorIva = Math.round(base * tarifa) / 100;
    }
  }

  // ─── FECHA ──────────────────────────────────────────────

  capturarFechaRaw(e: Event): void { this._rawFecha = (e.target as HTMLInputElement).value; }
  syncFechaFromRaw(e: FocusEvent): void {
    const raw = (this._rawFecha || (e.target as HTMLInputElement)?.value || '').trim();
    this._rawFecha = '';
    const d = this.parseFecha(raw);
    if (d) {
      this.fechaControl.setValue(d, { emitEvent: false });
      const fmt = this.funcionesDatos.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
      setTimeout(() => { if (this.fechaInputRef?.nativeElement) this.fechaInputRef.nativeElement.value = fmt; });
    }
  }
  onPickerChange(d: Date | null | undefined): void {
    if (!d) return;
    this.fechaControl.setValue(d, { emitEvent: false });
    const fmt = this.funcionesDatos.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => { if (this.fechaInputRef?.nativeElement) this.fechaInputRef.nativeElement.value = fmt; });
  }

  // ─── GUARDAR ────────────────────────────────────────────

  private validar(): string | null {
    if (!this.form.tipoIdentificacion) return 'Seleccione el tipo de identificación del proveedor';
    if (!this.form.identificacion.trim()) return 'Ingrese la identificación del proveedor';
    if (this.form.tipoIdentificacion === '04' && this.form.identificacion.trim().length !== 13) return 'El RUC debe tener 13 dígitos';
    if (this.form.tipoIdentificacion === '05' && this.form.identificacion.trim().length !== 10) return 'La cédula debe tener 10 dígitos';
    if (!this.form.tipoProveedor) return 'Seleccione el tipo de proveedor';
    if (!this.form.codDoc) return 'Seleccione el tipo de documento sustento';
    // Establecimiento/pto/secuencial requeridos para codDoc 01/03/04/05.
    if (['01', '03', '04', '05'].includes(this.form.codDoc)) {
      if (!this.form.establecimiento || !this.form.puntoEmision || !this.form.secuencial) {
        return 'Complete establecimiento, punto de emisión y secuencial';
      }
    }
    if (!this.fechaControl.value) return 'Ingrese la fecha de emisión';
    if (this.form.idProducto == null) return 'Seleccione el producto para la contabilización';
    if (Number(this.form.baseGravada) > 0 && !this.form.tarifaIva) return 'Seleccione la tarifa de IVA para la base gravada';
    if (this.totalCalculado <= 0) return 'El total debe ser mayor que cero';
    return null;
  }

  guardar(): void {
    const err = this.validar();
    if (err) { this.snackBar.open(err, 'Cerrar', { duration: 3500 }); return; }

    const payload: Partial<ReembolsoFacturaCompra> = {
      ...(this.form.id ? { id: this.form.id, origen: this.data.reembolso!.origen } : { origen: 2 }),
      factura: { id: this.data.idFacturaCompra } as any,
      tipoIdentificacionProveedor: this.form.tipoIdentificacion,
      identificacionProveedor: this.form.identificacion.trim(),
      codPaisPago: this.form.codPais || '593',
      tipoProveedor: this.form.tipoProveedor,
      codDoc: this.form.codDoc,
      establecimiento: this.form.establecimiento,
      puntoEmision: this.form.puntoEmision,
      secuencial: this.form.secuencial,
      fechaEmision: this.toISO(this.fechaControl.value) as any,
      numeroAutorizacion: this.form.numeroAutorizacion || (undefined as any),
      baseImponibleCero: Number(this.form.baseCero) || 0,
      baseImponibleGravada: Number(this.form.baseGravada) || 0,
      tarifaIva: this.form.baseGravada > 0 ? Number(this.form.tarifaIva) : (null as any),
      valorIva: Number(this.form.valorIva) || 0,
      valorIce: Number(this.form.valorIce) || 0,
      total: this.totalCalculado,
      producto: this.form.idProducto,
      estado: 1,
    };

    this.guardando = true;
    const op$ = this.modoEdicion ? this.reembolsoService.update(payload) : this.reembolsoService.add(payload);
    op$.subscribe({
      next: () => { this.guardando = false; this.ref.close(true); },
      error: (err2) => { this.guardando = false; this.snackBar.open('Error al guardar el sustento: ' + this.extraerMensajeError(err2), 'Cerrar', { duration: 5000, panelClass: ['snack-error'] }); },
    });
  }

  cancelar(): void { this.ref.close(false); }

  // ─── HELPERS ────────────────────────────────────────────

  private extraerMensajeError(err: any): string {
    if (!err) return 'Error desconocido';
    if (typeof err === 'string') return err;
    return err?.mensaje || err?.message || err?.error || JSON.stringify(err);
  }

  private parseFecha(s: string): Date | null {
    const p = s.split('/'); if (p.length !== 3) return null;
    const [d, m, y] = p.map(Number);
    if (isNaN(d) || isNaN(m) || isNaN(y) || y < 1000) return null;
    const dt = new Date(y, m - 1, d);
    return (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) ? dt : null;
  }

  private parseAny(val: any): Date | null {
    if (!val) return null;
    if (Array.isArray(val)) { const [y, mo, d] = val as number[]; return new Date(y, mo - 1, d); }
    const d = new Date(val); return isNaN(d.getTime()) ? null : d;
  }

  private toISO(val: any): string | undefined {
    if (!val) return undefined;
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return undefined;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
