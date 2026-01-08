import { DetalleDocumentoPago } from "./detalle_documento_pago";

export interface ValorImpuestoDetallePago{
    codigo: number;
    detalleDocumentoPago: DetalleDocumentoPago;
    nombre: String;
    porcentaje: number;
    valorBase: number;
    valor: number;
    
}