import { TempDocumentoPago } from "./temp_documento_pago";

export interface TempResumenValorDocumentoPago{
    codigo: number;
    tempDocumentoPago: TempDocumentoPago;
    codigoAlternoTipoValor: number;
    valor: number;


}