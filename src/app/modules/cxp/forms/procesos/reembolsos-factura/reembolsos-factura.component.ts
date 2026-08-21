import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { SRI_TIPO_DOC_SUSTENTO } from '../../../model/catalogos-sri-reembolso';
import { ProductoPago } from '../../../model/producto_pago';
import { CuadraturaReembolso, ReembolsoFacturaCompra } from '../../../model/reembolso-factura-compra';
import { CargaDocumentosService } from '../../../service/carga-documentos.service';
import { ProductoPagoService } from '../../../service/producto-pago.service';
import { ReembolsoFacturaCompraService } from '../../../service/reembolso-factura-compra.service';
import { ReembolsoDialogComponent, ReembolsoDialogData } from '../dialogs/reembolso-dialog/reembolso-dialog.component';

@Component({
  selector: 'app-reembolsos-factura',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './reembolsos-factura.component.html',
  styleUrl: './reembolsos-factura.component.scss',
})
export class ReembolsosFacturaComponent implements OnInit, OnChanges {
  @Input({ required: true }) idFacturaCompra!: number;
  @Input() editable = true;                    // false = solo lectura (consulta-documentos)
  @Input() contabilizacionPendiente = false;   // true → mostrar botón Contabilizar
  @Input() idUsuario = 1;
  @Input() idEmpresa = 1;
  @Output() contabilizado = new EventEmitter<void>();

