import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';

import { Banco } from '../../../tsr/model/banco';
import { CuentaAsoprep } from '../../model/cuenta-asoprep';
import { DatosPago } from '../../model/datos-pago';
import { Prestamo } from '../../model/prestamo';

export interface PagoCuotaDialogData {
  prestamo: Prestamo;
  bancos: Banco[];
  cuentasAsoprep: CuentaAsoprep[];
}

@Component({
  selector: 'app-pago-cuota-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatRadioModule,
    MatIconModule,
    MatProgressSpinnerModule,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './pago-cuota-dialog.component.html',
  styleUrls: ['./pago-cuota-dialog.component.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' })),
      ]),
    ]),
  ],
})
export class PagoCuotaDialogComponent implements OnInit {
  pagoForm!: FormGroup;
  loading = false;
  montoMinimo = 1;
  montoMaximo: number;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<PagoCuotaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PagoCuotaDialogData
  ) {
    // Monto máximo = saldo total del préstamo
    this.montoMaximo = data.prestamo.saldoTotal || 0;
  }

  ngOnInit(): void {
    this.initForm();
    this.setupFormListeners();
  }

  initForm(): void {
    this.pagoForm = this.fb.group({
      tipoPago: ['TRANSFERENCIA', Validators.required],
      fecha: [new Date(), Validators.required],
      monto: [
        0,
        [Validators.required, Validators.min(this.montoMinimo), Validators.max(this.montoMaximo)],
      ],
      codigoCuentaAsoprep: [null, Validators.required],
      // Campos condicionales - Transferencia
      codigoBanco: [null],
      numeroReferencia: [''],
      // Campos condicionales - Depósito
      numeroPapeleta: [''],
    });
  }

  setupFormListeners(): void {
    // Escuchar cambios en tipo de pago para validaciones dinámicas
    this.pagoForm.get('tipoPago')?.valueChanges.subscribe((tipoPago) => {
      this.actualizarValidaciones(tipoPago);
    });

    // Inicializar validaciones del tipo por defecto
    this.actualizarValidaciones('TRANSFERENCIA');
  }

  actualizarValidaciones(tipoPago: string): void {
    const bancoControl = this.pagoForm.get('codigoBanco');
    const referenciaControl = this.pagoForm.get('numeroReferencia');
    const papeletaControl = this.pagoForm.get('numeroPapeleta');

    if (tipoPago === 'TRANSFERENCIA') {
      // Transferencia: requiere banco y referencia, papeleta no
      bancoControl?.setValidators([Validators.required]);
      referenciaControl?.setValidators([Validators.required, Validators.minLength(6)]);
      papeletaControl?.clearValidators();
      papeletaControl?.setValue('');
    } else if (tipoPago === 'DEPOSITO') {
      // Depósito: requiere papeleta, no banco ni referencia
      bancoControl?.clearValidators();
      bancoControl?.setValue(null);
      referenciaControl?.clearValidators();
      referenciaControl?.setValue('');
      papeletaControl?.setValidators([Validators.required, Validators.minLength(5)]);
    }

    bancoControl?.updateValueAndValidity();
    referenciaControl?.updateValueAndValidity();
    papeletaControl?.updateValueAndValidity();
  }

  get esTransferencia(): boolean {
    return this.pagoForm.get('tipoPago')?.value === 'TRANSFERENCIA';
  }

  get esDeposito(): boolean {
    return this.pagoForm.get('tipoPago')?.value === 'DEPOSITO';
  }

  get montoValido(): boolean {
    const montoControl = this.pagoForm.get('monto');
    return montoControl ? montoControl.valid : false;
  }

  get errorMonto(): string {
    const montoControl = this.pagoForm.get('monto');
    if (montoControl?.hasError('required')) {
      return 'El monto es requerido';
    }
    if (montoControl?.hasError('min')) {
      return `El monto mínimo es $${this.montoMinimo}`;
    }
    if (montoControl?.hasError('max')) {
      return `El monto máximo es $${this.montoMaximo.toFixed(2)}`;
    }
    return '';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.pagoForm.invalid) {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.pagoForm.controls).forEach((key) => {
        this.pagoForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading = true;

    const datosPago: DatosPago = {
      tipoPago: this.pagoForm.value.tipoPago,
      fecha: this.pagoForm.value.fecha,
      monto: this.pagoForm.value.monto,
      codigoCuentaAsoprep: this.pagoForm.value.codigoCuentaAsoprep,
    };

    if (this.esTransferencia) {
      datosPago.codigoBanco = this.pagoForm.value.codigoBanco;
      datosPago.numeroReferencia = this.pagoForm.value.numeroReferencia;
    } else {
      datosPago.numeroPapeleta = this.pagoForm.value.numeroPapeleta;
    }

    // Simular delay de procesamiento
    setTimeout(() => {
      this.loading = false;
      this.dialogRef.close(datosPago);
    }, 500);
  }

  getCuentaLabel(cuenta: CuentaAsoprep): string {
    return `${cuenta.numeroCuenta} - ${cuenta.tipoCuenta} (${cuenta.banco})`;
  }
}
