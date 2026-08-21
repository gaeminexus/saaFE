import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, Inject, OnInit, signal, ViewChild } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
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
  templateUrl: './aporte-retencion-form.component.html',
  styleUrls: ['./aporte-retencion-form.component.scss'],
})
export class AporteRetencionFormComponent implements OnInit {
  readonly contratosDisponibles = signal<ContratoEmpleado[]>([]);
  readonly tiposDisponibles = signal<String[]>([]);

  @ViewChild('fechaAnexoInput', { read: ElementRef }) fechaAnexoInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('nuevaFechaFinInput', { read: ElementRef }) nuevaFechaFinInputRef!: ElementRef<HTMLInputElement>;
  private _rawFechaAnexo = '';
  private _rawNuevaFechaFin = '';

  readonly contratoEmpleado = signal<ContratoEmpleado | null>(null);
  readonly tipo = signal<String | null>(null);
  readonly fechaAnexoControl = new UntypedFormControl(null);
  readonly detalle = signal<string>('');
  readonly nuevoSalario = signal<string>('');
  readonly nuevaFechaFinControl = new UntypedFormControl(null);
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
    private funcionesDatosS: FuncionesDatosService,
  ) {
    // TODO RRHH: cargar catálogos reales (ContratoEmpleado y Tipo) desde servicios del módulo.
  }

  ngOnInit(): void {
    if (this.isViewMode()) {
      this.fechaAnexoControl.disable({ emitEvent: false });
      this.nuevaFechaFinControl.disable({ emitEvent: false });
    }

    const item = this.data.item;
    if (!item) {
      return;
    }

    this.contratoEmpleado.set(item.contratoEmpleado ?? null);
    this.tipo.set(item.tipo ?? null);
    this.fechaAnexoControl.setValue(item.fechaAnexo ? new Date(item.fechaAnexo) : null, { emitEvent: false });
    this.detalle.set(item.detalle ?? '');
    this.nuevoSalario.set(
      item.nuevoSalario !== undefined && item.nuevoSalario !== null
        ? String(item.nuevoSalario)
        : '',
    );
    this.nuevaFechaFinControl.setValue(item.nuevaFechaFin ? new Date(item.nuevaFechaFin) : null, { emitEvent: false });
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

  capturarFechaAnexoRaw(event: Event): void {
    this._rawFechaAnexo = (event.target as HTMLInputElement).value;
  }

  syncFechaAnexoFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaAnexo || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaAnexo = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.fechaAnexoControl.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.fechaAnexoInputRef?.nativeElement) this.fechaAnexoInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaAnexoPickerChange(date: Date | null | undefined): void {
    this.fechaAnexoControl.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.fechaAnexoInputRef?.nativeElement) this.fechaAnexoInputRef.nativeElement.value = formatted;
    });
  }

  capturarNuevaFechaFinRaw(event: Event): void {
    this._rawNuevaFechaFin = (event.target as HTMLInputElement).value;
  }

  syncNuevaFechaFinFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawNuevaFechaFin || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawNuevaFechaFin = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.nuevaFechaFinControl.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.nuevaFechaFinInputRef?.nativeElement) this.nuevaFechaFinInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onNuevaFechaFinPickerChange(date: Date | null | undefined): void {
    this.nuevaFechaFinControl.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.nuevaFechaFinInputRef?.nativeElement) this.nuevaFechaFinInputRef.nativeElement.value = formatted;
    });
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
