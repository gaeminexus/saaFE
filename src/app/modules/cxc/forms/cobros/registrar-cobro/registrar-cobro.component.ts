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
import { CuentaBancaria } from '../../../../tsr/model/cuenta-bancaria';
import { Titular } from '../../../../tsr/model/titular';
import { CuentaBancariaService } from '../../../../tsr/service/cuenta-bancaria.service';
import { ResultadoAplicacionCxc } from '../../../model/aplicacion-pago-cxc';
import { FacturaEmitir } from '../../../model/factura-emitir';
import { AplicacionPagoCxcService } from '../../../service/aplicacion-pago-cxc.service';

/**
 * Registro de un cobro recibido por transferencia. Un solo paso: al
 * confirmar, el backend ya genera el asiento y el movimiento bancario.
 * Admite repetirse sobre la misma factura para cobros parciales.
 */
@Component({
  selector: 'app-registrar-cobro',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './registrar-cobro.component.html',
  styleUrl: './registrar-cobro.component.scss',
})
export class RegistrarCobroComponent implements OnInit {
  private aplicacionPagoS = inject(AplicacionPagoCxcService);
  private cuentaBancariaS = inject(CuentaBancariaService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private readonly ROL_CLIENTE = 1;

  idFactura: number | null = null;
  cliente = signal<Titular | null>(null);
  facturaElegida = signal<FacturaEmitir | null>(null);
  formValor = '';
  formFecha: Date | null = new Date();
  formNumeroTransferencia = '';
  formCuentaBancaria: CuentaBancaria | null = null;
  formObservacion = '';

  cuentasBancarias = signal<CuentaBancaria[]>([]);
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
    }
    this.cargarCuentasBancarias();
  }

  private cargarCuentasBancarias(): void {
    const idEmpresa = this.idEmpresaSesion();
    this.cuentaBancariaS.getAll().subscribe({
      next: (data) => {
        let lista = Array.isArray(data) ? data : [];
        if (idEmpresa) {
          lista = lista.filter(
            (c: any) => c.banco?.empresa?.codigo === idEmpresa || c.empresa?.codigo === idEmpresa
          );
        }
        this.cuentasBancarias.set(lista);
      },
      error: () => this.cuentasBancarias.set([]),
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

  get valorNumerico(): number {
    const v = parseFloat(String(this.formValor).replace(',', '.'));
    return Number.isFinite(v) ? v : 0;
  }

  /** El número de transferencia es obligatorio por regla de negocio, no solo técnica. */
  get faltaNumeroTransferencia(): boolean {
    return !this.formNumeroTransferencia.trim();
  }

  get excedeSaldo(): boolean {
    const pendiente = this.saldo()?.saldoPendiente;
    return pendiente != null && this.valorNumerico > pendiente;
  }

  get puedeConfirmar(): boolean {
    if (!this.idFactura || this.procesando()) return false;
    if (this.valorNumerico <= 0) return false;
    if (this.faltaNumeroTransferencia) return false;
    if (!this.formCuentaBancaria) return false;
    return !this.excedeSaldo;
  }

  confirmar(): void {
    if (!this.puedeConfirmar || !this.idFactura || !this.formCuentaBancaria) return;

    this.procesando.set(true);
    this.error.set('');
    this.resultado.set(null);

    this.aplicacionPagoS.cobroTransferencia({
      idFactura: this.idFactura,
      valor: this.valorNumerico,
      fechaCobro: this.fechaISO(),
      numeroTransferencia: this.formNumeroTransferencia.trim(),
      idCuentaBancaria: this.formCuentaBancaria.codigo,
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
        this.formNumeroTransferencia = '';
        this.formObservacion = '';
        this.snackBar.open(resp.mensaje ?? 'Cobro registrado correctamente.', 'Cerrar', { duration: 5000 });
      },
      error: (err: Error) => {
        this.procesando.set(false);
        this.error.set(err.message);
      },
    });
  }

  volverAAbonos(): void {
    this.router.navigate(['/menucuentasxcobrar/cobros/abonos-factura'], {
      queryParams: { idFactura: this.idFactura },
    });
  }

  etiquetaCuenta(cuenta: CuentaBancaria): string {
    return `${cuenta.banco?.nombre ?? 'Banco'} — ${cuenta.numeroCuenta}`;
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
