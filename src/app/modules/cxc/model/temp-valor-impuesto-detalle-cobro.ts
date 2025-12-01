import { TempDetalleDocumentoCobro } from "./temp-detalle-documento-cobro";

export interface TempValorImpuestoDetalleCobro {
    codigo: number;                              // Código de la entidad
    tempDetalleDocumentoCobro: TempDetalleDocumentoCobro; // Detalle de documento de cobro al que pertenecen los valores
    nombre: string;                              // Nombre del impuesto aplicado
    porcentaje: number;                          // Porcentaje aplicado como impuesto
    valorBase: number;                           // Valor sobre el que se aplicó el impuesto
    valor: number;                               // Valor del impuesto
}
