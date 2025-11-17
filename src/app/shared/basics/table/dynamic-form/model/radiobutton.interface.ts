export interface RadioButtonOption {
  value: string | number;
  label: string;
}

import { FieldConfig } from './field.interface';

export interface RadioButtonFieldConfig extends FieldConfig {
  type: 'radiobutton';
  name: string;
  options: RadioButtonOption[];
  value?: string | number;
}
