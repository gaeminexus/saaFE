import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { DetallePrestamo } from '../../model/detalle-prestamo';
import { PagoPrestamo } from '../../model/pago-prestamo';

export interface PrestamoPagosDialogData {
  detalle: DetallePrestamo;
  pagos: PagoPrestamo[];
}

@Component({
  selector: 'app-prestamo-pagos-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule
  ],
  templateUrl: './prestamo-pagos-dialog.component.html',
  styleUrls: ['./prestamo-pagos-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PrestamoPagosDialogComponent {
  displayedColumns: string[] = ['fecha', 'capitalPagado', 'interesPagado', 'moraPagada', 'valor'];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PrestamoPagosDialogData
  ) {}
}
