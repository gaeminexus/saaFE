import { FormaPagoNegociacion } from './forma-pago-negociacion';
import { FacturaCompra } from './factura-compra';
import { Usuario } from '../../../shared/model/usuario';

// Pago Realizado sobre Cuota — endpoint: /pgng — tabla: PGS.PGNG
export interface PagoNegociacion {
  id: number;
  formaPago: Partial<FormaPagoNegociacion>;
  fechaPago: any;           // Java LocalDate → array o string
  valorPago: number;
  descripcion: string;
  tipoPago: 'ANTICIPO' | 'FACTURA' | string;
  facturaCompra: Partial<FacturaCompra> | null;
  facturado: number;        // 1=Con factura, 0=Sin factura
  pagado: number;           // 1=Liquidado, 0=Pendiente
  refComprobante: string;
  estado: number;           // 1=Activo, 0=Anulado
  usuario: Partial<Usuario>;
  fechaRegistro: any;
}
