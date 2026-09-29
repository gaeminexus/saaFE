import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { mensajeDeError } from '../../../../../../shared/utils/mensaje-error.util';
import { CuentaBancariaTitular } from '../../../../model/cuenta-bancaria-titular';
import { CuentaBancariaTitularService } from '../../../../service/cuenta-bancaria-titular.service';
import { PagoProgramadoService } from '../../../../../cxp/service/pago-programado.service';

export interface AsignarCuentaDestinoDialogData {
  idPago: number;
  idTitular: number;
  beneficiario: string;
  idUsuario: number;
}

/**
 * Diálogo para asignar (o reasignar) la cuenta de destino de un pago POR_APROBAR —
 * docs/pagos/API-ASIGNAR-CUENTA-DESTINO.md §4.2. Estructura copiada de
 * shared/components/motivo-dialog/, que es el diálogo que esta misma bandeja ya abre para anular.
 *
 * La respuesta vacía del catálogo de cuentas llega como error 500 con "no devolvio ningun
 * registro" (mismo agujero que estado-cuenta-titular.service.ts:245-251) — se distingue de un
 * fallo real para no mostrarla como error.
 */
@Component({
  selector: 'app-asignar-cuenta-destino-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MaterialFormModule],
  template: `
    <h2 mat-dialog-title>Asignar cuenta de destino</h2>

    <mat-dialog-content>
      <p class="beneficiario">Beneficiario: <strong>{{ data.beneficiario }}</strong></p>

      @if (cargando) {
        <div class="estado-linea">
          <mat-spinner diameter="24"></mat-spinner>
          <span>Consultando cuentas del beneficiario…</span>
        </div>
      } @else if (sinCuentas) {
        <p class="aviso-sin-cuentas">
          El beneficiario no tiene cuentas bancarias activas. Cárguelas en Titulares y vuelva a intentar.
        </p>
      } @else if (errorCarga) {
        <p class="advertencia">
          {{ errorCarga }}
          <button mat-button type="button" (click)="cargarCuentas()">Reintentar</button>
        </p>
      } @else {
        <mat-form-field appearance="outline" style="width: 100%;">
          <mat-label>Cuenta de destino</mat-label>
          <mat-select [(ngModel)]="idCuentaSeleccionada" name="idCuentaSeleccionada">
            @for (c of cuentas; track c.codigo) {
              <mat-option [value]="c.codigo">{{ etiquetaCuenta(c) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }

      @if (errorAsignar) {
        <p class="advertencia">{{ errorAsignar }}</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-raised-button color="primary" [disabled]="!puedeConfirmar()" (click)="confirmar()">
        @if (asignando) {
          <mat-spinner diameter="18"></mat-spinner>
        } @else {
          Asignar
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .beneficiario {
      margin-bottom: 12px;
    }
    .advertencia {
      color: #c62828;
    }
    .aviso-sin-cuentas {
      color: #7a5c00;
    }
    .estado-linea {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `],
})
export class AsignarCuentaDestinoDialogComponent implements OnInit {
  cargando = false;
  cuentas: CuentaBancariaTitular[] = [];
  sinCuentas = false;
  errorCarga = '';
  idCuentaSeleccionada: number | null = null;
  asignando = false;
  errorAsignar = '';

  constructor(
    private dialogRef: MatDialogRef<AsignarCuentaDestinoDialogComponent, string | null>,
    @Inject(MAT_DIALOG_DATA) public data: AsignarCuentaDestinoDialogData,
    private cuentaTitularS: CuentaBancariaTitularService,
    private pagoS: PagoProgramadoService,
  ) {}

  ngOnInit(): void {
    this.cargarCuentas();
  }

  /** Mismo criterio que registro-egreso.component.ts:258-263: titular.codigo con asignaValorConCampoPadre. */
  cargarCuentas(): void {
    this.cargando = true;
    this.sinCuentas = false;
    this.errorCarga = '';

    const criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatos.LONG, 'titular', 'codigo', String(this.data.idTitular), TipoComandosBusqueda.IGUAL,
    );

    this.cuentaTitularS.selectByCriteria([criterio]).subscribe({
      next: (data) => {
        this.cargando = false;
        const activas = (data ?? []).filter((c) => this.esCuentaActiva(c));
        this.cuentas = activas;
        // Con una sola cuenta viene preseleccionada; con varias, ninguna (§5.5 del contrato: no automatizar la elección).
        this.idCuentaSeleccionada = activas.length === 1 ? activas[0].codigo : null;
      },
      error: (err) => {
        this.cargando = false;
        if (this.esRespuestaVacia(err)) {
          this.sinCuentas = true;
          this.cuentas = [];
        } else {
          this.errorCarga = mensajeDeError(err, 'No se pudieron consultar las cuentas del beneficiario');
        }
      },
    });
  }

  /** El estado nulo se trata como activo: hay cuentas antiguas sin CTBNESTD (mismo criterio que registro-egreso). */
  private esCuentaActiva(cuenta: CuentaBancariaTitular): boolean {
    return cuenta.estado == null || Number(cuenta.estado) !== 0;
  }

  /** El DAO genérico responde 500 con "no devolvio ningun registro" cuando no hay filas: no es un fallo real. */
  private esRespuestaVacia(error: unknown): boolean {
    const mensaje = this.sinTildes(mensajeDeError(error, '').toLowerCase());
    return mensaje.includes('no devolvio ningun registro') || mensaje.includes('no devolvio registros');
  }

  private sinTildes(texto: string): string {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  /** Banco, número, tipo (rubro 23, verificado contra la base: 1=Ahorros, 2=Corriente) y, si la tiene, nombreTitularCuenta. */
  etiquetaCuenta(cuenta: CuentaBancariaTitular): string {
    const banco = (cuenta.banco as { nombre?: string })?.nombre ?? 'Banco';
    const tipo = Number(cuenta.tipoCuenta) === 1 ? 'Ahorros' : Number(cuenta.tipoCuenta) === 2 ? 'Corriente' : '';
    const base = `${banco} — ${cuenta.numeroCuenta}${tipo ? ` (${tipo})` : ''}`;
    return cuenta.nombreTitularCuenta ? `${base} — ${cuenta.nombreTitularCuenta}` : base;
  }

  puedeConfirmar(): boolean {
    return this.idCuentaSeleccionada != null && !this.asignando;
  }

  confirmar(): void {
    if (!this.puedeConfirmar() || this.idCuentaSeleccionada == null) return;

    this.asignando = true;
    this.errorAsignar = '';
    this.pagoS.asignarCuentaDestino(this.data.idPago, this.idCuentaSeleccionada, this.data.idUsuario).subscribe({
      next: (resp) => {
        this.asignando = false;
        this.dialogRef.close(resp?.mensaje || 'Cuenta de destino asignada.');
      },
      error: (err: Error) => {
        this.asignando = false;
        this.errorAsignar = mensajeDeError(err, 'No se pudo asignar la cuenta');
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
