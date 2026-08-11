import {
  DocumentoRelacionado,
  FilaAbono,
  SaldoFactura,
} from '../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';

/**
 * APLC - Aplicación de Pago CXC. Una fila del historial de abonos de una
 * factura de venta. Mismo shape que su equivalente de CXP salvo que la
 * factura viaja en `factura` (y existe `liquidacion`, hoy sin pantalla propia).
 */
export interface AplicacionPagoCxc extends FilaAbono {
  factura?: DocumentoRelacionado | null;
  liquidacion?: DocumentoRelacionado | null;
}

/** Body de POST /aplc/anticipo. */
export interface CruceAnticipoCxcRequest {
  idFactura: number;
  valor: number;
  fechaAplicacion?: string;
  idEmpresa: number;
  idUsuario: number;
  observacion?: string;
}

/**
 * Body de POST /aplc/cobroTransferencia. A diferencia de CXP, esta acción
 * contabiliza y genera el movimiento bancario en el momento de la llamada.
 */
export interface CobroTransferenciaRequest {
  idFactura: number;
  valor: number;
  fechaCobro?: string;
  /** Obligatorio, no puede ir vacío. */
  numeroTransferencia: string;
  idCuentaBancaria: number;
  idEmpresa: number;
  idUsuario: number;
  observacion?: string;
}

/** Respuesta de POST /aplc/anticipo y POST /aplc/cobroTransferencia. */
export interface ResultadoAplicacionCxc extends SaldoFactura {
  exito: boolean;
  mensaje: string;
  aplicacion?: number;
  asiento?: string;
  /** Solo en el cruce de anticipo: saldo que le queda al cliente. */
  saldoAnticipos?: number;
}
