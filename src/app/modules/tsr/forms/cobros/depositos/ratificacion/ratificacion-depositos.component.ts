import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

interface DepositoPendiente {
  id: number;
  fecha: Date;
  bancoCodigo: number;
  numero: string;
  monto: number;
  estado: 'PENDIENTE' | 'RATIFICADO';
}

@Component({
  selector: 'app-ratificacion-depositos',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ],
  templateUrl: './ratificacion-depositos.component.html',
  styleUrls: ['./ratificacion-depositos.component.scss'],
})
export class RatificacionDepositosComponent {
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  depositos = signal<DepositoPendiente[]>([
    {
      id: 1,
      fecha: new Date(),
      bancoCodigo: 101,
      numero: 'DEP-0001',
      monto: 1500,
      estado: 'PENDIENTE',
    },
    {
      id: 2,
      fecha: new Date(),
      bancoCodigo: 102,
      numero: 'DEP-0002',
      monto: 2300,
      estado: 'PENDIENTE',
    },
  ]);

  seleccionados = signal<Set<number>>(new Set());

  hasSeleccion = computed(() => this.seleccionados().size > 0);

  toggleSeleccion(id: number, checked: boolean): void {
    this.seleccionados.update((set) => {
      const next = new Set(set);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  ratificarSeleccionados(): void {
    if (!this.hasSeleccion()) return;
    this.loading.set(true);

    const ids = Array.from(this.seleccionados());
    console.log('Ratificando depósitos:', ids);

    setTimeout(() => {
      const actualizados = this.depositos().map((d) =>
        ids.includes(d.id) ? { ...d, estado: 'RATIFICADO' as const } : d
      );
      this.depositos.set(actualizados);
      this.seleccionados.set(new Set());
      this.loading.set(false);
    }, 500);
  }

  trackById(index: number, item: DepositoPendiente): number {
    return item.id;
  }
}
