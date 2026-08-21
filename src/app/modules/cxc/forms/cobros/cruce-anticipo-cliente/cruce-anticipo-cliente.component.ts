import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { FacturaSelectorDialogComponent } from '../../../../../shared/components/factura-selector-dialog/factura-selector-dialog.component';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { SaldoFactura } from '../../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { Titular } from '../../../../tsr/model/titular';
import { ResultadoAplicacionCxc } from '../../../model/aplicacion-pago-cxc';
import { FacturaEmitir } from '../../../model/factura-emitir';
import { AplicacionPagoCxcService } from '../../../service/aplicacion-pago-cxc.service';
import { FacturaEmitirService } from '../../../service/emitir/factura-emitir.service';
import { AnticipoDisponible, AnticipoService } from '../../../../tsr/service/anticipo.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';

/**
 * Cruce de un anticipo ya recibido del cliente contra una factura de venta
 * pendiente. Los anticipos se registran en su propia pantalla (Gestionar >
 * Anticipos); aquí solo se aplica el saldo existente.
 */
@Component({
  selector: 'app-cruce-anticipo-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './cruce-anticipo-cliente.component.html',
  styleUrl: './cruce-anticipo-cliente.component.scss',
})
export class CruceAnticipoClienteComponent implements OnInit {
  private aplicacionPagoS = inject(AplicacionPagoCxcService);
  private anticipoS = inject(AnticipoService);
  private facturaS = inject(FacturaEmitirService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private readonly ROL_CLIENTE = 1;

  idFactura: number | null = null;
  cliente = signal<Titular | null>(null);
  facturaElegida = signal<FacturaEmitir | null>(null);
  formFecha: Date | null = new Date();
  formObservacion = '';

  saldo = signal<SaldoFactura | null>(null);
  cargandoSaldo = signal(false);
  procesando = signal(false);
  error = signal('');
  resultado = signal<ResultadoAplicacionCxc | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('idFactura');
    if (id) {
      this.idFactura = +id;
      this.cargarSaldo();
      // Al llegar desde la factura no viene el cliente, y sin él no se puede
      // listar de qué anticipos cruzar: se resuelve leyendo la factura.
      this.resolverClienteDeFactura(id);
    }
  }

  private resolverClienteDeFactura(idFactura: string): void {
    this.facturaS.getById(idFactura).subscribe({
      next: (factura: FacturaEmitir | null) => {
        const titular = (factura as any)?.titular;
        if (titular?.codigo) {
          this.cliente.set(titular);
          this.facturaElegida.set(factura);
          this.cargarAnticipos();
        }
      },
      error: () => {
        this.error.set('No se pudo leer la factura para conocer el cliente. '
          + 'Búsquelo manualmente para elegir los anticipos.');
      },
    });
  }

  /** Paso 1: elegir el cliente. Al elegirlo se encadena la búsqueda de facturas. */
  buscarCliente(): void {
    this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: { rolCodigo: this.ROL_CLIENTE, rolNombre: 'CLIENTE', titulo: 'Buscar Cliente' },
    }).afterClosed().subscribe((titular: Titular | null) => {
      if (!titular) return;
      this.cliente.set(titular);
      this.limpiarFactura();
      this.cargarAnticipos();
      this.buscarFactura();
    });
  }

  /** Paso 2: elegir una factura pendiente del cliente ya seleccionado. */
  buscarFactura(): void {
    const titular = this.cliente();
    if (!titular?.codigo) {
      this.snackBar.open('Primero seleccione un cliente', 'Cerrar', { duration: 3000 });
      return;
    }

    this.dialog.open(FacturaSelectorDialogComponent, {
      width: '900px',
      maxWidth: '98vw',
      data: {
        codigoTitular: titular.codigo,
        nombreTitular: this.nombreCliente(),
        soloPendientes: true,
      },
    }).afterClosed().subscribe((factura: FacturaEmitir | null) => {
      if (!factura) return;
      this.facturaElegida.set(factura);
      this.idFactura = factura.id;
      this.cargarSaldo();
    });
  }

  nombreCliente(): string {
    const t = this.cliente();
    if (!t) return '';
    return t.razonSocial || t.nombre || t.identificacion || `Titular ${t.codigo}`;
  }

  private limpiarFactura(): void {
    this.facturaElegida.set(null);
    this.idFactura = null;
    this.saldo.set(null);
    this.resultado.set(null);
  }

  cargarSaldo(): void {
    if (!this.idFactura) return;
    this.cargandoSaldo.set(true);
    this.error.set('');
    this.saldo.set(null);

    this.aplicacionPagoS.getSaldo(this.idFactura).subscribe({
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
    const titular = this.cliente();
    if (!titular?.codigo) return;

    this.cargandoAnticipos.set(true);
    this.anticipos.set([]);
    this.montos = {};

    this.anticipoS.disponiblesCliente(titular.codigo, this.idEmpresaSesion()).subscribe({
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
   * revalida todo (incluido el saldo de anticipos, que aquí no conocemos).
   */
  get puedeConfirmar(): boolean {
    if (!this.idFactura || this.procesando()) return false;
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
    if (!this.puedeConfirmar || !this.idFactura) return;

    const lineas = this.anticipos()
      .filter((a) => this.montoDe(a) > 0)
      .map((a) => ({ idAnticipo: a.id, valor: this.montoDe(a) }));

    this.procesando.set(true);
    this.error.set('');
    this.resultado.set(null);

    this.aplicacionPagoS.cruzarAnticipos({
      idFactura: this.idFactura,
      anticipos: lineas,
      fechaAplicacion: this.fechaISO(),
      idEmpresa: this.idEmpresaSesion(),
      idUsuario: this.idUsuarioSesion(),
      observacion: this.formObservacion.trim(),
    }).subscribe({
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

  formatearFecha(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  volverAAbonos(): void {
    this.router.navigate(['/menucuentasxcobrar/cobros/abonos-factura'], {
      queryParams: { idFactura: this.idFactura },
    });
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
