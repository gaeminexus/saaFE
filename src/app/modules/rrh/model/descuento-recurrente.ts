import { ConceptoNomina } from './concepto-nomina';
import { Empleado } from './empleado';

/**
 * Descuento recurrente del colaborador. Tabla `RHH.DSRC`.
 *
 * Préstamos del IESS, anticipos, préstamos internos y retenciones judiciales. El cálculo del
 * período recoge la cuota que vence en el mes; las retenciones judiciales son porcentuales sobre
 * el neto y por eso llevan `porcentaje` en vez de cuota fija.
 */
export interface DescuentoRecurrente {
  codigo: number; // DSRCCDGO
  empleado: Empleado | { codigo: number } | null; // MPLDCDGO
  conceptoNomina: ConceptoNomina | { codigo: number } | null; // CPNMCDGO - concepto con el que se descuenta
  tipoDescuento: number; // DSRCTPDS - rubro 197
  numero: string | null; // DSRCNMRO - referencia del préstamo u obligación
  valor: number; // DSRCVLOR - monto original
  saldo: number; // DSRCSLDD - saldo pendiente
  numeroCuotas: number | null; // DSRCNMCT
  cuotasPagadas: number; // DSRCCTPG
  valorCuota: number | null; // DSRCVLCT
  porcentaje: number | null; // DSRCPRCN - sobre el neto, en retenciones judiciales
  fechaInicio: Date; // DSRCFCHI
  fechaFin: Date | null; // DSRCFCHF
  beneficiario: string | null; // DSRCBNFC
  observacion: string | null; // DSRCOBSR
  aperturaMigracion: string; // DSRCAPRT - 'S' / 'N'
  estado: number; // DSRCESTD - rubro 198
  fechaRegistro?: Date; // DSRCFCHR
  usuarioRegistro?: string; // DSRCUSRR
}

/**
 * Cuota de amortización de un descuento recurrente. Tabla `RHH.CTDS`.
 *
 * `estado` no es un rubro: el DDL lo documenta como 1=PENDIENTE, 2=DESCONTADA, 3=PARCIAL,
 * 4=ANULADA. La parcial existe porque la protección de neto negativo puede recortar una cuota.
 */
export interface CuotaDescuento {
  codigo: number; // CTDSCDGO
  descuentoRecurrente: DescuentoRecurrente | { codigo: number } | null; // DSRCCDGO
  numeroCuota: number; // CTDSNMCT
  fechaVencimiento: Date; // CTDSFCVN
  total: number; // CTDSTTAL
  capital: number | null; // CTDSCPTL
  interes: number | null; // CTDSINTR
  valorDescontado: number; // CTDSVLDS
  saldo: number | null; // CTDSSLDD - saldo tras la cuota
  periodoNomina: { codigo: number } | null; // PRDNCDGO - período en que se descontó
  estado: number; // CTDSESTD
  fechaRegistro?: Date; // CTDSFCHR
  usuarioRegistro?: string; // CTDSUSRR
}

/** Estados de una cuota, según documenta el DDL de `RHH.CTDS`. */
export const ESTADOS_CUOTA = [
  { codigo: 1, descripcion: 'Pendiente' },
  { codigo: 2, descripcion: 'Descontada' },
  { codigo: 3, descripcion: 'Parcial' },
  { codigo: 4, descripcion: 'Anulada' },
];
