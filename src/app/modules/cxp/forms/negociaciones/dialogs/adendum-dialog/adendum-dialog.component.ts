import { CommonModule } from '@angular/common';
import { Component, Inject, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule, UntypedFormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../../shared/services/funciones-datos.service';
import { NegociacionProveedor } from '../../../../model/negociacion-proveedor';
import { AdendumNegociacion } from '../../../../model/adendum-negociacion';
import { AdendumNegociacionService } from '../../../../service/adendum-negociacion.service';

export interface AdendumDialogData {
  negociacion: NegociacionProveedor;
  valorVigente: number;
  adendum: AdendumNegociacion | null;
  idUsuario: number;
}

@Component({
  selector: 'app-adendum-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, MatDialogModule],
  templateUrl: './adendum-dialog.component.html',
  styleUrl: './adendum-dialog.component.scss',
})
export class AdendumDialogComponent {
  private ref = inject(MatDialogRef<AdendumDialogComponent, boolean>);
  private adendumService = inject(AdendumNegociacionService);
  private snackBar = inject(MatSnackBar);
  private funcionesDatos = inject(FuncionesDatosService);

  @ViewChild('fechaAdendumInput', { read: ElementRef }) fechaInputRef!: ElementRef<HTMLInputElement>;
  fechaControl = new UntypedFormControl(new Date());
  private _rawFecha = '';

  form = {
    id: 0,
    numAdendum: '',
    descripcion: '',
    valorAjuste: 0,
    observacion: '',
  };

  guardando = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: AdendumDialogData) {
    if (data.adendum) {
      const a = data.adendum;
      this.form = { id: a.id, numAdendum: a.numAdendum || '', descripcion: a.descripcion || '', valorAjuste: a.valorAjuste || 0, observacion: a.observacion || '' };
      const d = this.parseAny(a.fechaAdendum);
      if (d) this.fechaControl.setValue(d, { emitEvent: false });
    }
  }

  get valorResultante(): number { return this.data.valorVigente + Number(this.form.valorAjuste || 0); }
  get modoEdicion(): boolean { return !!this.data.adendum; }

  capturarFechaRaw(e: Event): void { this._rawFecha = (e.target as HTMLInputElement).value; }
  syncFechaFromRaw(e: FocusEvent): void {
    const raw = (this._rawFecha || (e.target as HTMLInputElement)?.value || '').trim();
    this._rawFecha = '';
    const d = this.parseFecha(raw);
    if (d) {
      this.fechaControl.setValue(d, { emitEvent: false });
      const fmt = this.funcionesDatos.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
      setTimeout(() => { if (this.fechaInputRef?.nativeElement) this.fechaInputRef.nativeElement.value = fmt; });
    }
  }
  onPickerChange(d: Date | null | undefined): void {
    if (!d) return;
    this.fechaControl.setValue(d, { emitEvent: false });
    const fmt = this.funcionesDatos.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => { if (this.fechaInputRef?.nativeElement) this.fechaInputRef.nativeElement.value = fmt; });
  }

  guardar(): void {
    if (!this.form.descripcion.trim()) { this.snackBar.open('Ingrese la descripción', 'Cerrar', { duration: 3000 }); return; }
    const payload: Partial<AdendumNegociacion> = {
      ...(this.form.id ? { id: this.form.id } : {}),
      negociacion: { id: this.data.negociacion.id } as any,
      numAdendum: this.form.numAdendum || undefined,
      fechaAdendum: this.toISO(this.fechaControl.value) || new Date().toISOString().substring(0, 10),
      descripcion: this.form.descripcion,
      valorAjuste: Number(this.form.valorAjuste) || 0,
      valorTotalResultante: this.valorResultante,
      observacion: this.form.observacion || undefined,
      estado: 1,
      usuario: { codigo: this.data.idUsuario } as any,
      fechaRegistro: new Date().toISOString(),
    };
    this.guardando = true;
    const op$ = this.modoEdicion ? this.adendumService.update(payload) : this.adendumService.add(payload);
    op$.subscribe({
      next: () => { this.guardando = false; this.ref.close(true); },
      error: () => { this.guardando = false; this.snackBar.open('Error al guardar adendum', 'Cerrar', { duration: 4000 }); },
    });
  }

  cancelar(): void { this.ref.close(false); }

  private parseFecha(s: string): Date | null {
    const p = s.split('/'); if (p.length !== 3) return null;
    const [d, m, y] = p.map(Number);
    if (isNaN(d) || isNaN(m) || isNaN(y) || y < 1000) return null;
    const dt = new Date(y, m - 1, d);
    return (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) ? dt : null;
  }

  private parseAny(val: any): Date | null {
    if (!val) return null;
    if (Array.isArray(val)) { const [y, mo, d] = val as number[]; return new Date(y, mo - 1, d); }
    const d = new Date(val); return isNaN(d.getTime()) ? null : d;
  }

  private toISO(val: any): string | undefined {
    if (!val) return undefined;
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return undefined;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
