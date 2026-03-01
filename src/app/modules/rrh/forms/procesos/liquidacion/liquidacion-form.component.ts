import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { ContratoEmpleado } from '../../../model/contrato-empleado';
import { Empleado } from '../../../model/empleado';
import { Liquidacion } from '../../../model/Liquidacion';

export interface LiquidacionFormData {
  mode: 'create' | 'edit' | 'view';
  item?: Liquidacion;
}

@Component({
  selector: 'app-liquidacion-form',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './liquidacion-form.component.html',
  styleUrls: ['./liquidacion-form.component.scss'],
})
export class LiquidacionFormComponent implements OnInit {
  readonly empleadosDisponibles = signal<Empleado[]>([]);
  readonly contratosDisponibles = signal<ContratoEmpleado[]>([]);
  readonly motivosDisponibles = signal<Array<{ codigo: number; etiqueta: string }>>([]);
  readonly estadosDisponibles = signal<String[]>([]);

  readonly empleado = signal<Empleado | null>(null);
  readonly contratoEmpleado = signal<ContratoEmpleado | null>(null);
  readonly fechaSalida = signal<string>('');
  readonly motivo = signal<number | null>(null);
  readonly neto = signal<string>('');
  readonly estado = signal<String | null>(null);
  readonly fechaRegistro = signal<string>('');
  readonly usuarioRegistro = signal<String>('');

  readonly mostrarValidaciones = signal<boolean>(false);
  readonly isViewMode = computed(() => this.data.mode === 'view');
  readonly dialogTitle = computed(() => {
    if (this.data.mode === 'edit') {
      return 'Editar Liquidación';
    }
    if (this.data.mode === 'view') {
      return 'Ver Liquidación';
    }
    return 'Nueva Liquidación';
  });

  constructor(
    private dialogRef: MatDialogRef<LiquidacionFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LiquidacionFormData,
  ) {
    // TODO RRHH: cargar catálogos reales (Empleado, ContratoEmpleado, Motivo y Estado).
    // TODO RRHH: enlazar contratos por empleado seleccionado (dependencia visual actualmente).
  }

  ngOnInit(): void {
    const item = this.data.item;
    if (!item) {
      return;
    }

    this.empleado.set(item.empleado ?? null);
    this.contratoEmpleado.set(item.contratoEmpleado ?? null);
    this.fechaSalida.set(this.toInputDate(item.fechaSalida));
    this.motivo.set(item.motivo ?? null);
    this.neto.set(item.neto !== undefined && item.neto !== null ? String(item.neto) : '');
    this.estado.set(item.estado ?? null);
    this.fechaRegistro.set(this.toDateTimeDisplay(item.fechaRegistro));
    this.usuarioRegistro.set(item.usuarioRegistro ?? '');
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }

  guardar(): void {
    this.mostrarValidaciones.set(true);
  }

  empleadoLabel(value: Empleado | null): string {
    if (!value) {
      return '';
    }

    const nombres = `${value.apellidos ?? ''} ${value.nombres ?? ''}`.replace(/\s+/g, ' ').trim();
    const identificacion = value.identificacion ? String(value.identificacion) : '';
    return `${identificacion} ${nombres}`.trim();
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
