import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';

@Component({
  selector: 'app-pdf-participe-detalle-dialog',
  standalone: true,
  imports: [
    MaterialFormModule
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
