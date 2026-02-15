import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { Cargo } from '../../../../model/cargo';
import { Departamento } from '../../../../model/departamento';
import { Empleado } from '../../../../model/empleado';
import { Historial } from '../../../../model/historial';

export interface HstrOption {
  value: number;
  label: string;
}

export interface HstrDialogData {
  mode: 'new' | 'edit';
  empleadoId: number;
  empleadoLabel: string;
  departamentos: HstrOption[];
  cargos: HstrOption[];
  historial?: Historial | null;
}

@Component({
  selector: 'app-hstr-dialog',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './hstr-dialog.component.html',
  styleUrls: ['./hstr-dialog.component.scss'],
})
export class HstrDialogComponent implements OnInit {
  formDepartamento = signal<number | null>(null);
  formCargo = signal<number | null>(null);
  formFechaInicio = signal<string>('');
  formFechaFin = signal<string>('');
  formObservacion = signal<string>('');
  formActual = signal<number>(1);
  errorMsg = signal<string>('');

  constructor(
    private dialogRef: MatDialogRef<HstrDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: HstrDialogData,
  ) {}

  ngOnInit(): void {
    if (this.data?.mode === 'edit' && this.data?.historial) {
      const h = this.data.historial;
      this.formDepartamento.set(h.departamento?.codigo ?? null);
      this.formCargo.set(h.cargo?.codigo ?? null);
      this.formFechaInicio.set(this.toDateInput(h.fechaInicio));
      this.formFechaFin.set(this.toDateInput(h.fechaFin));
      this.formObservacion.set((h.observacion ?? '').toString());
      this.formActual.set(Number(h.actual ?? 0));
    } else {
      const today = new Date().toISOString().slice(0, 10);
      this.formFechaInicio.set(today);
      this.formActual.set(1);
    }
  }

  onCancelar(): void {
    this.dialogRef.close(null);
  }

  onGuardar(): void {
    const dprt = this.formDepartamento();
    const crgo = this.formCargo();
    const fechaInicio = this.formFechaInicio();
    const fechaFin = this.formFechaFin();

    if (!dprt || !crgo) {
      this.errorMsg.set('Departamento y Cargo son obligatorios');
      return;
    }

    if (!fechaInicio) {
      this.errorMsg.set('Fecha de inicio es obligatoria');
      return;
    }

    if (fechaFin && fechaFin < fechaInicio) {
      this.errorMsg.set('Fecha fin debe ser mayor o igual a fecha inicio');
      return;
    }

    const payload: Partial<Historial> = {
      empleado: { codigo: this.data.empleadoId } as Empleado,
      departamento: { codigo: dprt } as Departamento,
      cargo: { codigo: crgo } as Cargo,
      fechaInicio,
      fechaFin: fechaFin || null,
      actual: this.data.mode === 'new' ? 1 : this.formActual(),
      observacion: this.formObservacion().trim() || null,
    };

    this.dialogRef.close({
      mode: this.data.mode,
      payload,
      original: this.data.historial ?? null,
    });
  }

  private toDateInput(value: string | Date | null | undefined): string {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    return new Date(value).toISOString().slice(0, 10);
  }
}
