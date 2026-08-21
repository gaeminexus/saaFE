import { CausalTerminacion } from './causal-terminacion';
import { ContratoEmpleado } from './contrato-empleado';
import { Empleado } from './empleado';

/**
 * Finiquito de un colaborador. Tabla `RHH.LQDC`.
 *
 * Las catorce columnas que el anexo del contrato añadió en la fase 8 están todas aquí. Ojo con
 * `estado`: el script 05 recreó `LQDCESTD` como `NUMBER`, así que es **rubro 196**
 * (BORRADOR · CALCULADA · APROBADA · REGISTRADA EN SUT · PAGADA · ANULADA) y no una cadena.
 */
export interface Liquidacion {
  codigo: number; // LQDCCDGO
  empleado: Empleado | { codigo: number }; // MPLDCDGO
  contratoEmpleado: ContratoEmpleado | { codigo: number } | null; // CNTECDGO
  causalTerminacion: CausalTerminacion | { codigo: number } | null; // CSTRCDGO
  fechaSalida: Date; // LQDCFCSL
  fechaIngreso?: Date | null; // LQDCFCIN
  aniosServicio?: number | null; // LQDCANSR
  ultimaRemuneracion?: number | null; // LQDCULRM

  totalIngresos?: number | null; // LQDCTTIN
  totalDescuentos?: number | null; // LQDCTTDS
  neto: number; // LQDCNETO

  desahucio?: number | null; // LQDCDSHC
  despidoIntempestivo?: number | null; // LQDCDSPD
  jubilacionPatronal?: number | null; // LQDCJBPT

  actaSut?: string | null; // LQDCACSU
  fechaSut?: Date | null; // LQDCFCSU

  asiento?: number | null; // ASNTCDGO - código, sin objeto, igual que PRDNASNT
  estado: number; // LQDCESTD - rubro 196
  fechaAprobacion?: Date | null; // LQDCFCAP
  usuarioAprueba?: string | null; // LQDCUSAP

  observaciones?: string | null; // LQDCOBSR
  fechaRegistro?: Date; // LQDCFCHR
  usuarioRegistro?: string; // LQDCUSRR
}
