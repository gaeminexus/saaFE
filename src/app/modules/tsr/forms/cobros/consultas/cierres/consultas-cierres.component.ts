import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';

interface Cierre {
  id: number;
  fecha: Date;
  cajaCodigo: number;
  usuario: string;
  total: number;
}

@Component({
  selector: 'app-consultas-cierres',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCardModule,
  ],
  templateUrl: './consultas-cierres.component.html',
  styleUrls: ['./consultas-cierres.component.scss'],
})
export class ConsultasCierresComponent {
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  // Filtros
  fechaInicio = signal<Date | null>(null);
  fechaFin = signal<Date | null>(null);
  cajaCodigo = signal<number | null>(null);
  usuario = signal<string>('');

  // Datos mock
  cierres = signal<Cierre[]>([
    { id: 1, fecha: new Date(), cajaCodigo: 1, usuario: 'admin', total: 1000 },
    { id: 2, fecha: new Date(), cajaCodigo: 2, usuario: 'operador', total: 2500.75 },
  ]);

  filtered = computed(() => {
    const start = this.fechaInicio();
    const end = this.fechaFin();
    const caja = this.cajaCodigo();
    const usr = (this.usuario() || '').toLowerCase();

    return this.cierres().filter((c) => {
      const inRange = (!start || c.fecha >= start) && (!end || c.fecha <= end);
      const byCaja = !caja || c.cajaCodigo === caja;
      const byUsuario = !usr || c.usuario.toLowerCase().includes(usr);
      return inRange && byCaja && byUsuario;
    });
  });

  limpiarFiltros(): void {
    this.fechaInicio.set(null);
    this.fechaFin.set(null);
    this.cajaCodigo.set(null);
    this.usuario.set('');
  }

  trackById(index: number, item: Cierre): number {
    return item.id;
  }
}
