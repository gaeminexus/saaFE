import { Component, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-rrh-contratos',
  standalone: true,
  imports: [MatTableModule, MatCardModule],
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
