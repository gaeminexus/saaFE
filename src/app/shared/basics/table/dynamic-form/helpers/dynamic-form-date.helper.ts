import { FormGroup } from '@angular/forms';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../services/funciones-datos.service';
import { DateFieldConfig } from '../model/date.interface';
import { FieldConfig } from '../model/field.interface';

/**
 * Clase de utilidades para formatear campos de fecha en formularios dinámicos
 */
export class DynamicFormDateHelper {

  /**
   * Formatea todos los campos de tipo 'date' de un FormGroup para enviarlos al backend
   *
   * @param formGroup - FormGroup del formulario dinámico
   * @param fieldsConfig - Configuración de los campos del formulario
   * @param funcionesDatosService - Servicio de funciones de datos
   * @returns Objeto con todos los valores, las fechas formateadas correctamente
   *
   * @example
   * const datosParaBackend = DynamicFormDateHelper.formatearFechasFormulario(
   *   this.formGroup,
   *   this.fieldsConfig,
   *   this.funcionesDatosService
   * );
   */
  static formatearFechasFormulario(
    formGroup: FormGroup,
    fieldsConfig: FieldConfig[],
    funcionesDatosService: FuncionesDatosService
  ): any {
    const valores = formGroup.value;
    const resultado = { ...valores };

    // Filtrar solo los campos de tipo 'date'
    const camposFecha = fieldsConfig.filter(field => field.type === 'date') as DateFieldConfig[];

    // Formatear cada campo de fecha
    camposFecha.forEach(field => {
      const valor = resultado[field.name];

      if (valor) {
        const tipoFormato = field.formatoBackend || TipoFormatoFechaBackend.FECHA_HORA;
        resultado[field.name] = funcionesDatosService.formatearFechaParaBackend(valor, tipoFormato);
      }
    });

    return resultado;
  }

  /**
   * Prepara los datos del formulario para enviar al backend,
   * formateando fechas y aplicando transformaciones adicionales
   *
   * @param formGroup - FormGroup del formulario
   * @param fieldsConfig - Configuración de campos
   * @param funcionesDatosService - Servicio de funciones de datos
   * @param transformaciones - Función opcional para aplicar transformaciones adicionales
   * @returns Datos preparados para el backend
   *
   * @example
   * const datos = DynamicFormDateHelper.prepararDatosParaBackend(
   *   this.formGroup,
   *   this.fieldsConfig,
   *   this.funcionesDatosService,
   *   (datos) => {
   *     // Transformaciones adicionales
   *     datos.activo = datos.activo ? 1 : 0;
   *     return datos;
   *   }
   * );
   */
  static prepararDatosParaBackend(
    formGroup: FormGroup,
    fieldsConfig: FieldConfig[],
    funcionesDatosService: FuncionesDatosService,
    transformaciones?: (datos: any) => any
  ): any {
    let datos = this.formatearFechasFormulario(formGroup, fieldsConfig, funcionesDatosService);

    if (transformaciones) {
      datos = transformaciones(datos);
    }

    return datos;
  }

  /**
   * Valida si un campo de fecha tiene un formato backend válido configurado
   *
   * @param field - Configuración del campo
   * @returns true si el formato es válido o usa el default
   */
  static validarConfiguracionFecha(field: DateFieldConfig): boolean {
    if (!field.formatoBackend) {
      return true; // Usa default
    }

    const formatosValidos = Object.values(TipoFormatoFechaBackend);
    return formatosValidos.includes(field.formatoBackend);
  }

  /**
   * Obtiene el tipo de formato backend para un campo de fecha
   * Si no está configurado, retorna el formato por defecto (FECHA_HORA)
   *
   * @param field - Configuración del campo
   * @returns Tipo de formato a usar
   */
  static obtenerTipoFormato(field: DateFieldConfig): TipoFormatoFechaBackend {
    return field.formatoBackend || TipoFormatoFechaBackend.FECHA_HORA;
  }

  /**
   * Valida todos los campos de fecha de una configuración de formulario
   * Útil para debugging y validación en desarrollo
   *
   * @param fieldsConfig - Configuración de campos del formulario
   * @returns Array de advertencias (vacío si todo está correcto)
   */
  static validarConfiguracionFormulario(fieldsConfig: FieldConfig[]): string[] {
    const advertencias: string[] = [];

    const camposFecha = fieldsConfig.filter(field => field.type === 'date') as DateFieldConfig[];

    camposFecha.forEach(field => {
      if (!this.validarConfiguracionFecha(field)) {
        advertencias.push(
          `Campo "${field.name}": formatoBackend inválido "${field.formatoBackend}"`
        );
      }

      if (field.mostrarHora && field.formatoBackend === TipoFormatoFechaBackend.SOLO_FECHA) {
        advertencias.push(
          `Campo "${field.name}": Conflicto - mostrarHora=true pero formatoBackend=SOLO_FECHA`
        );
      }
    });

    return advertencias;
  }
}
