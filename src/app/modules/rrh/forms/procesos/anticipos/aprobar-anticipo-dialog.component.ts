import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { FormaPagoAplicacion } from '../../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { CuentaBancaria } from '../../../../tsr/model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../../tsr/service/cuenta-bancaria.service';
import { opcionesAviso } from '../../comunes/avisos';
import { AnticipoTrabajador, AprobarAnticipoRequest, ResultadoAprobarAnticipo } from '../../../model/anticipo-trabajador';
import { AnticipoTrabajadorService } from '../../../service/anticipo-trabajador.service';

export interface AprobarAnticipoDialogData {
  anticipo: AnticipoTrabajador;
}

/**
 * Aprobar un anticipo: el pago nace CONFIRMADO en la misma llamada (igual
 * que caja chica), así que solo se ofrece Cheque o Débito automático — no
 * hay datos bancarios del empleado capturados para armar una transferencia.
 */
@Component({
  selector: 'app-aprobar-anticipo-dialog',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './aprobar-anticipo-dialog.component.html',
  styleUrls: ['./aprobar-anticipo-dialog.component.scss'],
})
export class AprobarAnticipoDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<AprobarAnticipoDialogComponent, ResultadoAprobarAnticipo | null>);
  private cuentaBancariaService = inject(CuentaBancariaService);
  private anticipoService = inject(AnticipoTrabajadorService);
  private appState = inject(AppStateService);
  private snackBar = inject(MatSnackBar);

  readonly FormaPagoAplicacion = FormaPagoAplicacion;

  cuentas = signal<CuentaBancaria[]>([]);
  cuentaOrigen = signal<CuentaBancaria | null>(null);
  formaPago = signal<number>(FormaPagoAplicacion.DEBITO_AUTOMATICO);
  referencia = signal<string>('');

  guardando = signal<boolean>(false);
  errorMsg = signal<string>('');

  get cuentaOrigenManejaChequera(): boolean {
    return Number(this.cuentaOrigen()?.manejaChequera) === 1;
  }

  empleadoNombre(): string {
    const empleado = this.data.anticipo.empleado;
    if (!empleado) return '';
    return `${empleado.apellidos ?? ''} ${empleado.nombres ?? ''}`.replace(/\s+/g, ' ').trim();
  }

  get puedeAprobar(): boolean {
    if (!this.cuentaOrigen() || this.guardando()) return false;
    if (this.formaPago() === FormaPagoAplicacion.CHEQUE && !this.cuentaOrigenManejaChequera) return false;
    return true;
  }

  constructor(@Inject(MAT_DIALOG_DATA) public data: AprobarAnticipoDialogData) {}

  ngOnInit(): void {
    this.cuentaBancariaService.getAll().subscribe({
      next: (data) => this.cuentas.set(Array.isArray(data) ? (data as CuentaBancaria[]) : []),
      error: () => this.cuentas.set([]),
    });
  }

  onCambioCuentaOrigen(): void {
    if (this.formaPago() === FormaPagoAplicacion.CHEQUE && !this.cuentaOrigenManejaChequera) {
      this.formaPago.set(FormaPagoAplicacion.DEBITO_AUTOMATICO);
    }
  }

  aprobar(): void {
    const cuenta = this.cuentaOrigen();
    if (!this.puedeAprobar || !cuenta) return;

    const payload: AprobarAnticipoRequest = {
      idCuentaBancariaOrigen: cuenta.codigo,
      formaPago: this.formaPago(),
      debitoAutomatico: this.formaPago() === FormaPagoAplicacion.DEBITO_AUTOMATICO,
      referencia: this.referencia().trim() || undefined,
      idUsuario: this.appState.getIdUsuario(),
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    this.anticipoService.aprobar(this.data.anticipo.codigo, payload).subscribe({
      next: (resultado) => {
        this.guardando.set(false);
        this.snackBar.open('Anticipo aprobado y pagado', 'Cerrar', opcionesAviso(false, 'Anticipo aprobado y pagado'));
        this.dialogRef.close(resultado);
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorMsg.set(mensajeDeError(err, 'No se pudo aprobar el anticipo'));
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
