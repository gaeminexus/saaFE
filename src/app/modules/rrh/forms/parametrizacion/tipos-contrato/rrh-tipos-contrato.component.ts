import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';

@Component({
  selector: 'app-rrh-tipos-contrato',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './rrh-tipos-contrato.component.html',
  styleUrls: ['./rrh-tipos-contrato.component.scss'],
})
export class RrhTiposContratoComponent {
  titulo = signal<string>('Parametrización · Tipos de Contrato');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Indefinido', estado: 'Activo' },
    { nombre: 'Temporal', estado: 'Activo' },
    { nombre: 'Prácticas', estado: 'Inactivo' },
  ]);
  hasData = computed(() => this.data().length > 0);

  onNuevo(): void {}
  onGuardar(): void {}
  onCancelar(): void {}
  onVolver(): void {
    history.back();
  }
}
