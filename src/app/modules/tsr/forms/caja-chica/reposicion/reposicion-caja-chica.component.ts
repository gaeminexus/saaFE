import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { FORMA_PAGO_LABELS, FormaPagoAplicacion } from '../../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../../shared/services/app-state.service';

import { CajaChica } from '../../../model/caja-chica';
import { CuentaBancaria } from '../../../model/cuenta-bancaria';
import { ReposicionCajaChicaResponse } from '../../../model/movimiento-caja-chica';
import { SaldoCajaChica } from '../../../model/saldo-caja-chica';
import { CajaChicaService } from '../../../service/caja-chica.service';
import { ChequeService } from '../../../service/cheque.service';
import { CuentaBancariaService } from '../../../service/cuenta-bancaria.service';
import { MovimientoCajaChicaService } from '../../../service/movimiento-caja-chica.service';

/**
 * Reposición (o apertura, cuando la caja todavía no tiene saldo) de una caja
 * chica: transfiere/gira desde una cuenta bancaria hacia el fondo. Misma
 * lógica de forma de pago + cheque que registro-egreso, sin beneficiario:
 * el destino es la caja, no un tercero.
 */
@Component({
  selector: 'app-reposicion-caja-chica',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './reposicion-caja-chica.component.html',
  styleUrls: ['./reposicion-caja-chica.component.scss'],
})
export class ReposicionCajaChicaComponent implements OnInit {
  private cajaS = inject(CajaChicaService);
  private movimientoS = inject(MovimientoCajaChicaService);
  private chequeS = inject(ChequeService);
  private cuentaBancariaS = inject(CuentaBancariaService);
  private appState = inject(AppStateService);
  private snackBar = inject(MatSnackBar);

  readonly FormaPagoAplicacion = FormaPagoAplicacion;
  readonly FORMA_PAGO_LABELS = FORMA_PAGO_LABELS;

  cajas = signal<CajaChica[]>([]);
  cargandoCajas = signal(false);
  cajaSeleccionada: CajaChica | null = null;

  saldo = signal<SaldoCajaChica | null>(null);
  cargandoSaldo = signal(false);

  cuentasBancarias = signal<CuentaBancaria[]>([]);
  cuentaOrigen: CuentaBancaria | null = null;

  /**
   * Transferencia no aplica aquí: la caja chica no tiene cuenta bancaria de
   * destino, así que el backend siempre la rechaza. Solo Débito automático o
   * Cheque (ver `cuentaOrigenManejaChequera`) son formas de pago válidas para
   * reponer/aperturar una caja.
   */
  regFormaPago = signal<number>(FormaPagoAplicacion.DEBITO_AUTOMATICO);
  regChequeSiguiente = signal<number | null>(null);
  regChequeError = signal<string>('');

  valor = '';
  referencia = '';
  fecha: Date | null = new Date();
  descripcion = '';

  procesando = signal(false);
  error = signal('');
  resultado = signal<ReposicionCajaChicaResponse | null>(null);

  get cuentaOrigenManejaChequera(): boolean {
    return Number(this.cuentaOrigen?.manejaChequera) === 1;
  }

  /**
   * `SaldoCajaChica` no dice si la caja "nunca tuvo movimientos" — solo su
   * saldo actual. Con saldo 0 se trata como primer fondeo (Aperturar); es la
   * única señal disponible desde el frontend sin un endpoint nuevo.
   */
  get esApertura(): boolean {
    return Number(this.saldo()?.saldo ?? 0) === 0;
  }

  get valorNumerico(): number {
    const v = parseFloat(String(this.valor).replace(',', '.'));
    return Number.isFinite(v) ? v : 0;
  }

  get excedeSugerido(): boolean {
    const sugerido = this.saldo()?.montoSugeridoReposicion;
    return sugerido != null && this.valorNumerico > sugerido + 0.01;
  }

  ngOnInit(): void {
    this.cargarCajas();
    this.cargarCuentasBancarias();
  }

  private cargarCajas(): void {
    const idEmpresa = this.appState.getEmpresa()?.codigo;
    if (!idEmpresa) {
      this.cajas.set([]);
      this.error.set('No se pudo determinar la empresa de la sesión');
      return;
    }
    this.cargandoCajas.set(true);
    this.cajaS.activas(idEmpresa).subscribe({
      next: (data) => {
        this.cajas.set(Array.isArray(data) ? data : []);
        this.cargandoCajas.set(false);
      },
      error: () => {
        this.cajas.set([]);
        this.cargandoCajas.set(false);
      },
    });
  }

