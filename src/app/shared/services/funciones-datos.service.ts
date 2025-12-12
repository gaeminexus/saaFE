import { Injectable } from '@angular/core';
import { DetalleRubroService } from './detalle-rubro.service';

const FECHA_HORA = 1;
const SOLO_FECHA = 2;

/**
 * Enum para tipos de formato de fecha para backend
 */
export enum TipoFormatoFechaBackend {
  /** Solo fecha: yyyy-MM-dd */
  SOLO_FECHA = 'SOLO_FECHA',
  /** Fecha con hora: yyyy-MM-dd HH:mm:ss */
  FECHA_HORA = 'FECHA_HORA',
  /** Fecha con hora pero hora en 00:00:00 */
  FECHA_HORA_CERO = 'FECHA_HORA_CERO',
}

/**
 * Configuración de formato para un campo de fecha específico
 */
export interface ConfiguracionCampoFecha {
  /** Nombre del campo */
  campo: string;
  /** Tipo de formato a aplicar */
  tipo: TipoFormatoFechaBackend;
}

@Injectable({
  providedIn: 'root',
})
export class FuncionesDatosService {
  public static FECHA_HORA = 1;
  public static SOLO_FECHA = 2;

  constructor(public detalleRubroService: DetalleRubroService) {}

  tCase(str1: any): string {
    let str = '';
    if (str1) {
      str = str1.toString();
    }
    let newStr = '';
    if (str) {
      newStr = str.toUpperCase();
    }
    return newStr;
  }

  tLowCase(str1: any): string {
    let str = '';
    if (str1) {
      str = str1.toString();
    }
    let newStr = '';
    if (str) {
      newStr = str.toLowerCase();
    }
    return newStr;
  }

  nvl(valor: any, campo: any): any {
    let resultado: any;
    if (valor) {
      resultado = valor;
    } else {
      resultado = campo;
    }
    return resultado;
  }

  mostrarSoloNumeros(evento: any): boolean {
    let continuar = false;
    if (evento.keyCode === 46) {
      continuar = true;
    }
    if (evento.keyCode >= 48 && evento.keyCode <= 57) {
      continuar = true;
    }
    return continuar;
  }

  formatoFecha(fecha: any, tipo: number): string {
    let fechaFac: Date | null;
    let strFecha = '';
    if (typeof fecha === 'undefined') {
      fechaFac = null;
    } else {
      if (tipo === 2) {
        fecha = fecha + 'T12:00:00';
      }
      fechaFac = new Date(fecha);
    }
    if (fechaFac) {
      /* 1 ***  DD-MM-YYYY / HH:mm  *** */
      if (tipo === FECHA_HORA) {
        strFecha =
          fechaFac.getDate().toString().padStart(2, '0') +
          '-' +
          (fechaFac.getMonth() + 1).toString().padStart(2, '0') +
          '-' +
          fechaFac.getFullYear() +
          ' / ' +
          fechaFac.getHours().toString().padStart(2, '0') +
          ':' +
          fechaFac.getMinutes().toString().padStart(2, '0');
      }
      /* 2 ***  DD-MM-YYYY *** */
      if (tipo === SOLO_FECHA) {
        strFecha =
          fechaFac.getDate().toString().padStart(2, '0') +
          '-' +
          (fechaFac.getMonth() + 1).toString().padStart(2, '0') +
          '-' +
          fechaFac.getFullYear();
      }
    }
    return strFecha;
  }

  formatoFechaOrigenConHora(fecha: any, tipo: number): string {
    let fechaFac: Date | null;
    let strFecha = '';
    if (typeof fecha === 'undefined') {
      fechaFac = null;
    } else {
      fechaFac = new Date(fecha);
    }
    if (fechaFac) {
      /* 1 ***  DD-MM-YYYY / HH:mm  *** */
      if (tipo === FECHA_HORA) {
        strFecha =
          fechaFac.getDate().toString().padStart(2, '0') +
          '-' +
          (fechaFac.getMonth() + 1).toString().padStart(2, '0') +
          '-' +
          fechaFac.getFullYear() +
          ' / ' +
          fechaFac.getHours().toString().padStart(2, '0') +
          ':' +
          fechaFac.getMinutes().toString().padStart(2, '0');
      }
      /* 2 ***  DD-MM-YYYY *** */
      if (tipo === SOLO_FECHA) {
        strFecha =
          fechaFac.getDate().toString().padStart(2, '0') +
          '-' +
          (fechaFac.getMonth() + 1).toString().padStart(2, '0') +
          '-' +
          fechaFac.getFullYear();
      }
    }
    return strFecha;
  }

