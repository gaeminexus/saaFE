import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, Inject, OnInit, signal, ViewChild } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../../shared/services/funciones-datos.service';
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
  @ViewChild('fechaInicioInput', { read: ElementRef }) fechaInicioInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaFinInput', { read: ElementRef }) fechaFinInputRef!: ElementRef<HTMLInputElement>;
  private _rawFechaInicio = '';
  private _rawFechaFin = '';

  formDepartamento = signal<number | null>(null);
  formCargo = signal<number | null>(null);
  formFechaInicioControl = new UntypedFormControl(null);
  formFechaFinControl = new UntypedFormControl(null);
  formObservacion = signal<string>('');
  formActual = signal<number>(1);
  errorMsg = signal<string>('');

  constructor(
    private dialogRef: MatDialogRef<HstrDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: HstrDialogData,
    private funcionesDatosS: FuncionesDatosService,
  ) {}

  ngOnInit(): void {
    if (this.data?.mode === 'edit' && this.data?.historial) {
      const h = this.data.historial;
      this.formDepartamento.set(h.departamento?.codigo ?? null);
      this.formCargo.set(h.cargo?.codigo ?? null);
      this.formFechaInicioControl.setValue(h.fechaInicio ? new Date(h.fechaInicio) : null, { emitEvent: false });
      this.formFechaFinControl.setValue(h.fechaFin ? new Date(h.fechaFin) : null, { emitEvent: false });
      this.formObservacion.set((h.observacion ?? '').toString());
      this.formActual.set(Number(h.actual ?? 0));
    } else {
      this.formFechaInicioControl.setValue(new Date(), { emitEvent: false });
      this.formActual.set(1);
    }
  }

  onCancelar(): void {
    this.dialogRef.close(null);
  }

  onGuardar(): void {
    const dprt = this.formDepartamento();
    const crgo = this.formCargo();
    const fechaInicioDate: Date | null = this.formFechaInicioControl.value;
    const fechaFinDate: Date | null = this.formFechaFinControl.value;
    const fechaInicio = fechaInicioDate ? this.toISODate(fechaInicioDate) : '';
    const fechaFin = fechaFinDate ? this.toISODate(fechaFinDate) : '';

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

  private toISODate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  capturarFechaInicioRaw(event: Event): void {
    this._rawFechaInicio = (event.target as HTMLInputElement).value;
  }

  syncFechaInicioFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaInicio || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaInicio = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.formFechaInicioControl.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.fechaInicioInputRef?.nativeElement) this.fechaInicioInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaInicioPickerChange(date: Date | null | undefined): void {
    this.formFechaInicioControl.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.fechaInicioInputRef?.nativeElement) this.fechaInicioInputRef.nativeElement.value = formatted;
    });
  }

  capturarFechaFinRaw(event: Event): void {
    this._rawFechaFin = (event.target as HTMLInputElement).value;
  }

  syncFechaFinFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaFin || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaFin = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.formFechaFinControl.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.fechaFinInputRef?.nativeElement) this.fechaFinInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaFinPickerChange(date: Date | null | undefined): void {
    this.formFechaFinControl.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.fechaFinInputRef?.nativeElement) this.fechaFinInputRef.nativeElement.value = formatted;
    });
  }
}
