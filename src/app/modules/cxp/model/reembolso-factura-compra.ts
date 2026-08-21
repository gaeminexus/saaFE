import { FacturaCompra } from './factura-compra';

/**
 * Detalle de reembolsos de gastos de una factura de compra (tabla PGS.RMBF).
 * Un registro por documento sustento (<reembolsoDetalle> del XML SRI, ANEXO 5).
 */
export interface ReembolsoFacturaCompra {
  id: number;
  factura: FacturaCompra;              // en altas enviar stub {id} as any
  tipoIdentificacionProveedor: string; // tabla 6 SRI: 04=RUC 05=Cédula 06=Pasaporte 08=Id exterior
  identificacionProveedor: string;
  codPaisPago: string;                 // tabla 25 SRI, '593'=Ecuador
  tipoProveedor: string;               // tabla 26 SRI: 01=Persona natural 02=Sociedad
  codDoc: string;                      // tabla 3 SRI: 01=Factura 03=Liquidación...
  establecimiento: string;             // 3 dígitos
  puntoEmision: string;                // 3 dígitos
  secuencial: string;                  // hasta 9 dígitos
  fechaEmision: string;                // 'YYYY-MM-DD' (LocalDate del backend; puede llegar array)
  numeroAutorizacion: string;          // 10-49 dígitos
  baseImponibleCero: number;           // base tarifa 0 / no objeto / exento
  baseImponibleGravada: number;
  tarifaIva: number | null;            // 15 / 12 / 8 / 5
  valorIva: number;
  valorIce: number;
  total: number;                       // bases + impuestos
  producto: number | null;             // id de ProductoPago (contabilización por grupo)
  origen: number;                      // 1=XML 2=MANUAL
  estado: number;                      // 1=Activo 0=Anulado
  observacion?: string;
}

/** Respuesta de POST /carga-documentos/recalcularTotalesReembolso/{id} */
export interface CuadraturaReembolso {
  idFacturaCompra: number;
  cantidadReembolsos: number;
  totalComprobantesReembolso: number;
  totalBaseImponibleReembolso: number;
  totalImpuestoReembolso: number;
  importeTotalFactura: number;
  diferencia: number;
  cuadra: boolean;
}