  private reembolsoService = inject(ReembolsoFacturaCompraService);
  private cargaDocumentosService = inject(CargaDocumentosService);
  private productoService = inject(ProductoPagoService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  cargando = signal(false);
  procesando = signal(false);
  cuadratura = signal<CuadraturaReembolso | null>(null);
  bloqueantes = signal<string[]>([]);

  ds = new MatTableDataSource<ReembolsoFacturaCompra>([]);
  private productosMap = new Map<number, ProductoPago>();

  private readonly COLS_BASE = [
    'identificacionProveedor', 'codDoc', 'documento', 'fechaEmision', 'producto',
    'baseImponibleCero', 'baseImponibleGravada', 'valorIva', 'valorIce', 'total', 'origen',
  ];

  get columnas(): string[] {
    return this.editable ? [...this.COLS_BASE, 'acciones'] : this.COLS_BASE;
  }

  ngOnInit(): void {
    this.cargarProductos();
    this.cargar();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['idFacturaCompra'] && !changes['idFacturaCompra'].firstChange)) {
      this.cargar();
    }
  }

  private cargarProductos(): void {
    this.productoService.getAll().subscribe({
      next: (data) => {
        this.productosMap.clear();
        (data || []).forEach(p => this.productosMap.set(p.id, p));
      },
      error: () => { /* nombre de producto se muestra por id si no está */ },
    });
  }

  cargar(): void {
    if (!this.idFacturaCompra) return;
    this.cargando.set(true);
    this.reembolsoService.getByFactura(this.idFacturaCompra).subscribe({
      next: (data) => {
        this.ds.data = data || [];
        this.cargando.set(false);
      },
      error: () => { this.ds.data = []; this.cargando.set(false); },
    });
    if (this.editable) { this.refrescarCuadratura(); }
  }

  private refrescarCuadratura(): void {
    this.cargaDocumentosService.recalcularTotalesReembolso(this.idFacturaCompra).subscribe({
      next: (c) => this.cuadratura.set(c),
      error: () => this.cuadratura.set(null),
    });
  }

  // ─── TOTALES DE LA TABLA ────────────────────────────────

  get totalBase0(): number { return this.ds.data.reduce((a, r) => a + Number(r.baseImponibleCero || 0), 0); }
  get totalBaseGravada(): number { return this.ds.data.reduce((a, r) => a + Number(r.baseImponibleGravada || 0), 0); }
  get totalIva(): number { return this.ds.data.reduce((a, r) => a + Number(r.valorIva || 0), 0); }
  get totalIce(): number { return this.ds.data.reduce((a, r) => a + Number(r.valorIce || 0), 0); }
  get totalGeneral(): number { return this.ds.data.reduce((a, r) => a + Number(r.total || 0), 0); }

  // ─── CRUD ───────────────────────────────────────────────

  agregar(): void {
    this.abrirDialogo(null);
  }

  editar(r: ReembolsoFacturaCompra): void {
    this.abrirDialogo(r);
  }

  private abrirDialogo(reembolso: ReembolsoFacturaCompra | null): void {
    const data: ReembolsoDialogData = {
      idFacturaCompra: this.idFacturaCompra,
      reembolso,
      idUsuario: this.idUsuario,
      idEmpresa: this.idEmpresa,
    };
    const ref = this.dialog.open(ReembolsoDialogComponent, { data, width: '760px', maxWidth: '94vw' });
    ref.afterClosed().subscribe((ok: boolean) => {
      if (ok) { this.recalcularYRecargar(); }
    });
  }

  eliminar(r: ReembolsoFacturaCompra): void {
    if (!confirm(`¿Eliminar el documento sustento ${r.establecimiento}-${r.puntoEmision}-${r.secuencial}?`)) return;
    this.procesando.set(true);
    this.reembolsoService.delete(r.id).subscribe({
      next: () => { this.procesando.set(false); this.snackBar.open('Sustento eliminado', 'Cerrar', { duration: 3000, panelClass: ['snack-success'] }); this.recalcularYRecargar(); },
      error: (err) => { this.procesando.set(false); this.snackBar.open('Error al eliminar: ' + this.extraerMensajeError(err), 'Cerrar', { duration: 5000, panelClass: ['snack-error'] }); },
    });
  }

  /** OBLIGATORIO tras cada alta/edición/borrado: persiste totales en la cabecera y recarga. */
  private recalcularYRecargar(): void {
    this.cargaDocumentosService.recalcularTotalesReembolso(this.idFacturaCompra).subscribe({
      next: (c) => { this.cuadratura.set(c); this.cargarLista(); },
      error: () => { this.cargarLista(); },
    });
  }

  private cargarLista(): void {
    this.reembolsoService.getByFactura(this.idFacturaCompra).subscribe({
      next: (data) => { this.ds.data = data || []; },
      error: () => { this.ds.data = []; },
    });
  }

  // ─── CONTABILIZAR ───────────────────────────────────────

  contabilizar(): void {
    if (!confirm('¿Contabilizar la factura de reembolso? Se generará el asiento por los grupos de producto de los sustentos.')) return;
    this.bloqueantes.set([]);
    this.procesando.set(true);
    this.cargaDocumentosService.contabilizarReembolso(this.idFacturaCompra, this.idEmpresa, this.idUsuario).subscribe({
      next: () => {
        this.procesando.set(false);
        this.snackBar.open('Factura contabilizada', 'Cerrar', { duration: 4000, panelClass: ['snack-success'] });
        this.contabilizado.emit();
      },
      error: (err) => {
        this.procesando.set(false);
        const bloq = Array.isArray(err?.bloqueantes)
          ? err.bloqueantes.map((b: any) => typeof b === 'string' ? b : (b?.detalle || b?.tipo || JSON.stringify(b)))
          : [];
        this.bloqueantes.set(bloq);
        this.snackBar.open(this.extraerMensajeError(err), 'Cerrar', { duration: 6000, panelClass: ['snack-error'] });
      },
    });
  }

  // ─── HELPERS ────────────────────────────────────────────

  nombreProducto(id: number | null): string {
    if (id == null) return '—';
    const p = this.productosMap.get(id);
    return p ? p.nombre : `#${id}`;
  }

  esPorClasificar(id: number | null): boolean {
    if (id == null) return false;
    const p = this.productosMap.get(id);
    if (!p) return false;
    const nombreGrupo = (p.grupoProducto?.nombre || '').toUpperCase();
    return (p.nombre || '').toUpperCase().startsWith('REEMBOLSO') && nombreGrupo.includes('POR CLASIFICAR');
  }

  codDocLabel(cod: string): string {
    const o = SRI_TIPO_DOC_SUSTENTO.find(x => x.codigo === cod);
    return o ? `${cod}` : cod;
  }

  origenLabel(origen: number): string { return origen === 1 ? 'XML' : 'MANUAL'; }

  toDate(value: any): Date | null {
    if (!value) return null;
    if (Array.isArray(value)) { const [y, mo, d, h = 0, m = 0, s = 0] = value as number[]; return new Date(y, mo - 1, d, h, m, s); }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  private extraerMensajeError(err: any): string {
    if (!err) return 'Error desconocido';
    if (typeof err === 'string') return err;
    return err?.error || err?.mensaje || err?.message || JSON.stringify(err);
  }
}
