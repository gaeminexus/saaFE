export interface SelectOption {
  codigo?: number;
  [key: string]: any;
}

import { FieldConfig } from './field.interface';

export interface SelectFieldConfig extends FieldConfig {
  name: string; // Requerido para el formControlName
  type: 'select'; // Requerido y específico para select
  collections?: SelectOption[];
  selectField?: string[];
  filterFather?: string;
  autocompleteType?: number;
  value?: any;
}
