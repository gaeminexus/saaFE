import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-procesos-ratificacion-depositos',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ],
  templateUrl: './procesos-ratificacion-depositos.component.html',
  styleUrls: ['./procesos-ratificacion-depositos.component.scss'],
})
export class ProcesosRatificacionDepositosComponent {
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');
  logs = signal<string[]>([]);

  fecha = signal<Date | null>(new Date());

  limpiar(): void {
    this.fecha.set(new Date());
    this.logs.set([]);
    this.errorMsg.set('');
  }

  procesar(): void {
    this.errorMsg.set('');
    if (!this.fecha()) {
      this.errorMsg.set('Seleccione una fecha válida.');
      return;
    }
    this.loading.set(true);
    this.logs.update((l) => [...l, `Ratificando depósitos del ${this.fecha()!.toDateString()}`]);
    setTimeout(() => {
      this.logs.update((l) => [...l, 'Ratificación completada.']);
      this.loading.set(false);
    }, 600);
  }
}
