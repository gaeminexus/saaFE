import {
  DocumentoRelacionado,
  FilaAbono,
  SaldoFactura,
} from '../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';

/**
 * APLP - Aplicación de Pago CXP. Una fila del historial de abonos de una
 * factura de compra. Las retenciones y NC/ND las crea el backend solo; el
 * frontend solo crea filas de tipo anticipo (cruce) y pago directo.
 */
export interface AplicacionPagoCxp extends FilaAbono {
  facturaCompra?: DocumentoRelacionado | null;
}

/** Body de POST /aplp/anticipo. */
export interface CruceAnticipoCxpRequest {
  idFacturaCompra: number;
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
 * Body de POST /aplp/anticipos: cruce contra anticipos específicos. Cada línea
 * genera su propia aplicación con su propio asiento, que es lo que permite
 * deshacer exactamente esos abonos si el anticipo se anula.
 */
export interface CruceAnticiposCxpRequest {
  idFacturaCompra: number;
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
 * Respuesta de POST /aplp/anticipo. Incluye el saldo actualizado de la
 * factura, así que no hace falta volver a pedir /saldo tras la acción.
 */
export interface ResultadoAplicacionCxp extends SaldoFactura {
  exito: boolean;
  mensaje: string;
  aplicacion?: number;
  asiento?: string;
  /** Saldo de anticipos que le queda al proveedor tras el cruce. */
  saldoAnticipos?: number;
  /** Una línea por anticipo consumido; presente en el cruce multi-anticipo. */
  lineas?: LineaResultadoCruce[];
  /** Suma de todas las líneas del cruce. */
  totalCruzado?: number;
}
