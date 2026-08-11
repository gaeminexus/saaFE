import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { HistorialAbonosComponent } from '../../../../../shared/components/historial-abonos/historial-abonos.component';
import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { FilaAbono, SaldoFactura } from '../../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { AplicacionPagoCxp } from '../../../model/aplicacion-pago-cxp';
import { AplicacionPagoCxpService } from '../../../service/aplicacion-pago-cxp.service';

/**
 * Historial y saldo de una factura de compra. Se embebe en el detalle de
 * la factura (consulta-documentos) y resuelve por sí mismo las llamadas a
 * /aplp, más la navegación hacia las pantallas de cruce y de pagos.
 */
@Component({
  selector: 'app-historial-abonos-factura',
  standalone: true,
  imports: [CommonModule, HistorialAbonosComponent],
  template: `
    <app-historial-abonos
      [saldo]="saldo()"
      [filas]="filas()"
      [cargando]="cargando()"
      [error]="error()"
      textoBotonPago="Ir a Pagos"
      (revertir)="confirmarReverso($event)"
      (cruzarAnticipo)="irACruceAnticipo()"
      (irAPagos)="irAPagos()">
    </app-historial-abonos>
  `,
})
export class HistorialAbonosFacturaComponent implements OnChanges {
  private aplicacionPagoS = inject(AplicacionPagoCxpService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  /** Id de la factura de compra cuyo historial se muestra. */
  @Input({ required: true }) idFactura!: number;

  saldo = signal<SaldoFactura | null>(null);
  filas = signal<AplicacionPagoCxp[]>([]);
  cargando = signal(false);
  error = signal('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['idFactura'] && this.idFactura) {
      this.cargar();
    }
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
    const idUsuario = this.idUsuarioSesion();
    this.aplicacionPagoS.revertir(idAplicacion, { motivo, idUsuario }).subscribe({
      next: (resp) => {
        this.snackBar.open(resp?.mensaje ?? 'Abono reversado correctamente.', 'Cerrar', { duration: 4000 });
        this.cargar();
      },
      error: (err: Error) => this.snackBar.open(err.message, 'Cerrar', { duration: 6000 }),
    });
  }

  irACruceAnticipo(): void {
    this.router.navigate(['/menucuentaxpagar/pagos/cruce-anticipo'], {
      queryParams: { idFactura: this.idFactura },
    });
  }

  irAPagos(): void {
    this.router.navigate(['/menucuentaxpagar/pagos/transferencias'], {
      queryParams: { idFactura: this.idFactura },
    });
  }

  private idUsuarioSesion(): number {
    return +(sessionStorage.getItem('idUsuario') || localStorage.getItem('idUsuario') || '0');
  }
}
