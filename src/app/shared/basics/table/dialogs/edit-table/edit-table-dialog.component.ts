import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DynamicFormComponent } from '../../dynamic-form/components/dynamic-form/dynamic-form.component';
import { FieldConfig } from '../../dynamic-form/model/field.interface';
import { MaterialFormModule } from '../../../../modules/material-form.module';

@Component({
  selector: 'app-edit-table-dialog.component',
  standalone: true,
  imports: [DynamicFormComponent, MaterialFormModule],
  templateUrl: './edit-table-dialog.component.html',
  styleUrl: './edit-table-dialog.component.scss'
})
export class EditTableDialogComponent implements OnInit {

  @ViewChild(DynamicFormComponent) form!: DynamicFormComponent;

  constructor(
    public dialogRef: MatDialogRef<EditTableDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
    this.asignaValoresaForm();
  }

  asignaValoresaForm(): void {
    this.data.regConfig.forEach((val: FieldConfig) => {
      val.value = this.data.registro[val.name];
      if (val.type === 'autocomplete'){
        val.selected = this.data.registro[val.name];
      }
    });
  }

  asignaValoresaRegistro(): void {
    this.data.regConfig.forEach((val: FieldConfig) => {
      this.data.registro[val.name] = this.form.value[val.name];
      this.dialogRef.close(this.data.registro);
    });
  }

  onSalirClick(): void {
    this.dialogRef.close();
  }

  grabar(): void {
    if (this.form.control.valid) {
      this.asignaValoresaRegistro();
    }
  }

}
