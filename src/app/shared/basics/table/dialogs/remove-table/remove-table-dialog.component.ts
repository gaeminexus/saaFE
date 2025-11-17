import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../modules/material-form.module';
import { DynamicFormComponent } from '../../dynamic-form/components/dynamic-form/dynamic-form.component';

@Component({
  selector: 'app-remove-table-dialog.component',
  standalone: true,
  imports: [MaterialFormModule],
  templateUrl: './remove-table-dialog.component.html',
  styleUrl: './remove-table-dialog.component.scss'
})
export class RemoveTableDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<RemoveTableDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
  }

  onSalirClick(): void {
    this.dialogRef.close();
  }

  grabar(): void {
      this.dialogRef.close(1);
  }

}
