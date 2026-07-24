import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { Exter } from '../../model/exter';

export interface ExterHistoricoDialogData {
  exter: Exter;
}

@Component({
  selector: 'app-exter-historico-dialog',
  standalone: true,
  imports: [MaterialFormModule],
  templateUrl: './exter-historico-dialog.component.html',
  styleUrl: './exter-historico-dialog.component.scss'
})
export class ExterHistoricoDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ExterHistoricoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ExterHistoricoDialogData
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }
}
