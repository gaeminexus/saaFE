import { FieldConfig } from './field.interface';
import { TipoFormatoFechaBackend } from '../../../../services/funciones-datos.service';

export interface DateFieldConfig extends FieldConfig {
  type: 'date';
  name: string;
  value?: Date;
  /**
   * Tipo de formato para enviar al backend
   * Por defecto: FECHA_HORA (yyyy-MM-dd HH:mm:ss)
   */
  formatoBackend?: TipoFormatoFechaBackend;
  /**
   * Si mostrar selector de hora en el UI
   * Por defecto: false (solo fecha)
   */
  mostrarHora?: boolean;
}
