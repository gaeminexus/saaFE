import { Cargo } from './cargo';
import { DepartamentoCargo } from './departamento-cargo';
import { Empleado } from './empleado';

/**
 * Historial de cargos del colaborador. Tabla `RHH.HSTR`.
 *
 * Su `@Path` es `hscg`, no `hstr`, porque el original chocaba con `crd/HistorialSueldoRest`.
 *
 * **No tiene propiedad `departamento`.** Al corregir el defecto 4 del análisis, el campo mal
 * mapeado se renombró a `departamentoCargo` y se repuntó a `DPTCCDGO`; no se creó un segundo
 * campo. La columna `DPRTCDGO` sigue en la tabla como residuo del DDL original pero no está
 * mapeada y no viaja en el JSON. El departamento se obtiene navegando
 * `departamentoCargo.departamento`.
 */
export interface Historial {
  codigo: number; // HSTRCDGO
  empleado: Empleado; // MPLDCDGO
  departamentoCargo?: DepartamentoCargo | { codigo: number } | null; // DPTCCDGO
  cargo: Cargo; // CRGOCDGO
  tipoCambio?: number | null; // HSTRTPCM - rubro 217
  sueldoAnterior?: number | null; // HSTRSLAN
  sueldoNuevo?: number | null; // HSTRSLNW
  fechaInicio: Date | string; // HSTRFCHI
  fechaFin?: Date | string | null; // HSTRFCHF
  actual: string | number; // HSTRACTL
  observacion?: string | null; // HSTROBSR
  fechaRegistro?: Date | string | null; // HSTRFCHR
  usuarioRegistro?: string | null; // HSTRUSRR
}
