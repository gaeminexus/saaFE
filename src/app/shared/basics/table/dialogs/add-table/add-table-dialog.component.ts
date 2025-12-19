import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FieldConfig } from '../../dynamic-form/model/field.interface';
import { DynamicFormComponent } from '../../dynamic-form/components/dynamic-form/dynamic-form.component';
import { MaterialFormModule } from '../../../../modules/material-form.module';

@Component({
  selector: 'app-add-table-dialog.component',
  standalone: true,
  imports: [DynamicFormComponent, MaterialFormModule],
  templateUrl: './add-table-dialog.component.html',
  styleUrl: './add-table-dialog.component.scss'
})
export class AddTableDialogComponent implements OnInit  {

  @ViewChild(DynamicFormComponent) form!: DynamicFormComponent;

  constructor(
    public dialogRef: MatDialogRef<AddTableDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
    this.asignaValoresaForm();
  }

  onSalirClick(): void {
    this.dialogRef.close();
  }

  async grabar(): Promise<void> {
    if (this.form.control.valid) {
      try {
        // Si hay un callback onSave, ejecutarlo
        if (this.data.onSave) {
          await this.data.onSave(this.form.value);
        }

        // Cerrar el diálogo después de guardar exitosamente
        this.dialogRef.close(true);
      } catch (error) {
        // Aquí podrías mostrar un mensaje de error al usuario
      }
    }
  }

  asignaValoresaForm(): void {
    this.data.regConfig.forEach((val: FieldConfig) => {
        val.value = null;
    });
  }

}
