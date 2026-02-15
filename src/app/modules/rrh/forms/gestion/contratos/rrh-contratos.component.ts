import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';

@Component({
  selector: 'app-rrh-contratos',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './rrh-contratos.component.html',
  styleUrls: ['./rrh-contratos.component.scss'],
})
export class RrhContratosComponent {
  titulo = signal<string>('Gestión de Personal · Contratos');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Ana Pérez - Indefinido', estado: 'Activo' },
    { nombre: 'Luis Gómez - Temporal', estado: 'Activo' },
    { nombre: 'María Torres - Prácticas', estado: 'Inactivo' },
  ]);
  hasData = computed(() => this.data().length > 0);
}
