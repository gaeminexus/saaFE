import { Cargo } from './cargo';
import { Departamento } from './departamento';

/**
 * Asignación de un cargo a un departamento. Tabla `RHH.DPTC`.
 *
 * Ojo con el nombre de las dos FK: el modelo original del frontend las declaró con inicial
 * mayúscula (`Departamento`, `Cargo`) y el contrato las nombra en minúscula. Mientras no se
 * confirme cuál serializa el backend, ambas formas están declaradas y se leen con
 * `departamentoDe()` y `cargoDe()`, que es donde vive la tolerancia. El código anterior del
 * módulo ya hacía este mismo doble intento.
 */
export interface DepartamentoCargo {
  codigo: number; // DPTCCDGO
  Departamento?: Departamento; // DPRTCDGO
  departamento?: Departamento; // DPRTCDGO
  Cargo?: Cargo; // CRGOCDGO
  cargo?: Cargo; // CRGOCDGO
  estado: string; // DPTCESTD
  fechaRegistro: Date; // DPTCFCHR
  usuarioRegistro: string; // DPTCUSRR
}

/** Departamento de una asignación, sea cual sea la forma en que llegue serializada. */
export function departamentoDe(asignacion: any): Departamento | null {
  return asignacion?.departamento ?? asignacion?.Departamento ?? null;
}

/** Cargo de una asignación, sea cual sea la forma en que llegue serializada. */
export function cargoDe(asignacion: any): Cargo | null {
  return asignacion?.cargo ?? asignacion?.Cargo ?? null;
}

/** Etiqueta «Departamento — Cargo» para tablas y combos. */
export function etiquetaDepartamentoCargo(asignacion: any): string {
  const departamento = departamentoDe(asignacion)?.nombre ?? '';
  const cargo = cargoDe(asignacion)?.nombre ?? '';

  if (!departamento && !cargo) return '—';
  if (!departamento) return cargo;
  if (!cargo) return departamento;
  return `${departamento} — ${cargo}`;
}
