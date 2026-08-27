/**
 * Reexporta el helper único de extracción de mensaje de error.
 *
 * La implementación vivía duplicada aquí (con la guarda `esQuejaDelParser`
 * contra el genérico de Angular "Http failure...") y en
 * `shared/utils/mensaje-error.util.ts` (sin esa guarda). Esa guarda ya se
 * incorporó a la versión de `shared/`, que ahora es la única fuente de
 * verdad — este archivo se mantiene solo para no romper a los módulos de
 * RRHH que ya importan `mensajeDeError` desde aquí.
 */
export { mensajeDeError } from '../../../../shared/utils/mensaje-error.util';
