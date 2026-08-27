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

/** Documento que un cobro afecta, tal como lo devuelve GET /aplc/listar. */
export interface DocumentoAfectadoListado {
  tipo: 'FACTURA' | 'LIQUIDACION_COMPRA';
  id: number;
  numero: string;
}

/**
 * Forma de pago de GET /aplc/listar. OJO: NO es el mismo catálogo que
 * `FormaPagoAplicacion` de CXP (`catalogos-aplicacion-pago.ts`) — ahí el
 * código 4 es Débito automático; aquí, según el contrato de
 * AplicacionPagoCxcRest, es Tarjeta. No reutilizar esas etiquetas.
 */
export const FORMA_PAGO_COBRO_LABELS: Record<number, string> = {
  1: 'Efectivo',
  2: 'Transferencia',
  3: 'Cheque',
  4: 'Tarjeta',
};

/** Una fila de GET /aplc/listar: un cobro registrado, con su documento y estado. */
export interface CobroListado {
  id: number;
  fecha: string;
  titular: { codigo: number; nombre: string };
  documentoAfectado: DocumentoAfectadoListado;
  tipoDocPago: string;
  /** Nula en datos ya registrados sin forma de pago capturada (verificado contra datos reales: 6 de 7 filas hoy). */
  formaPago: number | null;
  valor: number;
  asiento: { id: number; numeroAlterno: string } | null;
  /** Ver EstadoAplicacion: 1 Activo, 2 Reversado. */
  estado: number;
}

/** Query params de GET /aplc/listar. Todos opcionales salvo idEmpresa. */
export interface FiltrosListarCobros {
  idEmpresa: number;
  idTitular?: number;
  desde?: string;
  hasta?: string;
  formaPago?: number;
  estado?: number;
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
