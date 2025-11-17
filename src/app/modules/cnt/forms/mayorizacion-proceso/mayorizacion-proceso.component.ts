import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { MayorizacionService } from '../../service/mayorizacion.service';
import { PeriodoService } from '../../service/periodo.service';
import { Periodo } from '../../model/periodo';
import { MayorizacionProceso, TipoProceso } from '../../model/mayorizacion-proceso';
import { Mayorizacion } from '../../model/mayorizacion';

@Component({
  selector: 'app-mayorizacion-proceso',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './mayorizacion-proceso.component.html',
  styleUrl: './mayorizacion-proceso.component.scss'
})
export class MayorizacionProcesoComponent implements OnInit {

  formProceso: FormGroup;
  periodos: Periodo[] = [];
  mayorizaciones: Mayorizacion[] = [];
  cargando = false;
  procesando = false;

  tiposProceso = [
    { value: TipoProceso.MAYORIZACION, label: 'Mayorización Normal' },
    { value: TipoProceso.MAYORIZACION_CIERRE, label: 'Mayorización de Cierre' }
  ];

  displayedColumns: string[] = ['codigo', 'periodo', 'fecha', 'acciones'];

  constructor(
    private fb: FormBuilder,
    private mayorizacionService: MayorizacionService,
    private periodoService: PeriodoService,
    private snackBar: MatSnackBar
  ) {
    this.formProceso = this.fb.group({
      empresa: [1, [Validators.required]], // Por defecto empresa 1
      periodoDesde: ['', [Validators.required]],
      periodoHasta: ['', [Validators.required]],
      proceso: [TipoProceso.MAYORIZACION, [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.cargarPeriodos();
    this.cargarMayorizaciones();
  }

  cargarPeriodos(): void {
    this.cargando = true;
    this.periodoService.getAll().subscribe({
      next: (periodos) => {
        this.periodos = periodos || [];
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar períodos:', error);
        this.mostrarMensaje('Error al cargar períodos', 'error');
        this.cargando = false;
      }
    });
  }

  cargarMayorizaciones(): void {
    this.mayorizacionService.getAll().subscribe({
      next: (mayorizaciones) => {
        this.mayorizaciones = mayorizaciones || [];
      },
      error: (error) => {
        console.error('Error al cargar mayorizaciones:', error);
        this.mostrarMensaje('Error al cargar mayorizaciones', 'error');
      }
    });
  }

  ejecutarProceso(): void {
    if (this.formProceso.valid) {
      this.procesando = true;
      const datos: MayorizacionProceso = this.formProceso.value;

      // Validar que periodo hasta sea mayor o igual a periodo desde
      if (datos.periodoHasta < datos.periodoDesde) {
        this.mostrarMensaje('El período hasta debe ser mayor o igual al período desde', 'error');
        this.procesando = false;
        return;
      }

      this.mayorizacionService.ejecutarMayorizacion(datos).subscribe({
        next: (response) => {
          if (response?.success) {
            this.mostrarMensaje('Proceso de mayorización ejecutado exitosamente', 'success');
            this.cargarMayorizaciones(); // Recargar la lista
            this.formProceso.reset({
              empresa: 1,
              proceso: TipoProceso.MAYORIZACION
            });
          } else {
            this.mostrarMensaje(response?.mensaje || 'Error en el proceso de mayorización', 'error');
          }
          this.procesando = false;
        },
        error: (error) => {
          console.error('Error en proceso de mayorización:', error);
          this.mostrarMensaje('Error al ejecutar el proceso de mayorización. Verifique la conexión con el servidor.', 'error');
          this.procesando = false;
        }
      });
    } else {
      this.mostrarMensaje('Por favor complete todos los campos requeridos', 'warn');
    }
  }

  ejecutarDesmayorizacion(): void {
    if (this.formProceso.valid) {
      this.procesando = true;
      const datos: MayorizacionProceso = this.formProceso.value;

      // Validar que periodo hasta sea mayor o igual a periodo desde
      if (datos.periodoHasta < datos.periodoDesde) {
        this.mostrarMensaje('El período hasta debe ser mayor o igual al período desde', 'error');
        this.procesando = false;
        return;
      }

      this.mayorizacionService.ejecutarDesmayorizacion(datos).subscribe({
        next: (response) => {
          if (response?.success) {
            this.mostrarMensaje('Proceso de desmayorización ejecutado exitosamente', 'success');
            this.cargarMayorizaciones(); // Recargar la lista
          } else {
            this.mostrarMensaje(response?.mensaje || 'Error en el proceso de desmayorización', 'error');
          }
          this.procesando = false;
        },
        error: (error) => {
          console.error('Error en proceso de desmayorización:', error);
          this.mostrarMensaje('Error al ejecutar el proceso de desmayorización. Verifique la conexión con el servidor.', 'error');
          this.procesando = false;
        }
      });
    } else {
      this.mostrarMensaje('Por favor complete todos los campos requeridos', 'warn');
    }
  }

  private mostrarMensaje(mensaje: string, tipo: 'success' | 'error' | 'warn' = 'success'): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: [`snackbar-${tipo}`],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  // Función auxiliar para casting de FormControl
  $any(obj: any): any {
    return obj;
  }
}