  private cargarCuentasBancarias(): void {
    this.cuentaBancariaS.getAll().subscribe({
      next: (data) => this.cuentasBancarias.set(Array.isArray(data) ? (data as CuentaBancaria[]) : []),
      error: () => this.cuentasBancarias.set([]),
    });
  }

  onCambioCaja(): void {
    this.saldo.set(null);
    this.resultado.set(null);
    this.error.set('');
    this.valor = '';
    if (!this.cajaSeleccionada) return;
    this.cargarSaldo(this.cajaSeleccionada.codigo);
  }

  private cargarSaldo(idCaja: number): void {
    this.cargandoSaldo.set(true);
    this.cajaS.saldo(idCaja).subscribe({
      next: (s) => {
        this.cargandoSaldo.set(false);
        this.saldo.set(s);
        this.valor = s?.montoSugeridoReposicion ? s.montoSugeridoReposicion.toFixed(2) : '';
      },
      error: () => {
        this.cargandoSaldo.set(false);
        this.saldo.set(null);
      },
    });
  }

  /** Cambiar de cuenta origen puede dejar sin sentido una forma de pago Cheque ya elegida. */
  onCambioCuentaOrigen(): void {
    if (this.regFormaPago() === FormaPagoAplicacion.CHEQUE && !this.cuentaOrigenManejaChequera) {
      this.regFormaPago.set(FormaPagoAplicacion.DEBITO_AUTOMATICO);
    }
    this.onCambioFormaPago();
  }

  onCambioFormaPago(): void {
    this.regChequeSiguiente.set(null);
    this.regChequeError.set('');
    if (this.regFormaPago() === FormaPagoAplicacion.CHEQUE) {
      this.cargarChequeSiguiente();
    } else {
      this.referencia = '';
    }
    this.error.set('');
  }

  private cargarChequeSiguiente(): void {
    if (!this.cuentaOrigen) return;
    this.chequeS.siguiente(this.cuentaOrigen.codigo).subscribe({
      next: (r) => {
        this.regChequeSiguiente.set(r?.numero ?? null);
        this.regChequeError.set('');
      },
      error: (err) => {
        this.regChequeSiguiente.set(null);
        this.regChequeError.set(ChequeService.mensajeError(err));
      },
    });
  }

  /** El valor no puede superar lo sugerido; se recorta al salir del campo. */
  ajustarAlSugerido(): void {
    const sugerido = this.saldo()?.montoSugeridoReposicion;
    if (sugerido != null && this.valorNumerico > sugerido + 0.01) {
      this.valor = sugerido.toFixed(2);
    }
  }

  get puedeGuardar(): boolean {
    const chequeOk = this.regFormaPago() !== FormaPagoAplicacion.CHEQUE
      || (this.regChequeSiguiente() != null && !this.regChequeError());
    return !!this.cajaSeleccionada
      && !!this.cuentaOrigen
      && this.valorNumerico > 0
      && !this.excedeSugerido
      && !!this.fecha
      && chequeOk
      && !this.procesando();
  }

  private fechaISO(fecha: Date | null): string {
    const d = fecha instanceof Date ? fecha : new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  guardar(): void {
    if (!this.puedeGuardar || !this.cajaSeleccionada || !this.cuentaOrigen) return;

    this.procesando.set(true);
    this.error.set('');
    this.resultado.set(null);

    const forma = this.regFormaPago();
    const payload = {
      idCaja: this.cajaSeleccionada.codigo,
      valor: this.valorNumerico,
      idCuentaBancariaOrigen: this.cuentaOrigen.codigo,
      formaPago: forma,
      debitoAutomatico: forma === FormaPagoAplicacion.DEBITO_AUTOMATICO,
      referencia: this.referencia.trim() || undefined,
      fecha: this.fechaISO(this.fecha),
      descripcion: this.descripcion.trim() || undefined,
      idUsuario: this.appState.getIdUsuario(),
    };

    const operacion = this.esApertura ? this.movimientoS.apertura(payload) : this.movimientoS.reposicion(payload);

    operacion.subscribe({
      next: (resp) => {
        this.procesando.set(false);
        this.resultado.set(resp);
        this.snackBar.open(
          resp.numeroCheque != null
            ? `Operación registrada. Se giró el cheque N° ${resp.numeroCheque}.`
            : 'Operación registrada.',
          'Cerrar',
          { duration: 6000 },
        );
        if (this.cajaSeleccionada) this.cargarSaldo(this.cajaSeleccionada.codigo);
      },
      error: (err) => {
        this.procesando.set(false);
        this.error.set(MovimientoCajaChicaService.mensajeError(err));
      },
    });
  }
}
