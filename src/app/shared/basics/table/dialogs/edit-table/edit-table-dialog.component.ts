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
      const valorActual = this.data.registro[val.name];

      // Para selects con collections, convertir el valor numérico al objeto completo
      if (val.type === 'select' && val.collections && typeof valorActual === 'number') {
        const opcionEncontrada = val.collections.find((opt: any) => opt.codigo === valorActual);
        val.value = opcionEncontrada || valorActual;
      } else if (val.type === 'autocomplete') {
        // Para autocomplete con rubroAlterno, el valor numérico es suficiente
        // El componente AutocompleteComponent se encarga de cargar las collections
        // y mostrar la descripción correspondiente
        val.value = valorActual;
        val.selected = valorActual;
      } else {
        val.value = valorActual;
      }
    });
  }

  asignaValoresaRegistro(): any {
    const registroActualizado = {...this.data.registro};
    this.data.regConfig.forEach((val: FieldConfig) => {
      registroActualizado[val.name] = this.form.value[val.name];
    });
    return registroActualizado;
  }

  onSalirClick(): void {
    this.dialogRef.close();
  }

  async grabar(): Promise<void> {
    if (this.form.control.valid) {
      try {
        const registroActualizado = this.asignaValoresaRegistro();

        // Si hay un callback onSave, ejecutarlo
        if (this.data.onSave) {
          await this.data.onSave(registroActualizado);
        }

        // Cerrar el diálogo después de guardar exitosamente
        this.dialogRef.close(true);
      } catch (error) {
        // Aquí podrías mostrar un mensaje de error al usuario
      }
    }
  }
}
