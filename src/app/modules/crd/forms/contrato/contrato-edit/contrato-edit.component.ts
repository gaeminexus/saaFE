import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ContratoService } from '../../../service/contrato.service';
import { Contrato } from '../../../model/contrato';
import { CanComponentDeactivate } from '../../../../../shared/guard/can-deactivate.guard';

@Component({
  selector: 'app-contrato-edit',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatCardModule, MatDatepickerModule, MatNativeDateModule,
    MatProgressSpinnerModule, MatSnackBarModule
  ],
  templateUrl: './contrato-edit.component.html',
  styleUrls: ['./contrato-edit.component.scss']
})
export class ContratoEditComponent implements OnInit, CanComponentDeactivate {
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
    private snackBar: MatSnackBar
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
}
