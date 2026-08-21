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

/** Una línea del cruce: de qué anticipo sale el dinero y cuánto. */
export interface LineaCruceAnticipo {
  idAnticipo: number;
  valor: number;
}

/**
 * Body de POST /aplc/anticipos: cruce contra anticipos específicos. Cada línea
 * genera su propia aplicación con su propio asiento, que es lo que permite
 * deshacer exactamente esos abonos si el anticipo se anula.
 */
export interface CruceAnticiposCxcRequest {
  idFactura: number;
  anticipos: LineaCruceAnticipo[];
  fechaAplicacion?: string;
  idEmpresa: number;
  idUsuario: number;
  observacion?: string;
}

/** Detalle que devuelve el backend por cada anticipo cruzado. */
export interface LineaResultadoCruce {
  aplicacion: number;
  idAnticipo: number;
  numeroDocAnticipo?: string;
  montoAplicado: number;
  saldoAnticipo: number;
  asiento?: string;
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
  /** Una línea por anticipo consumido; presente en el cruce multi-anticipo. */
  lineas?: LineaResultadoCruce[];
  /** Suma de todas las líneas del cruce. */
  totalCruzado?: number;
}
