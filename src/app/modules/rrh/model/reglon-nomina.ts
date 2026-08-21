import { ConceptoNomina } from './concepto-nomina';
import { Nomina } from './nomina';

/**
 * Renglón del rol de pago. Tabla `RHH.RNGL`.
 *
 * Antes era un número anónimo —sin concepto ni descripción— y por eso la tabla era inservible.
 * El script 05 le añade la FK a `ConceptoNomina` y el snapshot de cómo se calculó: base,
 * porcentaje, origen y las banderas de imponibilidad vigentes en el momento del cálculo.
 *
 * **Cuidado al copiar código desde la pantalla de conceptos:** el mismo concepto se llama
 * `imponibleIr` en `ConceptoNomina` (CPNMIMIR) y `gravadoIr` aquí (RNGLIMIR). Es una
 * inconsistencia conocida y aceptada del backend; confundirlas deja el campo vacío sin error.
 */
export interface ReglonNomina {
  codigo: number; // RNGLCDGO
  nomina: Nomina; // NMNACDGO
  conceptoNomina?: ConceptoNomina | { codigo: number } | null; // CPNMCDGO
  descripcion?: string | null; // RNGLDSCR
  tipoConcepto?: number | null; // RNGLTPCN - rubro 179
  cantidad: number; // RNGLCANT
  baseCalculo?: number | null; // RNGLBSCL
  porcentaje?: number | null; // RNGLPRCN
  valor: number; // RNGLVLOR
  origen?: number | null; // RNGLORGN - rubro 213
  manual?: string | null; // RNGLMNAL - 'S' / 'N'
  imponibleIess?: string | null; // RNGLIMIE - 'S' / 'N'
  gravadoIr?: string | null; // RNGLIMIR - 'S' / 'N'; en ConceptoNomina se llama imponibleIr
  patronal?: string | null; // RNGLPTRN - 'S' / 'N'
  tablaReferencia?: string | null; // RNGLRFTB
  idReferencia?: number | null; // RNGLRFID
  orden: number; // RNGLORDN
  fechaRegistro: Date; // RNGLFCHR
  usuarioRegistro: string; // RNGLUSRR
}
