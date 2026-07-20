import { NegociacionProveedor } from './negociacion-proveedor';

// Cuota / Forma de Pago de Negociación — endpoint: /fpng — tabla: PGS.FPNG
export interface FormaPagoNegociacion {
  id: number;
  negociacion: Partial<NegociacionProveedor>;
  numeroCuota: number;
  descripcion: string;
  fechaPago: any;           // Java LocalDate → array o string
  porcentaje: number;
  valorCuota: number;
  estado: number;           // 1=Pendiente, 2=Pago parcial, 3=Pagado total, 0=Anulado
  orden: number;
}
