import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../shared/model/datos-busqueda/tipo-datos-busqueda';

/**
 * Base del rol técnico de ARCH (filial 2): 7 dígitos, `9000000 + ENTDCDGO`. Es el mismo valor que
 * `ROL_TECNICO_ARCH_BASE` de `CargaArchivoPetroServiceImpl` (saaBE, ~línea 1079; se asigna en ~1169).
 * Si la entidad ya tenía un rol real de Petro, la carga usa ese rol (< 9000000); el técnico solo
 * aparece cuando no lo tenía.
 */
export const ROL_TECNICO_ARCH_BASE = 9000000;

/**
 * Código de entidad (ENTDCDGO) de un `codigoPetro` que es rol TÉCNICO de ARCH, o `null` si es un
 * rol real de Petro (en ese caso la entidad se busca por `rolPetroComercial`).
 */
export function codigoEntidadDeRolTecnico(codigoPetro: number | string | null | undefined): number | null {
  const rol = Number(codigoPetro);
  return Number.isFinite(rol) && rol >= ROL_TECNICO_ARCH_BASE ? rol - ROL_TECNICO_ARCH_BASE : null;
}

/**
 * Criterio para ubicar la entidad de un `codigoPetro` de una carga: por `codigo` si es rol técnico
 * de ARCH, por `rolPetroComercial` si es un rol real de Petro.
 */
export function criterioEntidadPorCodigoPetro(codigoPetro: number | string): DatosBusqueda {
  const criterio = new DatosBusqueda();
  const entidad = codigoEntidadDeRolTecnico(codigoPetro);
  if (entidad !== null) {
    criterio.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'codigo', String(entidad), TipoComandosBusqueda.IGUAL);
  } else {
    criterio.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.LONG,
      'rolPetroComercial',
      String(codigoPetro),
      TipoComandosBusqueda.IGUAL,
    );
  }
  return criterio;
}

/** ¿Esta entidad es la del `codigoPetro` de la carga? (por código si es rol técnico, o por rol real). */
export function entidadCorrespondeACodigoPetro(
  entidad: { codigo?: number; rolPetroComercial?: number } | null | undefined,
  codigoPetro: number | string | null | undefined,
): boolean {
  if (!entidad || !codigoPetro) return false;
  const tecnica = codigoEntidadDeRolTecnico(codigoPetro);
  if (tecnica !== null && Number(entidad.codigo) === tecnica) return true;
  return Number(entidad.rolPetroComercial) === Number(codigoPetro);
}
