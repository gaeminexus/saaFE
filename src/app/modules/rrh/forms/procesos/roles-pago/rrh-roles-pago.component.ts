import { Component, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-rrh-roles-pago',
  standalone: true,
  imports: [MatTableModule, MatCardModule],
  templateUrl: './rrh-roles-pago.component.html',
  styleUrls: ['./rrh-roles-pago.component.scss'],
})
export class RrhRolesPagoComponent {
  titulo = signal<string>('Procesos · Roles de Pago');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Rol #1203 · 2025-12', estado: 'Generado' },
    { nombre: 'Rol #1204 · 2026-01', estado: 'Pendiente' },
  ]);
  hasData = computed(() => this.data().length > 0);
}
