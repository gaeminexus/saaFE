import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { SaldoFactura } from '../../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { Titular } from '../../../../tsr/model/titular';
import {
  DocumentoCruceProveedor,
  DocumentoCruceSelectorDialogComponent,
  TipoDocumentoCruceProveedor,
} from '../../../dialog/documento-cruce-selector-dialog/documento-cruce-selector-dialog.component';
import { CruceAnticiposCxpRequest, ResultadoAplicacionCxp } from '../../../model/aplicacion-pago-cxp';
import { FacturaCompra } from '../../../model/factura-compra';
import { AplicacionPagoCxpService } from '../../../service/aplicacion-pago-cxp.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { FacturaCompraService } from '../../../service/factura-compra.service';
import { AnticipoDisponible, AnticipoService } from '../../../../tsr/service/anticipo.service';

/**
 * Cruce de un anticipo ya entregado al proveedor contra una factura de
 * compra pendiente. Los anticipos se registran en otra pantalla (Tesorería);
 * aquí solo se aplica el saldo existente.
 */
@Component({
  selector: 'app-cruce-anticipo-proveedor',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './cruce-anticipo-proveedor.component.html',
  styleUrl: './cruce-anticipo-proveedor.component.scss',
})
export class CruceAnticipoProveedorComponent implements OnInit {
  private aplicacionPagoS = inject(AplicacionPagoCxpService);
  private anticipoS = inject(AnticipoService);
  private funcionesDatos = inject(FuncionesDatosService);
  private facturaS = inject(FacturaCompraService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private readonly ROL_PROVEEDOR = 2;

  /** Id del documento elegido — factura de compra o liquidación, según `tipoDocumento`. */
  idDocumento: number | null = null;
  /** Facturas por el deep-link de `?idFactura=` de ngOnInit; el selector puede elegir liquidación. */
  tipoDocumento: TipoDocumentoCruceProveedor = 'FACTURA';
  proveedor = signal<Titular | null>(null);
  documentoElegido = signal<DocumentoCruceProveedor | null>(null);
  formFecha: Date | null = new Date();
  formObservacion = '';

  saldo = signal<SaldoFactura | null>(null);
  cargandoSaldo = signal(false);
  procesando = signal(false);
  error = signal('');
  resultado = signal<ResultadoAplicacionCxp | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('idFactura');
    if (id) {
      this.idDocumento = +id;
      this.tipoDocumento = 'FACTURA';
      this.cargarSaldo();
      // Al llegar desde la factura no viene el proveedor, y sin él no se puede
      // listar de qué anticipos cruzar: se resuelve leyendo la factura.
      this.resolverProveedorDeFactura(+id);
    }
  }

  private resolverProveedorDeFactura(idFactura: number): void {
    this.facturaS.getById(idFactura).subscribe({
      next: (factura: FacturaCompra | null) => {
        const titular = (factura as any)?.titular;
        if (titular?.codigo && factura) {
          this.proveedor.set(titular);
          this.documentoElegido.set({
            tipo: 'FACTURA',
            id: factura.id,
            numero: factura.numero,
            fecha: factura.fecha,
            total: Number(factura.total ?? 0),
            estadoPago: factura.estadoPago ?? null,
          });
          this.cargarAnticipos();
        }
      },
      error: () => {
        this.error.set('No se pudo leer la factura para conocer el proveedor. '
          + 'Búsquelo manualmente para elegir los anticipos.');
      },
    });
  }

