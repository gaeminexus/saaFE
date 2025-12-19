import { FieldConfig } from '../dynamic-form/model/field.interface';
import { FieldFormat } from './field-format-interface';

export interface TableConfig {
  fields?: FieldFormat[];
  registros?: any;
  regConfig?: FieldConfig[];
  entidad?: number;
  tiene_hijos?: boolean;
  es_hijo?: boolean;
  // botones
  add?: boolean;
  edit?: boolean;
  remove?: boolean;
  buttonExtra?: boolean;
  iconButtonExtra?: string;
  tipButtonExtra?: string;
  // Formato visual
  row_size?: string;
  footer?: boolean;
  paginator?: boolean;
  paginator_start?: number;
  paginator_salto?: number;
  filter?: boolean;
  fSize?: string; // Tamano de letra
  // CAMPOS PARA ENTIDADES HIJAS
  titulo?: string;
  descripcion?: string;
  entidad_padre?: number;
  reg_padre?: any;
  campo_padre?: string;
  // Callback para formatear datos después de recargar
  onDataUpdate?: (data: any[]) => any[];
}
