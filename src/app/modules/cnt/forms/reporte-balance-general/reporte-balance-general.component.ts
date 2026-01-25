import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'cnt-reporte-balance-general',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
  ],
  templateUrl: './reporte-balance-general.component.html',
  styleUrls: ['./reporte-balance-general.component.scss'],
})
export class ReporteBalanceGeneralComponent {
  // Estado
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  // Campos del formulario
  tipoReporte = signal<string>('Balance General');
  fechaInicial = signal<string>(''); // YYYY-MM-DD
  fechaFinal = signal<string>('');
  soloConMovimientos = signal<boolean>(false);
  acumulado = signal<boolean>(false);
  visualizarDebeHaber = signal<boolean>(false);
  centroCosto = signal<boolean>(false);

  // Opciones de tipo de reporte (extensibles)
  reportTypes = ['Balance General'];

  rangoFechasValido = computed(() => {
    const fi = this.fechaInicial();
    const ff = this.fechaFinal();
    if (!fi || !ff) return false;
    return new Date(fi) <= new Date(ff);
  });

  generarReporte(): void {
    this.errorMsg.set('');
    if (!this.rangoFechasValido()) {
      this.errorMsg.set('Rango de fechas inválido.');
      return;
    }

    // Placeholder de acción de generación. Conectaremos al backend/servicio luego.
    this.loading.set(true);
    // Simulación rápida de proceso
    setTimeout(() => {
      this.loading.set(false);
      alert('Balance General generado (demo).');
    }, 600);
  }
}
