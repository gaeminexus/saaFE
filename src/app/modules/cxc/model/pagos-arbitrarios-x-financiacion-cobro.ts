import { FinanciacionXDocumentoCobro } from "./financiacion-x-documento-cobro";

export interface PagosArbitrariosXFinanciacionCobro {
    codigo: number;                                           // Código de la entidad
    financiacionXDocumentoCobro: FinanciacionXDocumentoCobro; // Financiación a la que pertenece la cuota inicial
    diaCobro: number;                                         // Número de día del mes en que se debe pagar
    mesCobro: number;                                         // Número de mes en que se debe pagar
    anioCobro: number;                                        // Número de año en que se debe pagar
    fechaCobro: string;                                       // Fecha en la que se debe realizar el pago
    valor: number;                                            // Valor del pago
}
