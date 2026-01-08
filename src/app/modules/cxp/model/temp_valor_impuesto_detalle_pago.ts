import { TempDetalleDocumentoPago } from "./temp_detalle_documento_pago";

export interface TempValorImpuestoDetallePago{
    codigo: number;
    tempDetalleDocumentoPago: TempDetalleDocumentoPago;
    nombre: String;
    porcentaje: number;
    valorBase: number;
    valor: number;
    
}