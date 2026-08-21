import { Empresa } from '../../../shared/model/empresa';

/**
 * Formato del archivo del reloj biométrico. Tabla `RHH.FMRC`.
 *
 * El parser del importador se configura desde aquí y desde `RHH.DFMR` para no quedar atado a
 * una marca de equipo concreta.
 */
export interface FormatoMarcacion {
  codigo: number; // FMRCCDGO
  empresa: Empresa | null; // PJRQCDGO
  nombre: string; // FMRCNMBR
  marca: string | null; // FMRCMRCA - marca y modelo del dispositivo
  tipoFormato: number; // FMRCTPFR - rubro 209
  delimitador: string | null; // FMRCDLMT - solo en formatos delimitados
  lineasCabecera: number | null; // FMRCLNCB - líneas de cabecera a saltar
  lineasPie: number | null; // FMRCLNPI - líneas de pie a ignorar
  formatoFecha: string | null; // FMRCFRFC - patrón de fecha
  formatoHora: string | null; // FMRCFRHR - patrón de hora
  formatoFechaHora: string | null; // FMRCFRFH - patrón de fecha y hora combinadas
  codificacion: string | null; // FMRCCDFC - codificación del archivo
  estado: number; // FMRCESTD
  fechaRegistro?: Date; // FMRCFCHR
  usuarioRegistro?: string; // FMRCUSRR
}

/**
 * Mapeo campo a campo del formato de marcación. Tabla `RHH.DFMR`.
 *
 * En formatos delimitados manda `posicion`; en los de ancho fijo, `indiceInicio` y `longitud`.
 */
export interface DetalleFormatoMarcacion {
  codigo: number; // DFMRCDGO
  formato: FormatoMarcacion | { codigo: number } | null; // FMRCCDGO
  campo: number; // DFMRCMPO - rubro 215
  orden: number; // DFMRORDN - orden del campo en la línea
  posicion: number | null; // DFMRPSCN - base 1, formatos delimitados
  indiceInicio: number | null; // DFMRINCO - base 0, formatos de ancho fijo
  longitud: number | null; // DFMRLNGT - formatos de ancho fijo
  mapeo: string | null; // DFMRMPEO - traducción de valores origen a códigos del sistema
  obligatorio: string; // DFMROBLG - 'S' / 'N'
  estado: number; // DFMRESTD
  fechaRegistro?: Date; // DFMRFCHR
  usuarioRegistro?: string; // DFMRUSRR
}
