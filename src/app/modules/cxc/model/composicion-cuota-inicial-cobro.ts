import { FinanciacionXDocumentoCobro } from "./financiacion-x-documento-cobro";
import { ResumenValorDocumentoCobro } from "./resumen-valor-documento-cobro";


export interface ComposicionCuotaInicialCobro {
    codigo: number;                                           // Código de la entidad
    resumenValorDocumentoCobro: ResumenValorDocumentoCobro;  // Resumen de valores de documento de cobro que se incluye en la cuota inicial
    valor: number;                                            // Valor que se incluirá en la cuota inicial
    valorResumen: number;                                     // Valor total del resumen de valores por documento
    financiacionXDocumentoCobro: FinanciacionXDocumentoCobro; // Financiación a la que pertenece la cuota inicial
}
