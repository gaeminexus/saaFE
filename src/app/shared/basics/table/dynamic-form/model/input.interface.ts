import { FieldConfig } from './field.interface';

export interface InputFieldConfig extends FieldConfig {
  type: 'input';
  name: string;
  inputType?: string;
  value?: string | number;
}
