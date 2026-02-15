import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';

@Component({
  selector: 'app-rrh-liquidaciones',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './rrh-liquidaciones.component.html',
  styleUrls: ['./rrh-liquidaciones.component.scss'],
})
export class RrhLiquidacionesComponent {
  titulo = signal<string>('Procesos · Liquidaciones');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Ana Pérez · 2025-12-20', estado: 'Pagado' },
    { nombre: 'Luis Gómez · 2026-01-10', estado: 'En trámite' },
  ]);
  hasData = computed(() => this.data().length > 0);
}
