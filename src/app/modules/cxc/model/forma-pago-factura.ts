import { FacturaEmitir } from './factura-emitir';

/**
 * FORMA_PAGO_FACTURA - Detalle de formas de pago para factura
 * Tabla: CBR.FORMA_PAGO_FACTURA
 * Relación 1:N con Factura (una factura puede tener múltiples formas de pago)
 */
export interface FormaPagoFactura {
  id?: number;                      // ID único del registro
  factura?: FacturaEmitir;          // FK a Factura (relación inversa)
  formaPago: string;                // Código de forma de pago según tabla SRI 24
  valor: number;                    // Valor del pago
  plazo: number;                    // Plazo en días/meses/años
  unidadTiempo: string;             // Unidad de tiempo: 'dias', 'meses', 'años'
  estado?: number;                  // Estado del registro
}
