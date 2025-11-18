import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-pdf-participe-detalle-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './pdf-participe-detalle-dialog.component.html',
  styleUrl: './pdf-participe-detalle-dialog.component.scss'
})
export class PdfParticipeDetalleDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<PdfParticipeDetalleDialogComponent>
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }

  seleccionar(opcion: string): void {
    this.dialogRef.close(opcion);
  }
}
