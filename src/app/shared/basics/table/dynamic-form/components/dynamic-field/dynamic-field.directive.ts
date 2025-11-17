import {
  Directive,
  Input,
  OnInit,
  ViewContainerRef,
  Type
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { InputComponent } from '../input/input.component';
import { ButtonComponent } from '../button/button.component';
import { SelectComponent } from '../select/select.component';
import { DateComponent } from '../date/date.component';
import { RadiobuttonComponent } from '../radiobutton/radiobutton.component';
import { CheckboxComponent } from '../checkbox/checkbox.component';
import { AutocompleteComponent } from '../autocomplete/autocomplete.component';
import { FieldConfig } from '../../model/field.interface';

export type ComponentType = 'input' | 'button' | 'select' | 'date' | 'radiobutton' | 'checkbox' | 'autocomplete';

// Interface común para todos los componentes dinámicos
export interface DynamicFormComponent {
  field: FieldConfig;
  group: FormGroup;
  accion: number;
}

const componentMapper: { [key in ComponentType]: Type<DynamicFormComponent> } = {
  input: InputComponent,
  button: ButtonComponent,
  select: SelectComponent,
  date: DateComponent,
  radiobutton: RadiobuttonComponent,
  checkbox: CheckboxComponent,
  autocomplete: AutocompleteComponent
};

@Directive({
  selector: '[appDynamicField]'
})
export class DynamicFieldDirective implements OnInit {
  @Input() field!: FieldConfig;
  @Input() group!: FormGroup;
  @Input() accion!: number;

  constructor(
    private container: ViewContainerRef
  ) { }

  ngOnInit(): void {
    if (!this.field.type) {
      console.error('Field type is required');
      return;
    }

    // Asegurarse de que field.type es un ComponentType válido
    const type = this.field.type as ComponentType;
    const componentType = componentMapper[type];
    if (!componentType) {
      console.error(`Component type ${type} not found in mapper`);
      return;
    }

    // Crear el componente usando el método moderno
    const componentRef = this.container.createComponent<DynamicFormComponent>(componentType);

    // Asignar propiedades al componente
    const instance = componentRef.instance;
    instance.field = this.field;
    instance.group = this.group;
    instance.accion = this.accion;
  }

}
