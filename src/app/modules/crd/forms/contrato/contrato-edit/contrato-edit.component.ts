import { Component, ElementRef, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ContratoService } from '../../../service/contrato.service';
import { Contrato } from '../../../model/contrato';
import { CanComponentDeactivate } from '../../../../../shared/guard/can-deactivate.guard';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';

@Component({
  selector: 'app-contrato-edit',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatCardModule, MatDatepickerModule,
    MatProgressSpinnerModule, MatSnackBarModule
  ],
  templateUrl: './contrato-edit.component.html',
  styleUrls: ['./contrato-edit.component.scss']
})
export class ContratoEditComponent implements OnInit, CanComponentDeactivate {
  @ViewChild('fechaInicioInput', { read: ElementRef }) fechaInicioInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaFinInput', { read: ElementRef }) fechaFinInputRef!: ElementRef<HTMLInputElement>;
  private _rawFechaInicio = '';
  private _rawFechaFin = '';

  form!: FormGroup;
  loading = signal<boolean>(false);
  error = signal<string>('');
  editMode = signal<boolean>(false);
  codigoContrato: number = 0;
  formularioModificado = signal<boolean>(false);

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private contratoService: ContratoService,
    private snackBar: MatSnackBar,
    private funcionesDatosS: FuncionesDatosService
  ) {
    this.buildForm();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.codigoContrato = +params['id'];
        this.editMode.set(true);
        this.cargarContrato();
      }
    });

    this.form.valueChanges.subscribe(() => {
      this.formularioModificado.set(true);
    });
  }

  buildForm(): void {
    this.form = this.fb.group({
      codigo: [{ value: 0, disabled: true }],
      codigoEntidad: [null, [Validators.required]],
      fechaInicio: [null, [Validators.required]],
      fechaFin: [null],
      filial: [''],
      porcentajeAporteIndividual: [0, [Validators.min(0), Validators.max(100)]],
      porcentajeAporteJubilacion: [0, [Validators.min(0), Validators.max(100)]],
      estado: ['Activo'],
      observacion: ['']
    }, { validators: this.alMenosUnAporteValidator });
  }

  alMenosUnAporteValidator(group: FormGroup): { [key: string]: boolean } | null {
    const individual = group.get('porcentajeAporteIndividual')?.value || 0;
    const jubilacion = group.get('porcentajeAporteJubilacion')?.value || 0;
    return (individual > 0 || jubilacion > 0) ? null : { alMenosUnAporte: true };
  }

  cargarContrato(): void {
    this.loading.set(true);
    this.contratoService.getById(this.codigoContrato.toString()).subscribe({
      next: (data) => {
        if (data) {
          this.form.patchValue(data);
          this.formularioModificado.set(false);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar contrato:', err);
        this.error.set('Error al cargar contrato');
        this.loading.set(false);
      }
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Por favor complete los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading.set(true);
    const contrato: Contrato = { ...this.form.getRawValue() };

    const operacion = this.editMode()
      ? this.contratoService.update(contrato)
      : this.contratoService.add(contrato);

    operacion.subscribe({
      next: () => {
        this.formularioModificado.set(false);
        this.snackBar.open(`Contrato ${this.editMode() ? 'actualizado' : 'creado'} exitosamente`, 'Cerrar', { duration: 3000 });
        this.volver();
      },
      error: (err) => {
        console.error('Error al guardar:', err);
        this.snackBar.open('Error al guardar contrato', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  volver(): void {
    this.router.navigate(['/menucontabilidad/menucreditos/contrato-consulta']);
  }

  canDeactivate(): boolean {
    if (this.formularioModificado()) {
      return confirm('¿Deseas salir sin guardar los cambios?');
    }
    return true;
  }

  capturarFechaInicioRaw(event: Event): void {
    this._rawFechaInicio = (event.target as HTMLInputElement).value;
  }

  syncFechaInicioFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaInicio || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaInicio = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.form.get('fechaInicio')?.setValue(date, { emitEvent: false });
        this.form.get('fechaInicio')?.setErrors(null);
        setTimeout(() => {
          if (this.fechaInicioInputRef?.nativeElement) this.fechaInicioInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaInicioPickerChange(date: Date | null | undefined): void {
    this.form.get('fechaInicio')?.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.fechaInicioInputRef?.nativeElement) this.fechaInicioInputRef.nativeElement.value = formatted;
    });
  }

  capturarFechaFinRaw(event: Event): void {
    this._rawFechaFin = (event.target as HTMLInputElement).value;
  }

  syncFechaFinFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaFin || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaFin = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.form.get('fechaFin')?.setValue(date, { emitEvent: false });
        this.form.get('fechaFin')?.setErrors(null);
        setTimeout(() => {
          if (this.fechaFinInputRef?.nativeElement) this.fechaFinInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaFinPickerChange(date: Date | null | undefined): void {
    this.form.get('fechaFin')?.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.fechaFinInputRef?.nativeElement) this.fechaFinInputRef.nativeElement.value = formatted;
    });
  }
}
