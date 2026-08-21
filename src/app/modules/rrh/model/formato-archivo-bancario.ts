import { Empresa } from '../../../shared/model/empresa';

/**
 * Formato del archivo de pago que exige el banco. Tabla `RHH.FMBN`.
 *
 * Es el espejo de salida de `RHH.FMRC`: si el formato del reloj biométrico es dato, el del banco
 * también. `generarArchivoBancario` lee esta tabla y su detalle; **sin un `FMBN` activo para la
 * empresa no se puede generar ningún archivo bancario**, y el backend lo dice explicando que
 * falta crearlo, no que falte código.
 *
 * `plantillaCabecera` y `plantillaPie` **no son filas de detalle**: son plantillas de texto con
 * marcadores que el backend sustituye al generar.
 */
export interface FormatoArchivoBancario {
  codigo: number; // FMBNCDGO
  empresa: Empresa | { codigo: number } | null; // PJRQCDGO
  nombre: string; // FMBNNMBR
  banco: string; // FMBNBNCO
  tipoFormato: number; // FMBNTPFR - rubro 209, el mismo de los archivos de marcación
  delimitador: string | null; // FMBNDLMT - solo si el tipo es delimitado
  extension: string | null; // FMBNEXTN - extensión del archivo generado
  codificacion: string | null; // FMBNCDFC
  formatoFecha: string | null; // FMBNFRFC - por defecto para los campos de fecha
  plantillaCabecera: string | null; // FMBNCBCR - texto con marcadores
  plantillaPie: string | null; // FMBNPIEE - texto con marcadores
  mapaTipoCuenta: string | null; // FMBNMPTC - 'alternoRubro199=codigoBanco;…'
  estado: number; // FMBNESTD
  fechaRegistro?: Date; // FMBNFCHR
  usuarioRegistro?: string; // FMBNUSRR
}

/**
 * Un campo del archivo bancario. Tabla `RHH.DFMB`.
 *
 * `orden` es único por formato (`UQ_DFMB_ORDN`). En los formatos de ancho fijo, un valor más
 * largo que `longitud` **se recorta**: una línea larga descuadra las columnas siguientes y el
 * banco rechaza el archivo entero.
 */
export interface DetalleFormatoBancario {
  codigo: number; // DFMBCDGO
  formato: FormatoArchivoBancario | { codigo: number } | null; // FMBNCDGO
  campo: number; // DFMBCMPO - rubro 224
  orden: number; // DFMBORDN - único por formato
  indiceInicio: number | null; // DFMBINCO - solo en ancho fijo
  longitud: number | null; // DFMBLNGT - solo en ancho fijo
  ladoRelleno: string | null; // DFMBRLLN - 'I' izquierda / 'D' derecha
  caracterRelleno: string | null; // DFMBCRLL
  decimales: number | null; // DFMBDCML
  incluyeSeparadorDecimal: string | null; // DFMBSPDC - 'S' / 'N'
  formatoFecha: string | null; // DFMBFRFC - nulo hereda el del formato
  valorFijo: string | null; // DFMBVLFJ - el literal que se escribe cuando el campo es LITERAL_FIJO
  estado: number; // DFMBESTD
  fechaRegistro?: Date; // DFMBFCHR
  usuarioRegistro?: string; // DFMBUSRR
}

/** Marcadores que el backend sustituye en `plantillaCabecera` y `plantillaPie`. */
export const MARCADORES_PLANTILLA = [
  { marcador: '{FECHA}', descripcion: 'Fecha de emisión de la orden' },
  { marcador: '{CONTADOR}', descripcion: 'Número de registros del detalle' },
  { marcador: '{TOTAL}', descripcion: 'Importe total de la orden' },
  { marcador: '{EMPRESA}', descripcion: 'Nombre de la empresa que paga' },
  { marcador: '{SECUENCIAL}', descripcion: 'Número secuencial de la orden' },
];
