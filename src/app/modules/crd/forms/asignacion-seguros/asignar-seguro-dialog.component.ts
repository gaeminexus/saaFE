import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AsignacionSeguro, TipoSeguroPrestamo } from '../../model/asignacion-seguro';

export interface AsignarSeguroDialogData {
  tipoSeguro: TipoSeguroPrestamo;
  tipoLabel: string;
  cantidadPrestamos: number;
  montoTotal: number;
}

const EXTENSIONES_PERMITIDAS = ['.pdf', '.jpg', '.jpeg', '.png'];
const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024; // 10 MB

@Component({
  selector: 'app-asignar-seguro-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatIconModule,
    CurrencyPipe,
  ],
  templateUrl: './asignar-seguro-dialog.component.html',
  styleUrl: './asignar-seguro-dialog.component.scss',
})
export class AsignarSeguroDialogComponent implements OnInit {
  seguroForm!: FormGroup;
  loading = false;
  archivoSeleccionado: File | null = null;
  arrastrandoArchivo = false;

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<AsignarSeguroDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AsignarSeguroDialogData,
  ) {}

  ngOnInit(): void {
    this.seguroForm = this.fb.group({
      aseguradora: ['', Validators.required],
      broker: ['', Validators.required],
      numeroPoliza: ['', Validators.required],
      fechaInicioPoliza: [null, Validators.required],
      fechaFinPoliza: [null, Validators.required],
      plazoPolizaMeses: [null, [Validators.required, Validators.min(1)]],
    });

    this.seguroForm.get('fechaInicioPoliza')?.valueChanges.subscribe(() => this.recalcularPlazo());
    this.seguroForm.get('fechaFinPoliza')?.valueChanges.subscribe(() => this.recalcularPlazo());
  }

  private recalcularPlazo(): void {
    const inicio: Date | null = this.seguroForm.get('fechaInicioPoliza')?.value;
    const fin: Date | null = this.seguroForm.get('fechaFinPoliza')?.value;
    if (!inicio || !fin) return;

    let meses = (fin.getFullYear() - inicio.getFullYear()) * 12 + (fin.getMonth() - inicio.getMonth());
    if (fin.getDate() < inicio.getDate()) meses -= 1;

    if (meses > 0) {
      this.seguroForm.get('plazoPolizaMeses')?.setValue(meses, { emitEvent: false });
    }
  }

  get fechasInvalidas(): boolean {
    const inicio: Date | null = this.seguroForm.get('fechaInicioPoliza')?.value;
    const fin: Date | null = this.seguroForm.get('fechaFinPoliza')?.value;
    return !!inicio && !!fin && fin <= inicio;
  }

  // ================= adjunto de póliza =================

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.procesarArchivo(archivo);
    input.value = '';
  }

  onArchivoDrop(event: DragEvent): void {
    event.preventDefault();
    this.arrastrandoArchivo = false;
    const archivo = event.dataTransfer?.files?.[0] ?? null;
    this.procesarArchivo(archivo);
  }

  onArchivoDragOver(event: DragEvent): void {
    event.preventDefault();
    this.arrastrandoArchivo = true;
  }

  onArchivoDragLeave(): void {
    this.arrastrandoArchivo = false;
  }

  quitarArchivo(): void {
    this.archivoSeleccionado = null;
  }

  private procesarArchivo(archivo: File | null): void {
    if (!archivo) return;

    const nombre = archivo.name.toLowerCase();
    const extensionValida = EXTENSIONES_PERMITIDAS.some((ext) => nombre.endsWith(ext));
    if (!extensionValida) {
      this.snackBar.open('Formato no permitido. Use PDF, JPG o PNG.', 'Cerrar', { duration: 3500 });
      return;
    }

    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      this.snackBar.open('El archivo supera el máximo de 10 MB.', 'Cerrar', { duration: 3500 });
      return;
    }

    this.archivoSeleccionado = archivo;
  }

  formatoTamano(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  // ================= acciones =================

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.seguroForm.invalid || this.fechasInvalidas) {
      Object.keys(this.seguroForm.controls).forEach((key) => this.seguroForm.get(key)?.markAsTouched());
      return;
    }

    this.loading = true;

    const resultado: AsignacionSeguro = {
      tipoSeguro: this.data.tipoSeguro,
      aseguradora: this.seguroForm.value.aseguradora,
      broker: this.seguroForm.value.broker,
      numeroPoliza: this.seguroForm.value.numeroPoliza,
      fechaInicioPoliza: this.seguroForm.value.fechaInicioPoliza,
      fechaFinPoliza: this.seguroForm.value.fechaFinPoliza,
      plazoPolizaMeses: this.seguroForm.value.plazoPolizaMeses,
      cantidadPrestamos: this.data.cantidadPrestamos,
      montoTotalAsegurado: this.data.montoTotal,
      archivo: this.archivoSeleccionado,
    };

    // Simula el procesamiento; no hay endpoint de backend todavía para persistir la
    // asignación ni el archivo adjunto (ver modules/crd/model/asignacion-seguro.ts).
    setTimeout(() => {
      this.loading = false;
      this.dialogRef.close(resultado);
    }, 400);
  }
}
