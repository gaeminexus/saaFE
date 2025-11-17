import { FieldConfig } from './field.interface';

export interface ButtonFieldConfig extends FieldConfig {
  type: 'button';
  name: string;
  value?: string;
}
