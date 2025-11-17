import { FieldConfig } from './field.interface';

export interface DateFieldConfig extends FieldConfig {
  type: 'date';
  name: string;
  value?: Date;
}
