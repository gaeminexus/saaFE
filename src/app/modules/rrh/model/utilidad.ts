import { Empleado } from './empleado';

/**
 * Reparto anual de utilidades. Tabla `RHH.UTLD`, una fila por empresa y ejercicio.
 *
 * **`baseTotal`, `basePorDias` y `basePorCargas`, no `base15`/`base10`/`base05`.** Los sufijos
 * numéricos de las columnas son los porcentajes de ley, pero esos porcentajes viven en
 * `PRNMUTPR`, `PRNMUTDI` y `PRNMUTCG`: si el legislador los cambia, una propiedad llamada
 * `base15` pasa a mentir. El nombre dice qué reparte, no con qué porcentaje.
 */
export interface Utilidad {
  codigo: number; // UTLDCDGO
  empresa?: { codigo: number } | null; // PJRQCDGO
  anio: number; // UTLDANOO - único por empresa
  utilidadContable: number; // UTLDUTCN - la da el usuario

  baseTotal?: number | null; // UTLDBS15
  basePorDias?: number | null; // UTLDBS10
  basePorCargas?: number | null; // UTLDBS05
  totalDias?: number | null; // UTLDTTDI
  totalCargas?: number | null; // UTLDTTCG

  /** Coeficientes de la empresa: en singular. El importe del empleado va en `DTUT`, en plural. */
  valorPorDia?: number | null; // UTLDVLDI
  valorPorCarga?: number | null; // UTLDVLCG

  topePorTrabajador?: number | null; // UTLDTPSB
  excedente?: number | null; // UTLDEXCD - lo que pasa del tope va al IESS
  fechaPago?: Date | null; // UTLDFCPG
  periodoNomina?: { codigo: number } | null; // PRDNCDGO

  estado: number; // UTLDESTD
  fechaRegistro?: Date; // UTLDFCHR
  usuarioRegistro?: string; // UTLDUSRR
}

/** Reparto de un colaborador. Tabla `RHH.DTUT`. */
export interface DetalleUtilidad {
  codigo: number; // DTUTCDGO
  utilidad?: Utilidad | { codigo: number } | null; // UTLDCDGO
  empleado?: Empleado | { codigo: number } | null; // MPLDCDGO
  dias?: number | null; // DTUTDIAS
  numeroCargas?: number | null; // DTUTNCRG

  /** Importes del empleado: en plural. Los coeficientes de la empresa van en `UTLD`. */
  valorPorDias?: number | null; // DTUTVL10
  valorPorCargas?: number | null; // DTUTVL05

  total?: number | null; // DTUTTTAL - antes del tope
  excedente?: number | null; // DTUTEXCD - lo que pasa del tope y va al IESS
  valorPagar?: number | null; // DTUTVLPG - tras aplicar el tope
  retencionIr?: number | null; // DTUTRTIR

  estado: number; // DTUTESTD
  fechaRegistro?: Date; // DTUTFCHR
  usuarioRegistro?: string; // DTUTUSRR
}
