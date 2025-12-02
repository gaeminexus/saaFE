import { TempFinanciacionXDocumentoCobro } from "./temp-financiacion-x-documento-cobro";

export interface TempCuotaXFinanciacionCobro {
    codigo: number;                                                   // Código de la entidad
    tempFinanciacionXDocumentoCobro: TempFinanciacionXDocumentoCobro; // Financiación a la que pertenece la cuota inicial
    fechaIngreso: string;                                             // Fecha de generación o ingreso de la cuota (Timestamp)
    fechaVencimiento: string;                                         // Fecha de vencimiento de la cuota
    tipo: number;                                                     // Tipo de cobro. 1 = cuota, 2 = letra, 3 = cuota inicial
    valor: number;                                                    // Valor a cobrar por la cuota
    numeroSecuencial: number;                                         // Número secuencial de cuota dentro del total de la financiación
    numeroCuotaLetra: number;                                         // Número de cuota o letra. El número de letra es un secuencial dentro de toda la empresa
    numeroTotalCuotas: number;                                        // Número total de cuotas en las que fue financiado el documento
    totalAbono: number;                                               // Total abonado a la cuota
    saldo: number;                                                    // Saldo de la cuota
}
