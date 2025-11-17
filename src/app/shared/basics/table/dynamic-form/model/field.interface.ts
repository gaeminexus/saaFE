export interface Validator {
  name: string;
  validator: any;
  message: string;
}
import { ComponentType } from '../components/dynamic-field/dynamic-field.directive';

export interface FieldConfig {
  label?: string;
  name: string; // Requerido para el formControlName
  inputType?: string;
  options?: any[];
  collections?: any;
  type: ComponentType;
  value?: any;
  selected?: any;
  selectField?: string[];
  autocompleteType?: number; // 1 normal, 2 padre, 3 hijo
  filterFather?: string; // Nombre del campo del padre por el que se filtra el combo
  rubroAlterno?: number; // Codigo alterno del rubro en caso de que el combo lea de uno
  validations?: Validator[];
}
