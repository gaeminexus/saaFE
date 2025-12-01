import { DocumentoCobro } from "./documento-cobro";

export interface ValorImpuestoDocumentoCobro {
    codigo: number;                              // Código de la entidad
    documentoCobro: DocumentoCobro;              // Documento de cobro al que pertenecen los valores
    nombre: string;                              // Nombre del impuesto aplicado
    porcentaje: number;                          // Porcentaje aplicado como impuesto
    codigoAlternoValor: number;                  // Código alterno del valor del documento sobre el que se aplicó el impuesto. Tomado de la entidad ResumenValoresDocumento referente a la entidad ValoresXDocumento
    valorBase: number;                           // Valor sobre el que se aplicó el impuesto
    valor: number;                               // Valor del impuesto
}
