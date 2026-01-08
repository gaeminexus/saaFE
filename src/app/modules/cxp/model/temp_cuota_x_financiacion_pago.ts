import { TempFinanciacionXDocumentoPago } from "./temp_financiacion_x_documento_pago";

export interface TempCuotaXFinanciacionPago{
    codigo: number;
    tempFinanciacionXDocumentoPago: TempFinanciacionXDocumentoPago;
    fechaIngreso: Date;
    fechaVencimiento: Date;
    tipo: number;
    valor: number;
    numeroSecuencial: number;
    numeroCuotaLetra: number;
    numeroTotalCuotas: number;
    totalAbono: number;
    saldo: number;




}
