import { Filial } from './filial';

/**
 * GNAP - Generación de archivo Petrocomercial.
 *
 * Ciclo: se crea la cabecera (estado 0), se genera el TXT (estado 1) y recién
 * cuando el archivo se descarga por el endpoint del backend queda estampada
 * `fechaDescarga`. Mientras el TXT no haya salido del sistema la generación se
 * puede eliminar; una vez descargada queda congelada.
 */
export interface GeneracionArchivoPetro {
  codigo?: number;
  mesPeriodo: number;
  anioPeriodo: number;
  fechaGeneracion?: string | number[];
  usuarioGeneracion?: string;
  totalRegistros?: number;
  totalMontoEnviado?: number;
  estado?: number;
  rutaArchivo?: string;
  nombreArchivo?: string;
  fechaEnvio?: string;
  fechaProcesamiento?: string;
  /** null = el TXT nunca se descargó. Con valor, la generación no se puede eliminar. */
  fechaDescarga?: string | number[] | null;
  /** Quién descargó el archivo la primera vez; las descargas siguientes no lo pisan. */
  usuarioDescarga?: string | null;
  observaciones?: string;
  filial?: Filial;
  usuarioIngreso?: string;
  fechaIngreso?: string;
  usuarioModificacion?: string;
  fechaModificacion?: string;
}

/** Estados de GNAP.estado. */
export enum EstadoGeneracionPetro {
  PENDIENTE = 0,
  GENERADO = 1,
  ENVIADO = 2,
  PROCESADO = 3,
}

export const ESTADO_GENERACION_PETRO_LABELS: Record<number, string> = {
  [EstadoGeneracionPetro.PENDIENTE]: 'Pendiente',
  [EstadoGeneracionPetro.GENERADO]: 'Generado',
  [EstadoGeneracionPetro.ENVIADO]: 'Enviado',
  [EstadoGeneracionPetro.PROCESADO]: 'Procesado',
};

export const ESTADO_GENERACION_PETRO_CLASES: Record<number, string> = {
  [EstadoGeneracionPetro.PENDIENTE]: 'estado-pendiente',
  [EstadoGeneracionPetro.GENERADO]: 'estado-procesado',
  [EstadoGeneracionPetro.ENVIADO]: 'estado-enviado',
  [EstadoGeneracionPetro.PROCESADO]: 'estado-enviado',
};

/**
 * Única regla para habilitar "Eliminar": el archivo no salió del sistema y la
 * generación todavía no fue marcada como enviada o procesada.
 */
export function puedeEliminarGeneracion(gen: GeneracionArchivoPetro | null | undefined): boolean {
  if (!gen) return false;
  const estado = Number(gen.estado ?? -1);
  return gen.fechaDescarga == null
    && (estado === EstadoGeneracionPetro.PENDIENTE || estado === EstadoGeneracionPetro.GENERADO);
}

/** Respuesta de POST /gnap/generarArchivo/{codigo}. */
export interface ResultadoGeneracionPetro {
  success: boolean;
  mensaje?: string;
  codigoGeneracion?: number;
  totalRegistros?: number;
  totalMonto?: number;
  nombreArchivo?: string;
  rutaArchivo?: string;
}

/** Respuesta de DELETE /gnap/eliminar/{codigo}. */
export interface ResultadoEliminacionPetro {
  success: boolean;
  mensaje?: string;
  codigoGeneracion?: number;
  cuotasEliminadas?: number;
  participesEliminados?: number;
  detallesEliminados?: number;
  nombreArchivo?: string;
  /** false = el TXT ya no estaba en disco. No es un error: los registros sí se borraron. */
  archivoEliminado?: boolean;
}

/** Archivo devuelto por GET /gnap/descargarArchivo/{codigo}. */
export interface ArchivoPetroDescargado {
  blob: Blob;
  nombreArchivo: string;
}
