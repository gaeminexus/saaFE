import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';

@Component({
  selector: 'app-rrh-aportes',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './rrh-aportes.component.html',
  styleUrls: ['./rrh-aportes.component.scss'],
})
export class RrhAportesComponent {
  titulo = signal<string>('Procesos · Aportes/Retenciones');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'IESS · 2025-12', estado: 'Reportado' },
    { nombre: 'Retenciones · 2026-01', estado: 'Pendiente' },
  ]);
  hasData = computed(() => this.data().length > 0);
}
