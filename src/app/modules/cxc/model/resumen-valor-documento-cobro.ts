import { DocumentoCobro } from "./documento-cobro";

export interface ResumenValorDocumentoCobro {
    codigo: number;                      // Código de la entidad
    documentoCobro: DocumentoCobro;      // Documento de cobro al que pertenecen los valores
    codigoAlternoTipoValor: number;      // Código alterno del tipo de valor aplicado. Tomado de la entidad ValoresXDocumento (pgs.vxdc)
    valor: number;                       // Valor del impuesto
}
