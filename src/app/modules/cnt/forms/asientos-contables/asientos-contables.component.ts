import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { DetalleAsiento } from '../../model/detalle-asiento';
import { DetalleAsientoComponent } from '../detalle-asiento/detalle-asiento.component';

@Component({
  selector: 'app-asientos-contables',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    DetalleAsientoComponent,
  ],
  templateUrl: './asientos-contables.component.html',
  styleUrls: ['./asientos-contables.component.scss'],
})
export class AsientosContablesComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  error: string | null = null;

  // Valores calculados
  totalDebe = 0;
  totalHaber = 0;
  diferencia = 0;

  // Detalles del asiento
  detallesAsiento: DetalleAsiento[] = [];

  // Rubros para dropdowns
  tiposAsientos: any[] = [];
  modulosOrigen: any[] = [];

  // Constantes de rubros
  private readonly RUBRO_TIPO_ASIENTO = 15; // Ajusta según tu sistema
  private readonly RUBRO_MODULO = 16; // Ajusta según tu sistema

  constructor(private fb: FormBuilder, private detalleRubroService: DetalleRubroService) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.cargarRubros();
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      tipo: ['', [Validators.required]],
      moduloOrigen: ['', [Validators.required]],
      observaciones: ['', [Validators.maxLength(500)]],
      numero: [{ value: '', disabled: true }], // Auto-generado
      fecha: [new Date(), [Validators.required]],
      estado: [{ value: 'INCOMPLETO', disabled: true }],
    });
  }

  private cargarRubros(): void {
    // Cargar tipos de asientos
    const tipos = this.detalleRubroService.getDetallesByParent(this.RUBRO_TIPO_ASIENTO);
    this.tiposAsientos = tipos.map((detalle) => ({
      id: detalle.codigoAlterno,
      nombre: detalle.descripcion,
    }));

    // Cargar módulos origen
    const modulos = this.detalleRubroService.getDetallesByParent(this.RUBRO_MODULO);
    this.modulosOrigen = modulos.map((detalle) => ({
      id: detalle.codigoAlterno,
      nombre: detalle.descripcion,
    }));

    console.log('📋 Tipos de Asientos cargados:', this.tiposAsientos);
    console.log('📋 Módulos de Origen cargados:', this.modulosOrigen);
  }

  onGuardar(): void {
    if (this.form.invalid) {
      this.error = 'Por favor completa todos los campos requeridos';
      return;
    }

    this.loading = true;
    this.error = null;

    const datosAsiento = {
      ...this.form.getRawValue(),
      totalDebe: this.totalDebe,
      totalHaber: this.totalHaber,
      diferencia: this.diferencia,
    };

    console.log('💾 Guardando asiento:', datosAsiento);

    // TODO: Implementar servicio de guardado
    setTimeout(() => {
      this.loading = false;
      console.log('✅ Asiento guardado exitosamente');
    }, 1000);
  }

  onCancelar(): void {
    this.form.reset({ estado: 'INCOMPLETO' });
    this.totalDebe = 0;
    this.totalHaber = 0;
    this.diferencia = 0;
    this.error = null;
  }

  onLimpiar(): void {
    this.onCancelar();
  }

  onDetallesChanged(detalles: DetalleAsiento[]): void {
    this.detallesAsiento = detalles;
    this.totalDebe = detalles.reduce((sum, d) => sum + (d.valorDebe || 0), 0);
    this.totalHaber = detalles.reduce((sum, d) => sum + (d.valorHaber || 0), 0);
    this.diferencia = Math.abs(this.totalDebe - this.totalHaber);

    console.log('📊 Detalles actualizado:', {
      totalDebe: this.totalDebe,
      totalHaber: this.totalHaber,
      diferencia: this.diferencia,
      cantidadDetalles: detalles.length,
    });
  }
}