  /**
   * Formatea una fecha para enviarla al backend en formato yyyy-MM-dd HH:mm:ss o yyyy-MM-dd
   * Este es el formato estándar que espera el backend para todos los campos de tipo Date
   *
   * @param fecha - Date object, string de fecha, o null/undefined
   * @param tipoFormato - Tipo de formato: SOLO_FECHA, FECHA_HORA, o FECHA_HORA_CERO
   * @returns String en formato correspondiente, o null si la fecha es inválida
   *
   * @example
   * formatearFechaParaBackend(new Date()) // "2025-02-05 14:43:28" (por defecto FECHA_HORA)
   * formatearFechaParaBackend(new Date(), TipoFormatoFechaBackend.SOLO_FECHA) // "2025-02-05"
   * formatearFechaParaBackend(new Date(), TipoFormatoFechaBackend.FECHA_HORA_CERO) // "2025-02-05 00:00:00"
   * formatearFechaParaBackend(null) // null
   */
  formatearFechaParaBackend(
    fecha: Date | string | null | undefined,
    tipoFormato: TipoFormatoFechaBackend = TipoFormatoFechaBackend.FECHA_HORA
  ): string | null {
    if (!fecha) return null;

    try {
      const date = fecha instanceof Date ? fecha : new Date(fecha);

      // Validar que sea una fecha válida
      if (isNaN(date.getTime())) {
        console.warn('Fecha inválida recibida:', fecha);
        return null;
      }

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      // Solo fecha (sin hora)
      if (tipoFormato === TipoFormatoFechaBackend.SOLO_FECHA) {
        return `${year}-${month}-${day}`;
      }

      // Fecha con hora en 00:00:00
      if (tipoFormato === TipoFormatoFechaBackend.FECHA_HORA_CERO) {
        return `${year}-${month}-${day}T00:00:00`;
      }

      // Fecha con hora actual (por defecto)
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    } catch (error) {
      console.error('Error al formatear fecha para backend:', error, 'Fecha recibida:', fecha);
      return null;
    }
  }

  /**
   * VERSIÓN LEGACY: Mantiene compatibilidad con código existente
   * @deprecated Use formatearFechaParaBackend con TipoFormatoFechaBackend
   */
  formatearFechaParaBackendLegacy(
    fecha: Date | string | null | undefined,
    incluirHora: boolean = true
  ): string | null {
    return this.formatearFechaParaBackend(
      fecha,
      incluirHora ? TipoFormatoFechaBackend.FECHA_HORA : TipoFormatoFechaBackend.SOLO_FECHA
    );
  }

  /**
   * Convierte múltiples campos de fecha de un objeto al formato del backend
   * Permite especificar el formato para cada campo individualmente
   *
   * @param obj - Objeto con campos de fecha
   * @param configuraciones - Array de configuraciones por campo, o array simple de nombres (usa FECHA_HORA por defecto)
   * @returns Nuevo objeto con las fechas formateadas
   *
   * @example
   * // Uso simple (todas con hora)
   * formatearFechasParaBackend(datos, ['fechaNacimiento', 'fechaIngreso']);
   *
   * // Uso avanzado (formatos diferentes por campo)
   * formatearFechasParaBackend(datos, [
   *   { campo: 'fechaNacimiento', tipo: TipoFormatoFechaBackend.SOLO_FECHA },
   *   { campo: 'fechaIngreso', tipo: TipoFormatoFechaBackend.FECHA_HORA },
   *   { campo: 'fechaVencimiento', tipo: TipoFormatoFechaBackend.FECHA_HORA_CERO }
   * ]);
   */
  formatearFechasParaBackend(obj: any, configuraciones: (string | ConfiguracionCampoFecha)[]): any {
    if (!obj) return obj;

    const resultado = { ...obj };

    configuraciones.forEach((config) => {
      // Si es string, usar formato por defecto (FECHA_HORA)
      if (typeof config === 'string') {
        if (resultado[config]) {
          resultado[config] = this.formatearFechaParaBackend(resultado[config]);
        }
      } else {
        // Si es ConfiguracionCampoFecha, usar el tipo especificado
        if (resultado[config.campo]) {
          resultado[config.campo] = this.formatearFechaParaBackend(
            resultado[config.campo],
            config.tipo
          );
        }
      }
    });

    return resultado;
  }

  /**
   * Helper para crear configuraciones de campos de fecha rápidamente
   *
   * @example
   * const configs = this.crearConfiguracionesFecha([
   *   'fechaNacimiento',  // FECHA_HORA por defecto
   *   { campo: 'fechaContrato', tipo: TipoFormatoFechaBackend.SOLO_FECHA }
   * ]);
   */
  crearConfiguracionesFecha(
    campos: (string | ConfiguracionCampoFecha)[]
  ): ConfiguracionCampoFecha[] {
    return campos.map((campo) => {
      if (typeof campo === 'string') {
        return { campo, tipo: TipoFormatoFechaBackend.FECHA_HORA };
      }
      return campo;
    });
  }
}
