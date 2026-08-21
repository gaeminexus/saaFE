import { Empresa } from '../../../shared/model/empresa';
import { Empleado } from './empleado';
import { Nomina } from './nomina';
import { PeriodoNomina } from './periodo-nomina';

/**
 * Orden de pago de la nómina de un período. Tabla `RHH.RDPG`.
 *
 * Reúne lo que hay que transferir, de qué cuenta sale y a qué cuentas entra. De ella se
 * descarga el archivo que se sube a la banca electrónica, y al confirmarse la acreditación
 * queda registrada la fecha real del pago.
 *
 * `asientoPago` y `egreso` van como `Long`, no como relación: cruzan a CNT y a TSR, y la
 * relación JPA acoplaría los esquemas sin necesidad. Mismo criterio que `PRDNASNT`.
 */
export interface OrdenPagoNomina {
  codigo: number; // RDPGCDGO
  empresa: Empresa | { codigo: number } | null; // PJRQCDGO
  periodoNomina: PeriodoNomina | { codigo: number } | null; // PRDNCDGO
  cuentaBancaria: { codigo: number; [k: string]: any } | null; // CTBNCDGO - TSR.CNBC, de donde sale el dinero
  numero: string; // RDPGNMRO
  fechaEmision: Date; // RDPGFCEM
  fechaAcreditacion: Date | null; // RDPGFCAC - nula hasta confirmar
  total: number; // RDPGTTAL
  numeroEmpleados: number; // RDPGNMEM
  rutaArchivo: string | null; // RDPGRTAR
  asientoPago: number | null; // ASNTCDGO - código del asiento, sin relación
  egreso: number | null; // EGRSCDGO - código del TSR.EGRS consolidado
  estado: number; // RDPGESTD - rubro 208
  observaciones: string | null; // RDPGOBSR
  fechaRegistro?: Date; // RDPGFCHR
  usuarioRegistro?: string; // RDPGUSRR
}

/**
 * Una línea de la orden: a quién y a qué cuenta se ordena pagar. Tabla `RHH.DRPG`.
 *
 * **Los cinco campos de snapshot —`numeroCuenta`, `tipoCuenta`, `banco`, `identificacion` y
 * `nombreBeneficiario`— se copian al generar la orden y no se releen nunca.** Son la constancia
 * de a qué cuenta se ordenó pagar, aunque el colaborador cambie de banco después; navegar al
 * `CBEM` para mostrarlos daría el dato de hoy y no el del pago. Mismo criterio que los snapshot
 * de `RNGL`.
 */
export interface DetalleOrdenPagoNomina {
  codigo: number; // DRPGCDGO
  ordenPagoNomina: OrdenPagoNomina | { codigo: number } | null; // RDPGCDGO
  empleado: Empleado | { codigo: number } | null; // MPLDCDGO
  nomina: Nomina | { codigo: number } | null; // NMNACDGO
  cuentaBancariaEmpleado: { codigo: number } | null; // CBEMCDGO
  valor: number; // DRPGVLOR

  // Snapshot del momento de la orden; no se relee del empleado
  numeroCuenta: string; // DRPGNMCT
  tipoCuenta: number; // DRPGTPCT - rubro 199
  banco: string; // DRPGBNCO
  identificacion: string; // DRPGIDNT
  nombreBeneficiario: string; // DRPGNMBN

  rechazado: string; // DRPGRCHZ - 'S' / 'N'
  motivoRechazo: string | null; // DRPGMTRC
  estado: number; // DRPGESTD
  fechaRegistro?: Date; // DRPGFCHR
  usuarioRegistro?: string; // DRPGUSRR
}
