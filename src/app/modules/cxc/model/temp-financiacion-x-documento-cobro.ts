import { TempDocumentoCobro } from "./temp-documento-cobro";
import { TempCuotaXFinanciacionCobro } from "./temp-cuota-x-financiacion-cobro";

export interface TempFinanciacionXDocumentoCobro {
    codigo: number;                      // Código de la entidad
    tempDocumentoCobro: TempDocumentoCobro; // Documento de cobro al que pertenecen los valores
    tipoFinanciacion: number;            // Tipo de financiación. 1 = contado, 2 = crédito
    aplicaInteres: number;               // Campo que indica si es que aplica interés. 1 = si aplica interés, 0 = no aplica interés
    porcentajeInteres: number;           // Porcentaje de interés en caso de que aplique interés
    factorInteres: number;               // Factor de interés
    aplicaCuotaInicial: number;          // Campo que indica si es que aplica cuota inicial
    valorPorcentaCI: number;             // Valor de porcentaje de la cuota inicial
    valorFijoCI: number;                 // Valor numérico de la cuota inicial
    tipoCuotaInicial: number;            // Tipo de cuota inicial
    valorInicialCI: number;              // Valor de la cuota inicial sobre la base
    valorTotalCI: number;                // Valor total de la cuota inicial
    numeroCobros: number;                // Número de cobros a financiarse
    tipoCobros: number;                  // Tipo de cobros
    rubroPeriodicidadP: number;          // Rubro para periodicidad de cobro
    rubroPeriodicidadH: number;          // Detalle de Rubro para periodicidad de cobro
    tipoPeriodicidadCobro: number;       // Tipo de distribución de periodicidad de cobro
    dependeOtraFinanciacion: number;     // Campo que indica que esta financiación depende de otra financiación
    numeroDocumentoDepende: string;      // Número de documento del que depende
    idDepende: number;                   // ID del documento del que depende
    tempCuotaXFinanciacionCobros: TempCuotaXFinanciacionCobro[]; // Listado que contiene las cuotas de la financiación
}
