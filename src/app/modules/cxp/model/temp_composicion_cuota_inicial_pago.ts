import { TempFinanciacionXDocumentoPago } from "./temp_financiacion_x_documento_pago";
import { TempResumenValorDocumentoPago } from "./temp_resumen_valor_documento_pago";

export interface TempComposicionCuotaInicialPago{
    codigo: number;
    tempResumenValorDocumentoPago: TempResumenValorDocumentoPago;
    valor: number;
    valorResumen: number;
    tempFinanciacionXDocumentoPago: TempFinanciacionXDocumentoPago;
    
    


}