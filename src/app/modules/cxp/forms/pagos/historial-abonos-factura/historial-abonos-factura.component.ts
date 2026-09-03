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

export type TipoDocumentoAbonos = 'FACTURA' | 'LIQUIDACION';

/**
 * Historial y saldo de una factura de compra **o de una liquidación de compra** — se embebe en
 * el detalle de `consulta-documentos` y resuelve por sí mismo las llamadas a `/aplp`, más la
 * navegación hacia las pantallas de cruce y de pagos.
 *
 * **Dos ramas, no una tercera pantalla ni un `if` por cada llamada.** El nombre del componente
 * sigue diciendo "factura" — no se renombra en este cambio, es aparte — pero desde adentro ya
 * sirve a los dos tipos, tal como `cruce-anticipo-proveedor.component.ts` resuelve el mismo par
 * (`getSaldo`/`getSaldoLiquidacion`) para el saldo.
 *
 * ⛔ **`getByFactura`/`getSaldo` nunca se llaman con el id de una liquidación**: `FCTC` y `LQCC`
 * tienen numeraciones `IDENTITY` independientes, así que devolverían el historial o el saldo de
 * una factura ajena que coincida en número — sin ningún error. Es la misma trampa que ya
 * documentan `cruce-anticipo-proveedor.component.ts:158-160` y `aplicacion-pago-cxp.service.ts`.
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
      [mostrarBotonPagos]="tipoDocumento === 'FACTURA'"
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

  /** Id de la factura o liquidación de compra cuyo historial se muestra. */
  @Input({ required: true }) idDocumento!: number;
  /** Qué es `idDocumento`. Decide qué par de endpoints de `/aplp` se llama. */
  @Input() tipoDocumento: TipoDocumentoAbonos = 'FACTURA';

  saldo = signal<SaldoFactura | null>(null);
  filas = signal<AplicacionPagoCxp[]>([]);
  cargando = signal(false);
  error = signal('');

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['idDocumento'] || changes['tipoDocumento']) && this.idDocumento) {
      this.cargar();
    }
  }

  cargar(): void {
    if (!this.idDocumento) return;
    this.cargando.set(true);
    this.error.set('');

    const esLiquidacion = this.tipoDocumento === 'LIQUIDACION';
    const saldo$ = esLiquidacion
      ? this.aplicacionPagoS.getSaldoLiquidacion(this.idDocumento)
      : this.aplicacionPagoS.getSaldo(this.idDocumento);
    const filas$ = esLiquidacion
      ? this.aplicacionPagoS.getByLiquidacion(this.idDocumento, true)
      : this.aplicacionPagoS.getByFactura(this.idDocumento, true);

    saldo$.subscribe({
      next: (saldo) => this.saldo.set(saldo),
      error: (err: Error) => this.error.set(err.message),
    });

    filas$.subscribe({
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
        'El abono dejará de contar para el saldo y se reversará su asiento contable.',
      textoConfirmar: 'Sí, revertir',
    };

    this.dialog.open(MotivoDialogComponent, { width: '480px', data }).afterClosed().subscribe((motivo) => {
      if (!motivo) return;
      this.revertir(fila.id, motivo);
    });
  }

  /** `revertir` opera sobre el id propio de la aplicación: no distingue factura de liquidación. */
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

  /**
   * Para factura, deep-link directo (como antes). Para liquidación, `cruce-anticipo-proveedor`
   * no resuelve `?idFactura=` como liquidación —solo sabe hacerlo con una factura, ver su
   * `ngOnInit`—, así que se navega sin parámetro: el usuario elige proveedor y documento a mano
   * en la misma pantalla, que sí soporta liquidaciones en su selector. Extender ese deep-link es
   * trabajo de otra pantalla, no de este ítem.
   */
  irACruceAnticipo(): void {
    if (this.tipoDocumento === 'LIQUIDACION') {
      this.router.navigate(['/menucuentaxpagar/pagos/cruce-anticipo']);
      return;
    }
    this.router.navigate(['/menucuentaxpagar/pagos/cruce-anticipo'], {
      queryParams: { idFactura: this.idDocumento },
    });
  }

  /**
   * `pagos-transferencia` es exclusivamente de facturas hoy —no tiene ningún concepto de
   * liquidación—, así que este botón no se ofrece para liquidaciones (`mostrarBotonPagos` en la
   * plantilla). Este método no debería poder dispararse para una liquidación; si llegara a
   * pasar, no navega en lugar de mandar a una pantalla que no sabría qué hacer con el id.
   */
  irAPagos(): void {
    if (this.tipoDocumento === 'LIQUIDACION') return;
    this.router.navigate(['/menucuentaxpagar/pagos/transferencias'], {
      queryParams: { idFactura: this.idDocumento },
    });
  }

  private idUsuarioSesion(): number {
    return +(sessionStorage.getItem('idUsuario') || localStorage.getItem('idUsuario') || '0');
  }
}
