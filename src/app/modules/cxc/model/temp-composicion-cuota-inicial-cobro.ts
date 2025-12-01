import { TempFinanciacionXDocumentoCobro } from "./temp-financiacion-x-documento-cobro";
import { TempResumenValorDocumentoCobro } from "./temp-resumen-valor-documento-cobro";

export interface TempComposicionCuotaInicialCobro {
    codigo: number;                                                   // Código de la entidad
    tempResumenValorDocumentoCobro: TempResumenValorDocumentoCobro;  // Resumen de valores de documento de cobro que se incluye en la cuota inicial
    valor: number;                                                    // Valor que se incluirá en la cuota inicial. Puede ser el total o una parte del total de uno de los valores del resumen de valores del documento
    valorResumen: number;                                             // Valor total del resumen de valores por documento
    tempFinanciacionXDocumentoCobro: TempFinanciacionXDocumentoCobro; // Financiación a la que pertenece la cuota inicial
}
