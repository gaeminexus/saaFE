import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { DynamicFormComponent } from '../../dynamic-form/components/dynamic-form/dynamic-form.component';
import { FieldConfig } from '../../dynamic-form/model/field.interface';
import { AccionesGrid } from '../../../constantes';
import { MaterialFormModule } from '../../../../modules/material-form.module';

@Component({
  selector: 'app-table-form-panel',
  standalone: true,
  imports: [
    MaterialFormModule,
    DynamicFormComponent
  ],
  templateUrl: './table-form-panel.component.html',
  styleUrl: './table-form-panel.component.scss'
})
export class TableFormPanelComponent implements OnInit {

  @Input() fields!: FieldConfig[];
  @Input() accion!: number;
  @Input() titulo: string = '';
  @Input() datosIniciales?: any;

  @Output() onGuardar = new EventEmitter<any>();
  @Output() onCancelar = new EventEmitter<void>();

  @ViewChild(DynamicFormComponent) form!: DynamicFormComponent;

  tituloFormulario: string = '';
  iconoFormulario: string = '';

  ngOnInit(): void {
    this.configurarTitulo();
    this.asignaValoresaForm();
  }

  private configurarTitulo(): void {
    if (this.accion === AccionesGrid.ADD) {
      this.tituloFormulario = this.titulo || 'Agregar Registro';
      this.iconoFormulario = 'add_circle';
    } else if (this.accion === AccionesGrid.EDIT) {
      this.tituloFormulario = this.titulo || 'Editar Registro';
      this.iconoFormulario = 'edit';
    }
  }

  private asignaValoresaForm(): void {
    if (this.accion === AccionesGrid.ADD) {
      // Para agregar, limpiar todos los valores
      this.fields.forEach((val: FieldConfig) => {
        val.value = null;
      });
    } else if (this.accion === AccionesGrid.EDIT && this.datosIniciales) {
      // Para editar, asignar los valores existentes
      this.fields.forEach((val: FieldConfig) => {
        if (val.name && this.datosIniciales[val.name] !== undefined) {
          val.value = this.datosIniciales[val.name];
        }
      });
    }
  }

  cancelar(): void {
    this.onCancelar.emit();
  }

  guardar(): void {
    if (this.form.control.valid) {
      this.onGuardar.emit(this.form.value);
    } else {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.form.control.controls).forEach(key => {
        this.form.control.controls[key].markAsTouched();
      });
    }
  }
}
