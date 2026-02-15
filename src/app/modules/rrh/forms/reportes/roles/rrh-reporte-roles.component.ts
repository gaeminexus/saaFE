import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';

@Component({
  selector: 'app-rrh-reporte-roles',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
