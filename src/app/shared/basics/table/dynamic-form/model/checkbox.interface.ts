import { FieldConfig } from './field.interface';

export interface CheckboxFieldConfig extends FieldConfig {
  type: 'checkbox';
  name: string;
  value?: boolean;
}
