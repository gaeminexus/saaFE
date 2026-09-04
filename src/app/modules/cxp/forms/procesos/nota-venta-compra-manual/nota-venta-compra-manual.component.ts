import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule, UntypedFormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AppStateService } from '../../../../../shared/services/app-state.service';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../shared/services/funciones-datos.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { Titular } from '../../../../tsr/model/titular';
import { ProductoPago } from '../../../model/producto_pago';
import {
  BloqueanteNotaVentaManual,
  DetalleNotaVentaManual,
  FormaPagoNotaVentaManual,
  NotaVentaCompraManualRequest,
  SRI_FORMA_PAGO,
} from '../../../model/nota-venta-compra-manual';
import { ProductoPagoService } from '../../../service/producto-pago.service';
import { FacturaCompraService } from '../../../service/factura-compra.service';

/** §2 del contrato — los cinco códigos de bloqueante que puede devolver /fctc/manual. */
const TIPO_LABELS: Record<string, { label: string; icon: string }> = {
  PROVEEDOR_SIN_CUENTA:    { label: 'Proveedor sin cuenta contable CxP',          icon: 'account_balance' },
  PRODUCTO_SIN_CLASIFICAR: { label: 'Producto sin grupo asignado',                icon: 'category' },
  GRUPO_SIN_CUENTA:        { label: 'Grupo del producto sin cuenta contable',     icon: 'folder_open' },
  TIPO_ASIENTO_FALTANTE:   { label: 'Tipo de asiento de factura no configurado',  icon: 'receipt_long' },
  DOCUMENTO_DUPLICADO:     { label: 'Ya existe una nota de venta con ese número', icon: 'content_copy' },
};

/** Fila editable de la grilla de detalle. `_busqueda`/`_filtrados` son estado propio de esta fila del combo de producto. */
interface FilaDetalle {
  idProducto: number | null;
  descripcion: string;
  cantidad: number | null;
  valor: number | null;
  descuento: number;
  baseImponible: number;
  porcentajeIVA: number;
  valorIVA: number;
  codigoIVASRI: string;
  total: number;
  _busqueda: string;
  _filtrados: ProductoPago[];
}

interface FilaFormaPago {
  formaPago: string;
  valor: number | null;
  plazo: number;
  unidadTiempo: string;
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

@Component({
  selector: 'app-nota-venta-compra-manual',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './nota-venta-compra-manual.component.html',
  styleUrl: './nota-venta-compra-manual.component.scss',
})
export class NotaVentaCompraManualComponent implements OnInit {
  private appState = inject(AppStateService);
  private facturaCompraService = inject(FacturaCompraService);
  private productoService = inject(ProductoPagoService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private funcionesDatos = inject(FuncionesDatosService);

  readonly ROL_PROVEEDOR = 2;
  readonly tiposFormaPago = SRI_FORMA_PAGO;

  guardando = signal(false);
  bloqueantes = signal<BloqueanteNotaVentaManual[]>([]);
  ultimoRegistro = signal<{ numero: string; asiento: string | null; sustento: string } | null>(null);

  titular = signal<Titular | null>(null);

  form = {
    numEstablecimiento: '',
    numPtoEmision: '',
    secuencial: '',
    autorizacion: '',
    observacion: '',
    subtotal: 0,
    subcero: 0,
    descuento: 0,
    pIVA: 0,
    vIVA: 0,
    total: 0,
  };

  @ViewChild('fechaInput', { read: ElementRef }) fechaInputRef!: ElementRef<HTMLInputElement>;
  fechaControl = new UntypedFormControl(new Date());
  private _rawFecha = '';

  detalles: FilaDetalle[] = [];
  formasPago: FilaFormaPago[] = [];

  private productos: ProductoPago[] = [];
  private cargandoProductos = false;

  ngOnInit(): void {
    this.agregarFila();
    this.cargarProductos();
  }

  private get idEmpresa(): number { return this.appState.getEmpresa()?.codigo || 0; }
  private get idUsuario(): number { return this.appState.getIdUsuario(); }

  // ─── PROVEEDOR ───────────────────────────────────────────

  abrirBusquedaTitular(): void {
    const ref = this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: { rolCodigo: this.ROL_PROVEEDOR, rolNombre: 'PROVEEDOR', titulo: 'Buscar Proveedor' },
    });
    ref.afterClosed().subscribe((t: Titular | null) => { if (t) this.titular.set(t); });
  }

  // ─── PRODUCTOS (combo con búsqueda por nombre + código — regla de la casa) ──

  private cargarProductos(): void {
    this.cargandoProductos = true;
    this.productoService.getAll().subscribe({
      next: (data) => {
        this.productos = data || [];
        this.cargandoProductos = false;
        this.detalles.forEach((f) => this.filtrarProductosFila(f));
      },
      error: () => {
        this.productos = [];
        this.cargandoProductos = false;
        this.snackBar.open('No se pudo cargar el catálogo de productos', 'Cerrar', { duration: 5000, panelClass: ['snack-error'] });
      },
    });
  }

