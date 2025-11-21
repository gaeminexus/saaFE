import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { DateFieldConfig } from '../../model/date.interface';
import { DynamicFormComponent } from '../dynamic-field/dynamic-field.directive';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../services/funciones-datos.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-date',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule,
    MatIconModule
  ],
  templateUrl: './date.component.html',
  styleUrl: './date.component.scss'
})
export class DateComponent implements OnInit, OnDestroy, DynamicFormComponent {
  @Input() field!: DateFieldConfig;
  @Input() group!: FormGroup;
  @Input() accion!: number;

  private funcionesDatosService = inject(FuncionesDatosService);
  private destroy$ = new Subject<void>();

  constructor() { }

  ngOnInit(): void {
    // Suscribirse a cambios del campo de fecha para formatear antes de enviar
    const control = this.group.get(this.field.name);

    if (control) {
      // Interceptar cuando el valor cambia para mantener el objeto Date en el form
      // El formateo se hará solo cuando se prepare para enviar al backend
      control.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(value => {
          // Solo validar que sea una fecha válida
          if (value && !(value instanceof Date) && typeof value === 'string') {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              control.setValue(date, { emitEvent: false });
            }
          }
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Método público para obtener el valor formateado para backend
   * Se debe llamar antes de enviar los datos al servidor
   */
  getValorFormateadoParaBackend(): string | null {
    const control = this.group.get(this.field.name);
    const valor = control?.value;

    if (!valor) return null;

    const tipoFormato = this.field.formatoBackend || TipoFormatoFechaBackend.FECHA_HORA;
    return this.funcionesDatosService.formatearFechaParaBackend(valor, tipoFormato);
  }

  /**
   * Obtiene la hora actual del campo de fecha en formato HH:mm:ss
   */
  getHoraActual(): string {
    const control = this.group.get(this.field.name);
    const valor = control?.value;

    if (!valor || !(valor instanceof Date)) {
      // Retornar hora actual por defecto
      const ahora = new Date();
      return this.formatearHora(ahora);
    }

    return this.formatearHora(valor);
  }

  /**
   * Actualiza la hora del campo de fecha cuando el usuario cambia el input de hora
   */
  actualizarHora(event: Event): void {
    const input = event.target as HTMLInputElement;
    const horaString = input.value; // Formato "HH:mm" o "HH:mm:ss"

    const control = this.group.get(this.field.name);
    let fecha = control?.value;

    // Si no hay fecha, usar hoy
    if (!fecha || !(fecha instanceof Date)) {
      fecha = new Date();
    } else {
      // Crear una nueva instancia para no mutar la original
      fecha = new Date(fecha);
    }

    // Parsear la hora
    const partes = horaString.split(':');
    if (partes.length >= 2) {
      const horas = parseInt(partes[0], 10);
      const minutos = parseInt(partes[1], 10);
      const segundos = partes.length > 2 ? parseInt(partes[2], 10) : 0;

      fecha.setHours(horas, minutos, segundos, 0);
      control?.setValue(fecha);
    }
  }

  /**
   * Formatea una fecha a string de hora HH:mm:ss
   */
  private formatearHora(fecha: Date): string {
    const horas = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    const segundos = fecha.getSeconds().toString().padStart(2, '0');
    return `${horas}:${minutos}:${segundos}`;
  }

}
