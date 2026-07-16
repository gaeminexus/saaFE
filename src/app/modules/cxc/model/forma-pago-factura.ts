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

  // Campos opcionales para financiación flexible
  numeroCuota?: number;             // Orden de cuota dentro del plan
  porcentaje?: number;              // Porcentaje de la factura asignado a esta cuota
  fechaPago?: string | Date;        // Fecha exacta de pago cuando aplica fechas fijas
  tipoProgramacion?: 'PERIODICIDAD' | 'FECHAS_FIJAS';
  periodicidad?: 'SEMANAL' | 'QUINCENAL' | 'MENSUAL' | 'PERSONALIZADA';
  intervaloDias?: number;           // Para periodicidad personalizada
  esFinanciacion?: boolean;         // Marca de pago financiado
}
