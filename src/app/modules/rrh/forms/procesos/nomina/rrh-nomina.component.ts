import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';

@Component({
  selector: 'app-rrh-nomina',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './rrh-nomina.component.html',
  styleUrls: ['./rrh-nomina.component.scss'],
})
export class RrhNominaComponent {
  titulo = signal<string>('Procesos · Nómina');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Período 2025-12', estado: 'Calculado' },
    { nombre: 'Período 2026-01', estado: 'En proceso' },
  ]);
  hasData = computed(() => this.data().length > 0);
}
