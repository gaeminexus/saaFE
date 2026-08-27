import { Asiento } from '../../cnt/model/asiento';
import { ProductoPago } from '../../cxp/model/producto_pago';
import { Empresa } from '../../../shared/model/empresa';
import { Titular } from './titular';

/**
 * Estado del egreso de tesorería (columna EGRSESTD).
 * El egreso pasa a Pagado cuando su pago en /pgtr se confirma; con débito
 * automático nace ya Pagado.
 */
export enum EstadoEgresoTesoreria {
  PENDIENTE_PAGO = 1,
  PAGADO = 2,
  ANULADO = 3,
}

/** Clases de badge compartidas con las pantallas de pagos/cobros. */
export const ESTADO_EGRESO_LABELS: Record<number, { texto: string; clase: string }> = {
  [EstadoEgresoTesoreria.PENDIENTE_PAGO]: { texto: 'Pendiente de pago', clase: 'badge-neutro' },
  [EstadoEgresoTesoreria.PAGADO]: { texto: 'Pagado', clase: 'badge-pagada' },
  [EstadoEgresoTesoreria.ANULADO]: { texto: 'Anulado', clase: 'badge-anulado' },
};

/**
 * EGRS - Egreso de tesorería sin documento físico que lo respalde (débitos por
 * administración de cuentas, comisiones, servicios bancarios).
 *
 * La cuenta contable del gasto NO se elige aquí: sale del grupo del producto
 * CXP (`producto.grupoProducto.planCuenta`).
 *
 * El egreso se paga por el circuito de PagoProgramado (PGS.PGTR): registrarlo
 * crea su pago, que sigue el flujo lote → archivo → confirmación. La cuenta
 * bancaria de origen vive en ese pago, no en el egreso.
 */
export interface Egreso {
  id: number;
  empresa?: Empresa | null;
  /** Beneficiario. Obligatorio cuando el pago va por transferencia. */
  titular?: Titular | null;
  /** Producto CXP que clasifica el gasto; su grupo da la cuenta contable. */
  producto?: ProductoPago | null;
  descripcion?: string | null;
  valor: number;
  fecha: any;
  /** Ver {@link EstadoEgresoTesoreria}. */
  estado: number;
  /** 0 = transferencia, 1 = débito automático (columna EGRSDBAT). */
  debitoAutomatico?: number | null;
  /** Ver FormaPagoAplicacion (2 transferencia, 3 cheque, 4 débito automático). */
  formaPago?: number | null;
  /** Solo cuando `formaPago = 3` (cheque). Campo plano, no un objeto anidado. */
  numeroCheque?: number | null;
  /** Asiento del pago; nulo mientras el egreso está pendiente. */
  asiento?: Asiento | null;
  observacion?: string | null;
  usuario?: { codigo: number; nombre?: string } | null;
  fechaRegistro?: any;
}

/** Body de POST /egrs/procesar. */
export interface RegistrarEgresoRequest {
  idEmpresa: number;
  /** Obligatorio salvo en débito automático (el archivo del banco lo necesita). */
  idTitular?: number;
  idProductoPago: number;
  descripcion: string;
  valor: number;
  /** yyyy-MM-dd. Fecha programada del pago, o del débito si es automático. */
  fecha?: string;
  idCuentaBancariaOrigen: number;
  /** Obligatorio salvo en débito automático. Cuenta CTBN del beneficiario. */
  idCuentaDestinoTitular?: number;
  /** true cuando el banco ya debitó la cuenta: contabiliza en esta llamada. */
  debitoAutomatico?: boolean;
  referencia?: string;
  observacion?: string;
  idUsuario: number;
  /** Ver FormaPagoAplicacion (2 transferencia, 3 cheque, 4 débito automático). */
  formaPago?: number;
}

/**
 * Respuesta 201 de POST /egrs/procesar. En una transferencia el egreso queda
 * Pendiente y su pago espera al archivo del banco; en un débito automático ya
 * viene Pagado, con `asiento` (número alterno) y movimiento bancario generados.
 */
export interface RegistrarEgresoResponse {
  exito: boolean;
  mensaje: string;
  /** Id del egreso creado. */
  egreso?: number;
  /** Id del pago creado en /pgtr. */
  pago?: number;
  debitoAutomatico?: boolean;
  /** Solo en débito automático: número alterno del asiento contable. */
  asiento?: string;
  /** Solo cuando se pagó con cheque: el número girado. */
  numeroCheque?: number | string;
}

/** Respuesta de POST /egrs/anular/{id}. */
export interface AnularEgresoResponse {
  exito: boolean;
  mensaje: string;
  egreso?: number;
}
