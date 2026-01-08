import { TempFinanciacionXDocumentoPago } from './temp_financiacion_x_documento_pago';

export interface TempPagosArbitrariosXFinanciacionPago{
    codigo: number;
    tempFinanciacionXDocumentoPago: TempFinanciacionXDocumentoPago;
    diaPago: number;
    mesPago: number;
    anioPago: number;
    fechaPago: Date;
    valor: number;

}
