import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
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
    MaterialFormModule
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
