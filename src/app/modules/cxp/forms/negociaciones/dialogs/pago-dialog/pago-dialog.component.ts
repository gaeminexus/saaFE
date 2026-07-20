import { CommonModule } from '@angular/common';
import { Component, Inject, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule, UntypedFormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../../shared/services/funciones-datos.service';
import { CuotaConPagos } from '../../detalle-negociacion/detalle-negociacion.component';
import { PagoNegociacion } from '../../../../model/pago-negociacion';
import { PagoNegociacionService } from '../../../../service/pago-negociacion.service';

export interface PagoDialogData {
  cuota: CuotaConPagos;
  idUsuario: number;
}

@Component({
  selector: 'app-pago-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, MatDialogModule],
  templateUrl: './pago-dialog.component.html',
  styleUrl: './pago-dialog.component.scss',
})
export class PagoDialogComponent {
  private ref = inject(MatDialogRef<PagoDialogComponent, boolean>);
  private pagoService = inject(PagoNegociacionService);
  private snackBar = inject(MatSnackBar);
  private funcionesDatos = inject(FuncionesDatosService);

  @ViewChild('fechaPagoInput', { read: ElementRef }) fechaPagoInputRef!: ElementRef<HTMLInputElement>;
  fechaPagoControl = new UntypedFormControl(new Date());
  private _rawFecha = '';

  form = {
    valorPago: 0,
    tipoPago: 'ANTICIPO' as 'ANTICIPO' | 'FACTURA',
    refComprobante: '',
    descripcion: '',
    facturado: false,
    pagado: false,
  };

  guardando = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: PagoDialogData) {}

  get saldoCuota(): number { return this.data.cuota.saldo; }

  capturarFechaRaw(e: Event): void { this._rawFecha = (e.target as HTMLInputElement).value; }
  syncFechaFromRaw(e: FocusEvent): void {
    const raw = (this._rawFecha || (e.target as HTMLInputElement)?.value || '').trim();
    this._rawFecha = '';
    const d = this.parseFecha(raw);
    if (d) {
      this.fechaPagoControl.setValue(d, { emitEvent: false });
      const fmt = this.funcionesDatos.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
      setTimeout(() => { if (this.fechaPagoInputRef?.nativeElement) this.fechaPagoInputRef.nativeElement.value = fmt; });
    }
  }
  onPickerChange(d: Date | null | undefined): void {
    if (!d) return;
    this.fechaPagoControl.setValue(d, { emitEvent: false });
    const fmt = this.funcionesDatos.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => { if (this.fechaPagoInputRef?.nativeElement) this.fechaPagoInputRef.nativeElement.value = fmt; });
  }

  onTipoPagoChange(): void {
    if (this.form.tipoPago === 'FACTURA') { this.form.facturado = true; }
    else { this.form.facturado = false; this.form.pagado = false; }
  }

  guardar(): void {
    if (!this.form.valorPago || this.form.valorPago <= 0) { this.snackBar.open('Ingrese un valor de pago', 'Cerrar', { duration: 3000 }); return; }
    const fecha = this.toISO(this.fechaPagoControl.value);
    const payload: Partial<PagoNegociacion> = {
      formaPago: { id: this.data.cuota.id } as any,
      fechaPago: fecha || new Date().toISOString().substring(0, 10),
      valorPago: this.form.valorPago,
      tipoPago: this.form.tipoPago,
      descripcion: this.form.descripcion || undefined,
      facturaCompra: null,
      facturado: this.form.facturado ? 1 : 0,
      pagado: this.form.pagado ? 1 : 0,
      refComprobante: this.form.refComprobante || undefined,
      estado: 1,
      usuario: { codigo: this.data.idUsuario } as any,
      fechaRegistro: new Date().toISOString(),
    };
    this.guardando = true;
    this.pagoService.add(payload).subscribe({
      next: () => { this.guardando = false; this.ref.close(true); },
      error: () => { this.guardando = false; this.snackBar.open('Error al guardar pago', 'Cerrar', { duration: 4000 }); },
    });
  }

  cancelar(): void { this.ref.close(false); }

  private parseFecha(s: string): Date | null {
    if (!s) return null;
    const p = s.split('/');
    if (p.length !== 3) return null;
    const [d, m, y] = p.map(Number);
    if (isNaN(d) || isNaN(m) || isNaN(y) || y < 1000) return null;
    const dt = new Date(y, m - 1, d);
    return (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) ? dt : null;
  }

  private toISO(val: any): string | undefined {
    if (!val) return undefined;
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return undefined;
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
}
