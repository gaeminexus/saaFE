import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';

@Component({
  selector: 'app-rrh-roles-pago',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
