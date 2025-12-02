import { TempDocumentoCobro } from "./temp-documento-cobro";

export interface TempResumenValorDocumentoCobro {
    codigo: number;                              // Código de la entidad
    tempDocumentoCobro: TempDocumentoCobro;      // Documento de cobro al que pertenecen los valores
    codigoAlternoTipoValor: number;              // Código alterno del tipo de valor aplicado. Tomado de la entidad ValoresXDocumento (pgs.vxdc)
    valor: number;                               // Valor del impuesto
}
