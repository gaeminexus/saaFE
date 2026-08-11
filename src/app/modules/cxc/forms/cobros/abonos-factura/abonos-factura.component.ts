import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { FacturaSelectorDialogComponent } from '../../../../../shared/components/factura-selector-dialog/factura-selector-dialog.component';
import { HistorialAbonosComponent } from '../../../../../shared/components/historial-abonos/historial-abonos.component';
import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { FilaAbono, SaldoFactura } from '../../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { Titular } from '../../../../tsr/model/titular';
import { AplicacionPagoCxc } from '../../../model/aplicacion-pago-cxc';
import { FacturaEmitir } from '../../../model/factura-emitir';
import { AplicacionPagoCxcService } from '../../../service/aplicacion-pago-cxc.service';

/**
 * Historial y saldo de una factura de venta. Se llega desde la acción
 * "Ver abonos" de Consulta de Facturas, con el id en la query string.
 */
@Component({
  selector: 'app-abonos-factura',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, HistorialAbonosComponent],
  templateUrl: './abonos-factura.component.html',
  styleUrl: './abonos-factura.component.scss',
})
export class AbonosFacturaComponent implements OnInit {
  private aplicacionPagoS = inject(AplicacionPagoCxcService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private readonly ROL_CLIENTE = 1;

  idFactura: number | null = null;
  cliente = signal<Titular | null>(null);
  facturaElegida = signal<FacturaEmitir | null>(null);
  saldo = signal<SaldoFactura | null>(null);
  filas = signal<AplicacionPagoCxc[]>([]);
  cargando = signal(false);
  error = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('idFactura');
    if (id) {
      this.idFactura = +id;
      this.cargar();
    }
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
      this.facturaElegida.set(null);
      this.idFactura = null;
      this.saldo.set(null);
      this.filas.set([]);
      this.buscarFactura();
    });
  }

  /**
   * Paso 2: elegir una factura del cliente. Aquí se listan todas (no solo
   * las pendientes): el historial de una factura ya pagada también se consulta.
   */
  buscarFactura(): void {
    const titular = this.cliente();
    if (!titular?.codigo) {
      this.snackBar.open('Primero seleccione un cliente', 'Cerrar', { duration: 3000 });
      return;
    }

    this.dialog.open(FacturaSelectorDialogComponent, {
      width: '900px',
      maxWidth: '98vw',
      data: { codigoTitular: titular.codigo, nombreTitular: this.nombreCliente() },
    }).afterClosed().subscribe((factura: FacturaEmitir | null) => {
      if (!factura) return;
      this.facturaElegida.set(factura);
      this.idFactura = factura.id;
      this.cargar();
    });
  }

  nombreCliente(): string {
    const t = this.cliente();
    if (!t) return '';
    return t.razonSocial || t.nombre || t.identificacion || `Titular ${t.codigo}`;
  }

  cargar(): void {
    if (!this.idFactura) return;
    this.cargando.set(true);
    this.error.set('');

    this.aplicacionPagoS.getSaldo(this.idFactura).subscribe({
      next: (saldo) => this.saldo.set(saldo),
      error: (err: Error) => this.error.set(err.message),
    });

    this.aplicacionPagoS.getByFactura(this.idFactura, true).subscribe({
      next: (filas) => {
        this.filas.set(filas ?? []);
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.filas.set([]);
        this.cargando.set(false);
        this.error.set(err.message);
      },
    });
  }

  confirmarReverso(fila: FilaAbono): void {
    const data: MotivoDialogData = {
      titulo: `Revertir abono N° ${fila.id}`,
      advertencia:
        'El abono dejará de contar para el saldo de la factura y se reversará su asiento contable.',
      textoConfirmar: 'Sí, revertir',
    };

    this.dialog.open(MotivoDialogComponent, { width: '480px', data }).afterClosed().subscribe((motivo) => {
      if (!motivo) return;
      this.revertir(fila.id, motivo);
    });
  }

  private revertir(idAplicacion: number, motivo: string): void {
    this.aplicacionPagoS.revertir(idAplicacion, { motivo, idUsuario: this.idUsuarioSesion() }).subscribe({
      next: (resp) => {
        this.snackBar.open(resp?.mensaje ?? 'Abono reversado correctamente.', 'Cerrar', { duration: 4000 });
        this.cargar();
      },
      error: (err: Error) => this.snackBar.open(err.message, 'Cerrar', { duration: 6000 }),
    });
  }

  irACruceAnticipo(): void {
    this.router.navigate(['/menucuentasxcobrar/cobros/cruce-anticipo'], {
      queryParams: { idFactura: this.idFactura },
    });
  }

  irARegistrarCobro(): void {
    this.router.navigate(['/menucuentasxcobrar/cobros/registrar'], {
      queryParams: { idFactura: this.idFactura },
    });
  }

  volverAConsulta(): void {
    this.router.navigate(['/menucuentasxcobrar/gestionar/facturas']);
  }

  private idUsuarioSesion(): number {
    return +(sessionStorage.getItem('idUsuario') || localStorage.getItem('idUsuario') || '0');
  }
}
