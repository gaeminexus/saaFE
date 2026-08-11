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
import { FacturaCompraSelectorDialogComponent } from '../../../dialog/factura-compra-selector-dialog/factura-compra-selector-dialog.component';
import { ResultadoAplicacionCxp } from '../../../model/aplicacion-pago-cxp';
import { FacturaCompra } from '../../../model/factura-compra';
import { AplicacionPagoCxpService } from '../../../service/aplicacion-pago-cxp.service';

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
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private readonly ROL_PROVEEDOR = 2;

  idFactura: number | null = null;
  proveedor = signal<Titular | null>(null);
  facturaElegida = signal<FacturaCompra | null>(null);
  formValor = '';
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
      this.idFactura = +id;
      this.cargarSaldo();
    }
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
      this.limpiarFactura();
      this.buscarFactura();
    });
  }

  /** Paso 2: elegir una factura pendiente del proveedor ya seleccionado. */
  buscarFactura(): void {
    const titular = this.proveedor();
    if (!titular?.codigo) {
      this.snackBar.open('Primero seleccione un proveedor', 'Cerrar', { duration: 3000 });
      return;
    }

    this.dialog.open(FacturaCompraSelectorDialogComponent, {
      width: '900px',
      maxWidth: '98vw',
      data: {
        codigoTitular: titular.codigo,
        nombreTitular: this.nombreProveedor(),
        soloPendientes: true,
      },
    }).afterClosed().subscribe((factura: FacturaCompra | null) => {
      if (!factura) return;
      this.facturaElegida.set(factura);
      this.idFactura = factura.id;
      this.cargarSaldo();
    });
  }

  nombreProveedor(): string {
    const t = this.proveedor();
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

  get valorNumerico(): number {
    const v = parseFloat(String(this.formValor).replace(',', '.'));
    return Number.isFinite(v) ? v : 0;
  }

  /**
   * Validación en cliente solo para dar feedback inmediato: el backend
   * revalida todo (incluido el saldo de anticipos, que aquí no conocemos).
   */
  get puedeConfirmar(): boolean {
    if (!this.idFactura || this.procesando()) return false;
    if (this.valorNumerico <= 0) return false;
    const pendiente = this.saldo()?.saldoPendiente;
    if (pendiente != null && this.valorNumerico > pendiente) return false;
    return true;
  }

  get excedeSaldo(): boolean {
    const pendiente = this.saldo()?.saldoPendiente;
    return pendiente != null && this.valorNumerico > pendiente;
  }

  confirmar(): void {
    if (!this.puedeConfirmar || !this.idFactura) return;

    this.procesando.set(true);
    this.error.set('');
    this.resultado.set(null);

    this.aplicacionPagoS.cruzarAnticipo({
      idFacturaCompra: this.idFactura,
      valor: this.valorNumerico,
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
        this.formValor = '';
        this.formObservacion = '';
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
