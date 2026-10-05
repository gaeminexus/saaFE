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
  /**
   * Transitorio de `getAll`/`selectByCriteria`/`getId` (docs/rrh/API-PAGO-NOMINA-POR-EMPLEADO.md
   * §4, agregado en el contrato el 2026-10-05 tras un hueco reportado) — no es columna de
   * `RHH.RDPG`. `true`: la orden nació con un pago por empleado (circuito nuevo, §3) y usa
   * «Actualizar pagos». `false` o **ausente**: camino viejo, «Descargar archivo» + «Confirmar»
   * como siempre — el ausente se trata como `false` a propósito, para que un backend que todavía
   * no tenga este campo no cambie el comportamiento de ninguna pantalla.
   */
  pagoPorEmpleado?: boolean;
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
  tipoCuenta: number; // DRPGTPCT - rubro 23 (unificado con el de partícipes y el del archivo bancario de TSR, 2026-09-08; antes 199)
  banco: string; // DRPGBNCO
  identificacion: string; // DRPGIDNT
  nombreBeneficiario: string; // DRPGNMBN

  rechazado: string; // DRPGRCHZ - 'S' / 'N'
  motivoRechazo: string | null; // DRPGMTRC
  /** `EstadoDetalleOrdenPago` (docs/rrh/API-PAGO-NOMINA-POR-EMPLEADO.md §3.2). */
  estado: number; // DRPGESTD
  /**
   * Transitorios de `GET /drpg/selectByOrden/{idOrden}` (contrato §4) — el último pago (origen,
   * idOrigen) de este DRPG, no una columna de `RHH.DRPG`. No se usan hoy en pantalla: `estado` y
   * `motivoRechazo` ya alcanzan para lo que pide el contrato §5; se dejan tipados por si hacen
   * falta para depurar un caso donde `estado` no se sincronizó como se esperaba.
   */
  idPago?: number | null;
  estadoPago?: string | null;
  fechaRegistro?: Date; // DRPGFCHR
  usuarioRegistro?: string; // DRPGUSRR
}

/**
 * `com.saa.rubros.RhhEstadoDetalleOrdenPago` (contrato §3.2) — constantes Java, sin catálogo
 * (precedente `USAP`). El valor 1 es compatible con el único estado que existía hasta hoy
 * (ACTIVO, sin CHECK): una fila vieja que nadie volvió a tocar sigue leyéndose como PENDIENTE.
 */
export enum EstadoDetalleOrdenPago {
  PENDIENTE = 1,
  PAGADO = 2,
  RECHAZADO = 3,
}

export const ESTADO_DETALLE_ORDEN_PAGO_LABELS: Record<number, string> = {
  1: 'Pendiente',
  2: 'Pagado',
  3: 'Rechazado',
};

/**
 * `com.saa.rubros.RhhEstadoOrdenPago` / rubro 208 (contrato §3.2) — los tres valores que importan
 * para decidir qué botones mostrar y el tono de la pastilla de la orden. El texto que se ve sigue
 * saliendo del rubro (`RubrosRrh.ESTADO_ORDEN_PAGO`), salvo `RECHAZADA_PARCIAL`: la pantalla lo
 * muestra como «Pagada parcialmente» (contrato §5), más claro que el nombre de la constante.
 */
export enum EstadoOrdenPagoNomina {
  GENERADA = 1,
  CONFIRMADA = 3,
  RECHAZADA_PARCIAL = 4,
}
