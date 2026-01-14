import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-envio-depositos',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCardModule,
  ],
  templateUrl: './envio-depositos.component.html',
  styleUrls: ['./envio-depositos.component.scss'],
})
export class EnvioDepositosComponent {
  // Estado
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  // Filtros / Datos de envío
  fechaEnvio = signal<Date | null>(new Date());
  bancoCodigo = signal<number | null>(null);
  numeroDeposito = signal<string>('');
  monto = signal<number | null>(null);
  observacion = signal<string>('');
  nombreUsuario = signal<string>('');

  // Validación simple
  canEnviar = computed(() => {
    const montoVal = this.monto();
    return (
      !!this.fechaEnvio() &&
      !!this.numeroDeposito() &&
      !!this.bancoCodigo() &&
      !!montoVal &&
      montoVal > 0
    );
  });

  cargarCatalogos(): void {
    // Cascarón: aquí cargaríamos bancos/usuarios desde servicio
  }

  enviarDeposito(): void {
    if (!this.canEnviar()) {
      this.errorMsg.set('Complete los campos requeridos con valores válidos.');
      return;
    }
    this.loading.set(true);

    const payload = {
      fechaEnvio: this.fechaEnvio(),
      bancoCodigo: this.bancoCodigo(),
      numeroDeposito: this.numeroDeposito(),
      monto: this.monto(),
      observacion: this.observacion(),
      usuario: this.nombreUsuario(),
    };

    // Cascarón: simular envío
    console.log('Enviando Depósito:', payload);
    setTimeout(() => {
      this.loading.set(false);
      this.errorMsg.set('');
    }, 500);
  }
}
