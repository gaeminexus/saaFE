import { TempDocumentoPago } from "./temp_documento_pago";

export interface TempValorImpuestoDocumentoPago{
    codigo: number;
    tempDocumentoPago: TempDocumentoPago;
    nombre: String;
    porcentaje: number;
    codigoAlternoValor: number;
    valorBase: number;
    valor: number;
    
}