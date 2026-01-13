import { Component, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-rrh-reporte-roles',
  standalone: true,
  imports: [MatTableModule, MatCardModule],
  templateUrl: './rrh-reporte-roles.component.html',
  styleUrls: ['./rrh-reporte-roles.component.scss'],
})
export class RrhReporteRolesComponent {
  titulo = signal<string>('Reportes · Roles de Pago');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Rol #1203 · Total $12,500', estado: 'Generado' },
    { nombre: 'Rol #1204 · Total $12,800', estado: 'Pendiente' },
  ]);
  hasData = computed(() => this.data().length > 0);
}
