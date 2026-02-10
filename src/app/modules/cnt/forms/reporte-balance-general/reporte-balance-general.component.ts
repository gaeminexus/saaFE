import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';

@Component({
  selector: 'cnt-reporte-balance-general',
  standalone: true,
  imports: [
    CommonModule,
    MaterialFormModule,
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
