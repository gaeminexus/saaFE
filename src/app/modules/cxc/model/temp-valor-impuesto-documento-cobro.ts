import { TempDocumentoCobro } from "./temp-documento-cobro";

export interface TempValorImpuestoDocumentoCobro {
    codigo: number;                              // Código de la entidad
    tempDocumentoCobro: TempDocumentoCobro;      // Documento de cobro al que pertenecen los valores
    nombre: string;                              // Nombre del impuesto aplicado
    porcentaje: number;                          // Porcentaje aplicado como impuesto
    codigoAlternoValor: number;                  // Código alterno del valor del documento sobre el que se aplicó el impuesto. Tomado de la entidad ResumenValoresDocumento (ValoresXDocumento)
    valorBase: number;                           // Valor base sobre el que se aplicó el impuesto
    valor: number;                               // Valor del impuesto
}