  filtrarProductosFila(fila: FilaDetalle): void {
    const q = (fila._busqueda || '').toLowerCase().trim();
    if (!q) { fila._filtrados = this.productos.slice(0, 50); return; }
    fila._filtrados = this.productos
      .filter((p) => p.nombre?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q))
      .slice(0, 50);
  }

  seleccionarProducto(fila: FilaDetalle, p: ProductoPago): void {
    fila.idProducto = p.id;
    fila._busqueda = `${p.nombre} (${p.codigo})`;
    if (!fila.descripcion.trim()) fila.descripcion = p.nombre;
  }

  productoDeFila(fila: FilaDetalle): ProductoPago | undefined {
    return fila.idProducto == null ? undefined : this.productos.find((p) => p.id === fila.idProducto);
  }

  // ─── DETALLE: filas ──────────────────────────────────────

  private filaVacia(): FilaDetalle {
    return {
      idProducto: null, descripcion: '', cantidad: null, valor: null, descuento: 0,
      baseImponible: 0, porcentajeIVA: 0, valorIVA: 0, codigoIVASRI: '', total: 0,
      _busqueda: '', _filtrados: this.productos.slice(0, 50),
    };
  }

  agregarFila(): void { this.detalles.push(this.filaVacia()); }

  quitarFila(i: number): void { this.detalles.splice(i, 1); }

  /** Recalcula base/IVA/total de la fila a partir de cantidad·valor. El usuario puede
   * sobrescribir el resultado a mano después — el físico manda (§1 del contrato). */
  recalcularFila(fila: FilaDetalle): void {
    const cantidad = Number(fila.cantidad) || 0;
    const valor = Number(fila.valor) || 0;
    const descuento = Number(fila.descuento) || 0;
    fila.baseImponible = round2(cantidad * valor - descuento);
    fila.valorIVA = round2(fila.baseImponible * (Number(fila.porcentajeIVA) || 0) / 100);
    fila.total = round2(fila.baseImponible + fila.valorIVA);
  }

  // ─── FORMAS DE PAGO (opcional) ───────────────────────────

  agregarFormaPago(): void {
    this.formasPago.push({ formaPago: '01', valor: null, plazo: 0, unidadTiempo: 'dias' });
  }

  quitarFormaPago(i: number): void { this.formasPago.splice(i, 1); }

  // ─── SUMAS DEL DETALLE VS. TOTALES TIPEADOS ──────────────
  // Requisito explícito del contrato (§1): el servidor NO recalcula desde el detalle, así que
  // el frontend tiene que mostrar la suma y avisar si no cuadra con lo que se va a mandar.

  get sumaDetalleBase(): number { return round2(this.detalles.reduce((a, f) => a + (Number(f.baseImponible) || 0), 0)); }
  get sumaDetalleIva(): number { return round2(this.detalles.reduce((a, f) => a + (Number(f.valorIVA) || 0), 0)); }
  get sumaDetalleTotal(): number { return round2(this.detalles.reduce((a, f) => a + (Number(f.total) || 0), 0)); }

  get diferenciaTotal(): number { return round2((Number(this.form.total) || 0) - this.sumaDetalleTotal); }
  get totalCuadra(): boolean { return Math.abs(this.diferenciaTotal) < 0.01; }

  /** Atajo: copia la suma del detalle a los totales de cabecera, sin obligar a retipear. */
  igualarTotalesConDetalle(): void {
    this.form.subtotal = this.sumaDetalleBase;
    this.form.vIVA = this.sumaDetalleIva;
    this.form.total = this.sumaDetalleTotal;
  }

  get sumaFormasPago(): number { return round2(this.formasPago.reduce((a, f) => a + (Number(f.valor) || 0), 0)); }

  // ─── FECHA ────────────────────────────────────────────────

  capturarFechaRaw(e: Event): void { this._rawFecha = (e.target as HTMLInputElement).value; }

  syncFechaFromRaw(e: FocusEvent): void {
    const raw = (this._rawFecha || (e.target as HTMLInputElement)?.value || '').trim();
    this._rawFecha = '';
    if (!raw) return;
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

  private parseFecha(s: string): Date | null {
    const p = s.split('/'); if (p.length !== 3) return null;
    const [d, m, y] = p.map(Number);
    if (isNaN(d) || isNaN(m) || isNaN(y) || y < 1000) return null;
    const dt = new Date(y, m - 1, d);
    return (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) ? dt : null;
  }

  // ─── VALIDAR Y GUARDAR ────────────────────────────────────

  private validar(): string | null {
    if (!this.titular()) return 'Seleccione el proveedor';
    if (!this.form.numEstablecimiento.trim() || !this.form.numPtoEmision.trim() || !this.form.secuencial.trim()) {
      return 'Complete establecimiento, punto de emisión y secuencial';
    }
    if (!this.fechaControl.value) return 'Ingrese la fecha de emisión';
    if (this.detalles.length === 0) return 'Agregue al menos una línea de detalle';
    for (const f of this.detalles) {
      if (f.idProducto == null) return 'Seleccione el producto en todas las líneas del detalle';
      if (!f.descripcion.trim()) return 'Ingrese la descripción en todas las líneas del detalle';
      if (!(Number(f.cantidad) > 0)) return 'La cantidad debe ser mayor que cero en todas las líneas';
    }
    if (!(Number(this.form.total) > 0)) return 'El total de la nota de venta debe ser mayor que cero';
    return null;
  }

  guardar(): void {
    const error = this.validar();
    if (error) { this.snackBar.open(error, 'Cerrar', { duration: 4000 }); return; }

    this.bloqueantes.set([]);
    const detalles: DetalleNotaVentaManual[] = this.detalles.map((f) => ({
      idProducto: f.idProducto!,
      descripcion: f.descripcion.trim(),
      cantidad: Number(f.cantidad),
      valor: Number(f.valor) || 0,
      descuento: Number(f.descuento) || 0,
      baseImponible: Number(f.baseImponible) || 0,
      porcentajeIVA: Number(f.porcentajeIVA) || 0,
      valorIVA: Number(f.valorIVA) || 0,
      codigoIVASRI: f.codigoIVASRI || undefined,
      total: Number(f.total) || 0,
    }));

    const formasPago: FormaPagoNotaVentaManual[] | undefined = this.formasPago.length
      ? this.formasPago.map((f) => ({
          formaPago: f.formaPago,
          valor: Number(f.valor) || 0,
          plazo: Number(f.plazo) || 0,
          unidadTiempo: f.unidadTiempo || 'dias',
        }))
      : undefined;

    const payload: NotaVentaCompraManualRequest = {
      idEmpresa: this.idEmpresa,
      idUsuario: this.idUsuario,
      idTitular: this.titular()!.codigo,
      numEstablecimiento: this.form.numEstablecimiento.trim(),
      numPtoEmision: this.form.numPtoEmision.trim(),
      secuencial: this.form.secuencial.trim(),
      autorizacion: this.form.autorizacion.trim() || undefined,
      // ISO local sin zona (yyyy-MM-ddT00:00:00) — nunca un Date crudo ni nada terminado en "Z".
      fecha: this.funcionesDatos.formatearFechaParaBackend(this.fechaControl.value, TipoFormatoFechaBackend.FECHA_HORA_ISO)!,
      observacion: this.form.observacion.trim() || undefined,
      subtotal: Number(this.form.subtotal) || 0,
      subcero: Number(this.form.subcero) || 0,
      descuento: Number(this.form.descuento) || 0,
      pIVA: Number(this.form.pIVA) || 0,
      vIVA: Number(this.form.vIVA) || 0,
      total: Number(this.form.total) || 0,
      detalles,
      formasPago,
    };

    this.guardando.set(true);
    this.facturaCompraService.registrarManual(payload).subscribe({
      next: (resp) => {
        this.guardando.set(false);
        if (resp.exito === false) {
          this.bloqueantes.set(resp.bloqueantes || []);
          this.snackBar.open(
            `No se registró: ${resp.bloqueantes?.length ?? 0} condición(es) bloqueante(s). Revise el detalle abajo.`,
            'Cerrar', { duration: 7000, panelClass: ['snack-error'] },
          );
          return;
        }
        this.ultimoRegistro.set({ numero: resp.numero, asiento: resp.asiento, sustento: resp.sustento });
        this.snackBar.open(resp.mensaje || `Nota de venta ${resp.numero} registrada.`, 'Cerrar', { duration: 7000 });
        this.resetFormulario();
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open('Error al registrar la nota de venta: ' + mensajeDeError(err), 'Cerrar', { duration: 7000, panelClass: ['snack-error'] });
      },
    });
  }

  tipoLabel(tipo: string): string { return TIPO_LABELS[tipo]?.label ?? tipo; }
  tipoIcon(tipo: string): string { return TIPO_LABELS[tipo]?.icon ?? 'error_outline'; }

  private resetFormulario(): void {
    this.titular.set(null);
    this.form = { numEstablecimiento: '', numPtoEmision: '', secuencial: '', autorizacion: '', observacion: '', subtotal: 0, subcero: 0, descuento: 0, pIVA: 0, vIVA: 0, total: 0 };
    this.fechaControl.setValue(new Date(), { emitEvent: false });
    setTimeout(() => { if (this.fechaInputRef?.nativeElement) this.fechaInputRef.nativeElement.value = this.funcionesDatos.formatoFecha(new Date(), FuncionesDatosService.SOLO_FECHA) || ''; });
    this.detalles = [];
    this.agregarFila();
    this.formasPago = [];
    this.bloqueantes.set([]);
  }
}
