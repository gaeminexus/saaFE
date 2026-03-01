import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { AporteRetenciones } from '../../../model/aportes-retenciones';
import { ContratoEmpleado } from '../../../model/contrato-empleado';

export interface AporteRetencionFormData {
  mode: 'create' | 'edit' | 'view';
  item?: AporteRetenciones;
}

@Component({
  selector: 'app-aporte-retencion-form',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './aporte-retencion-form.component.html',
  styleUrls: ['./aporte-retencion-form.component.scss'],
})
export class AporteRetencionFormComponent implements OnInit {
  readonly contratosDisponibles = signal<ContratoEmpleado[]>([]);
  readonly tiposDisponibles = signal<String[]>([]);

  readonly contratoEmpleado = signal<ContratoEmpleado | null>(null);
  readonly tipo = signal<String | null>(null);
  readonly fechaAnexo = signal<string>('');
  readonly detalle = signal<string>('');
  readonly nuevoSalario = signal<string>('');
  readonly nuevaFechaFin = signal<string>('');
  readonly fechaRegistro = signal<string>('');
  readonly usuarioRegistro = signal<string>('');

  readonly mostrarValidaciones = signal<boolean>(false);
  readonly contadorDetalle = computed(() => this.detalle().length);
  readonly isViewMode = computed(() => this.data.mode === 'view');
  readonly dialogTitle = computed(() => {
    if (this.data.mode === 'edit') {
      return 'Editar Aporte / Retención';
    }

    if (this.data.mode === 'view') {
      return 'Ver Aporte / Retención';
    }

    return 'Nuevo Aporte / Retención';
  });

  constructor(
    private dialogRef: MatDialogRef<AporteRetencionFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AporteRetencionFormData,
  ) {
    // TODO RRHH: cargar catálogos reales (ContratoEmpleado y Tipo) desde servicios del módulo.
  }

  ngOnInit(): void {
    const item = this.data.item;
    if (!item) {
      return;
    }

    this.contratoEmpleado.set(item.contratoEmpleado ?? null);
    this.tipo.set(item.tipo ?? null);
    this.fechaAnexo.set(this.toInputDate(item.fechaAnexo));
    this.detalle.set(item.detalle ?? '');
    this.nuevoSalario.set(
      item.nuevoSalario !== undefined && item.nuevoSalario !== null
        ? String(item.nuevoSalario)
        : '',
    );
    this.nuevaFechaFin.set(this.toInputDate(item.nuevaFechaFin));
    this.fechaRegistro.set(this.toDateTimeDisplay(item.fechaRegistro));
    this.usuarioRegistro.set(item.usuarioRegistro ?? '');
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }

  guardar(): void {
    this.mostrarValidaciones.set(true);
  }

  contratoLabel(value: ContratoEmpleado | null): string {
    if (!value) {
      return '';
    }

    const contrato = value as unknown as Record<string, unknown>;
    return String(contrato['numero'] ?? contrato['codigo'] ?? '');
  }

  private toInputDate(value: Date | string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toISOString().slice(0, 10);
  }

  private toDateTimeDisplay(value: Date | string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
}
