/**
 * Interfaz para representar los datos de un pago de cuota
 */
export interface DatosPago {
  tipoPago: 'TRANSFERENCIA' | 'DEPOSITO';
  fecha: Date;
  monto: number;
  codigoCuentaAsoprep: number;

  // Campos de Transferencia (opcional)
  codigoBanco?: number;
  numeroReferencia?: string;

  // Campos de Depósito (opcional)
  numeroPapeleta?: string;
}
