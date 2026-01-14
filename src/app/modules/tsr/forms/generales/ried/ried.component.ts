import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

interface RiedRegistro {
  fecha: Date;
  banco: string;
  cuenta: string;
  ingresos: number;
  egresos: number;
  saldo: number;
}

@Component({
  selector: 'app-ried',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
  ],
  templateUrl: './ried.component.html',
  styleUrls: ['./ried.component.scss'],
})
export class RiedComponent {
  banco = signal<string>('');
  cuenta = signal<string>('');
  fechaDesde = signal<Date | null>(null);
  fechaHasta = signal<Date | null>(null);

  displayedColumns = ['fecha', 'banco', 'cuenta', 'ingresos', 'egresos', 'saldo'];

  items = signal<RiedRegistro[]>([
    {
      fecha: new Date(),
      banco: 'Banco A',
      cuenta: '001-123',
      ingresos: 500.0,
      egresos: 120.0,
      saldo: 380.0,
    },
    {
      fecha: new Date(),
      banco: 'Banco B',
      cuenta: '002-456',
      ingresos: 200.0,
      egresos: 80.0,
      saldo: 120.0,
    },
  ]);

  totalIngresos = computed(() => this.items().reduce((acc, it) => acc + (it.ingresos || 0), 0));
  totalEgresos = computed(() => this.items().reduce((acc, it) => acc + (it.egresos || 0), 0));
  totalSaldo = computed(() => this.items().reduce((acc, it) => acc + (it.saldo || 0), 0));

  buscar(): void {
    const banco = this.banco().toLowerCase();
    const cuenta = this.cuenta().toLowerCase();
    const d = this.fechaDesde();
    const h = this.fechaHasta();

    const base: RiedRegistro[] = [
      {
        fecha: new Date(),
        banco: 'Banco C',
        cuenta: '003-789',
        ingresos: 300.0,
        egresos: 50.0,
        saldo: 250.0,
      },
    ];

    const filtered = base.filter((it) => {
      const okBanco = !banco || it.banco.toLowerCase().includes(banco);
      const okCuenta = !cuenta || it.cuenta.toLowerCase().includes(cuenta);
      const okFechaDesde = !d || it.fecha >= d;
      const okFechaHasta = !h || it.fecha <= h;
      return okBanco && okCuenta && okFechaDesde && okFechaHasta;
    });

    this.items.set(filtered);
  }
}