  /** Paso 1: elegir el proveedor. Al elegirlo se encadena la búsqueda de facturas. */
  buscarProveedor(): void {
    this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: { rolCodigo: this.ROL_PROVEEDOR, rolNombre: 'PROVEEDOR', titulo: 'Buscar Proveedor' },
    }).afterClosed().subscribe((titular: Titular | null) => {
      if (!titular) return;
      this.proveedor.set(titular);
      this.limpiarDocumento();
      this.cargarAnticipos();
      this.buscarDocumento();
    });
  }

  /** Paso 2: elegir una factura o liquidación pendiente del proveedor ya seleccionado. */
  buscarDocumento(): void {
    const titular = this.proveedor();
    if (!titular?.codigo) {
      this.snackBar.open('Primero seleccione un proveedor', 'Cerrar', { duration: 3000 });
      return;
    }

    this.dialog.open(DocumentoCruceSelectorDialogComponent, {
      width: '900px',
      maxWidth: '98vw',
      data: {
        codigoTitular: titular.codigo,
        nombreTitular: this.nombreProveedor(),
        soloPendientes: true,
      },
    }).afterClosed().subscribe((doc: DocumentoCruceProveedor | null) => {
      if (!doc) return;
      this.documentoElegido.set(doc);
      this.idDocumento = doc.id;
      this.tipoDocumento = doc.tipo;
      this.cargarSaldo();
    });
  }

  nombreProveedor(): string {
    const t = this.proveedor();
    if (!t) return '';
    return t.razonSocial || t.nombre || t.identificacion || `Titular ${t.codigo}`;
  }

  private limpiarDocumento(): void {
    this.documentoElegido.set(null);
    this.idDocumento = null;
    this.tipoDocumento = 'FACTURA';
    this.saldo.set(null);
    this.resultado.set(null);
  }

  cargarSaldo(): void {
    if (!this.idDocumento) return;
    this.cargandoSaldo.set(true);
    this.error.set('');
    this.saldo.set(null);

    // ⛔ La liquidación NO usa /saldo/{id}: ese endpoint hace em.find(FacturaCompra, id) y FCTC/LQCC
    // tienen numeraciones IDENTITY independientes — devolvería el saldo de una factura ajena que
    // coincida en número, sin ningún error (docs/logica-negocio/cxp/DISENO-CRUCE-ANTICIPO-CONTRA-LIQUIDACION.md).
    const saldo$ = this.tipoDocumento === 'LIQUIDACION_COMPRA'
      ? this.aplicacionPagoS.getSaldoLiquidacion(this.idDocumento)
      : this.aplicacionPagoS.getSaldo(this.idDocumento);

    saldo$.subscribe({
      next: (saldo) => {
        this.saldo.set(saldo);
        this.cargandoSaldo.set(false);
      },
      error: (err: Error) => {
        this.cargandoSaldo.set(false);
        this.error.set(err.message);
      },
    });
  }

  // ── Anticipos disponibles ────────────────────────────────────────────────
  // El cruce ya no es "por valor contra el saldo global": el usuario elige de
  // qué anticipo sale cada abono, y el backend genera una aplicación por
  // anticipo. Eso es lo que permite anular un anticipo y deshacer exactamente
  // sus abonos.

  anticipos = signal<AnticipoDisponible[]>([]);
  cargandoAnticipos = signal(false);
  /** Monto a aplicar por anticipo, indexado por id. Vacío = no se usa. */
  montos: Record<number, string> = {};

  private cargarAnticipos(): void {
    const titular = this.proveedor();
    if (!titular?.codigo) return;

    this.cargandoAnticipos.set(true);
    this.anticipos.set([]);
    this.montos = {};

    this.anticipoS.disponiblesProveedor(titular.codigo, this.idEmpresaSesion()).subscribe({
      next: (lista) => {
        this.anticipos.set(lista ?? []);
        this.cargandoAnticipos.set(false);
      },
      error: (err: Error) => {
        this.cargandoAnticipos.set(false);
        this.anticipos.set([]);
        this.error.set(err.message);
      },
    });
  }

  montoDe(anticipo: AnticipoDisponible): number {
    const v = parseFloat(String(this.montos[anticipo.id] ?? '').replace(',', '.'));
    return Number.isFinite(v) && v > 0 ? v : 0;
  }

  excedeAnticipo(anticipo: AnticipoDisponible): boolean {
    return this.montoDe(anticipo) > Number(anticipo.saldo ?? 0) + 0.001;
  }

  get totalSeleccionado(): number {
    return this.anticipos().reduce((suma, a) => suma + this.montoDe(a), 0);
  }

  get haySeleccion(): boolean {
    return this.totalSeleccionado > 0;
  }

  get algunAnticipoExcedido(): boolean {
    return this.anticipos().some((a) => this.excedeAnticipo(a));
  }

  get saldoAnticiposTotal(): number {
    return this.anticipos().reduce((suma, a) => suma + Number(a.saldo ?? 0), 0);
  }

  /** Usa el anticipo completo en esa fila. */
  aplicarTodoDe(anticipo: AnticipoDisponible): void {
    this.montos[anticipo.id] = String(Number(anticipo.saldo ?? 0).toFixed(2));
  }

  limpiarSeleccion(): void {
    this.montos = {};
  }

  /**
   * Reparte el saldo pendiente de la factura entre los anticipos disponibles,
   * del más antiguo al más nuevo. Es un atajo: el usuario puede ajustar
   * cualquier línea después.
   */
  repartirAutomatico(): void {
    const pendiente = Number(this.saldo()?.saldoPendiente ?? 0);
    if (pendiente <= 0) return;

    this.montos = {};
    let porCubrir = pendiente;
    for (const a of this.anticipos()) {
      if (porCubrir <= 0.001) break;
      const disponible = Number(a.saldo ?? 0);
      if (disponible <= 0.001) continue;
      const toma = Math.min(disponible, porCubrir);
      this.montos[a.id] = String(toma.toFixed(2));
      porCubrir = +(porCubrir - toma).toFixed(2);
    }
  }

  /**
   * Validación en cliente solo para dar feedback inmediato: el backend
   * revalida todo (saldo de cada anticipo, saldo de la factura, estados).
   */
  get puedeConfirmar(): boolean {
    if (!this.idDocumento || this.procesando()) return false;
    if (!this.haySeleccion) return false;
    if (this.algunAnticipoExcedido) return false;
    const pendiente = this.saldo()?.saldoPendiente;
    if (pendiente != null && this.totalSeleccionado > pendiente + 0.001) return false;
    return true;
  }

  get excedeSaldo(): boolean {
    const pendiente = this.saldo()?.saldoPendiente;
    return pendiente != null && this.totalSeleccionado > pendiente + 0.001;
  }

  confirmar(): void {
    if (!this.puedeConfirmar || !this.idDocumento) return;

    const lineas = this.anticipos()
      .filter((a) => this.montoDe(a) > 0)
      .map((a) => ({ idAnticipo: a.id, valor: this.montoDe(a) }));

    this.procesando.set(true);
    this.error.set('');
    this.resultado.set(null);

    // Exactamente uno de los dos — mandar los dos da 400 en vez de "gana el primero".
    const referenciaDocumento = this.tipoDocumento === 'LIQUIDACION_COMPRA'
      ? { idLiquidacionCompra: this.idDocumento }
      : { idFacturaCompra: this.idDocumento };

    const payload: CruceAnticiposCxpRequest = {
      ...referenciaDocumento,
      anticipos: lineas,
      fechaAplicacion: this.fechaISO(),
      idEmpresa: this.idEmpresaSesion(),
      idUsuario: this.idUsuarioSesion(),
      observacion: this.formObservacion.trim(),
    };

    this.aplicacionPagoS.cruzarAnticipos(payload).subscribe({
      next: (resp) => {
        this.procesando.set(false);
        this.resultado.set(resp);
        // La respuesta ya trae el saldo actualizado: no hace falta refetch.
        this.saldo.set({
          facturaId: resp.facturaId,
          numeroFactura: resp.numeroFactura,
          total: resp.total,
          totalAplicado: resp.totalAplicado,
          saldoPendiente: resp.saldoPendiente,
          estadoPago: resp.estadoPago,
        });
        this.formObservacion = '';
        // Los saldos de los anticipos cambiaron: se recargan para que la
        // siguiente operación parta de la realidad, no de la pantalla vieja.
        this.cargarAnticipos();
        this.snackBar.open(resp.mensaje ?? 'Anticipo cruzado correctamente.', 'Cerrar', { duration: 5000 });
      },
      error: (err: Error) => {
        this.procesando.set(false);
        this.error.set(err.message);
      },
    });
  }

  volverAFactura(): void {
    this.router.navigate(['/menucuentaxpagar/procesos/consulta-documentos']);
  }

  formatearFecha(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private fechaISO(): string | undefined {
    if (!this.formFecha) return undefined;
    const d = this.formFecha instanceof Date ? this.formFecha : new Date(this.formFecha);
    if (isNaN(d.getTime())) return undefined;
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  private idEmpresaSesion(): number {
    return +(sessionStorage.getItem('idEmpresa') || localStorage.getItem('idEmpresa') || '0');
  }

  private idUsuarioSesion(): number {
    return +(sessionStorage.getItem('idUsuario') || localStorage.getItem('idUsuario') || '0');
  }
}
