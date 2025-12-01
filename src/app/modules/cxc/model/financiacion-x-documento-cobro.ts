import { DocumentoCobro } from "./documento-cobro";

export interface FinanciacionXDocumentoCobro {
    codigo: number;                      // Código de la entidad
    documentoCobro: DocumentoCobro;      // Documento de cobro al que pertenecen los valores
    tipoFinanciacion: number;            // Tipo de financiación. 1 = contado, 2 = crédito
    aplicaInteres: number;               // Campo que indica si es que aplica interés. 1 = si aplica interés, 0 = no aplica interés
    porcentajeInteres: number;           // Porcentaje de interés en caso de que aplique interés
    factorInteres: number;               // Factor de interés. Es el número decimal por el que se multiplica para el cálculo de interés
    aplicaCuotaInicial: number;          // Campo que indica si es que aplica cuota inicial. 1 = si aplica cuota inicial, 0 = no aplica cuota inicial
    valorPorcentaCI: number;             // Valor de porcentaje de la cuota inicial. Es el porcentaje que se aplica al subtotal
    valorFijoCI: number;                 // Valor numérico de la cuota inicial. En caso de que se desee aplicar un valor específico al que luego se le podrá sumar los impuestos en caso de que la cuota inicial sea acumulada
    tipoCuotaInicial: number;            // Tipo de cuota inicial. 1 = acumulada (cuando es la unión de un valor más los impuestos seleccionados), 2 = fijo (cuando se aplica un valor fijo a la cuota inicial)
    valorInicialCI: number;              // Valor de la cuota inicial sobre la base. Es el cálculo de la base por el porcentaje de cuota inicial o Es el valor numérico fijo que se encuentra en el campo fxdpvnmc
    valorTotalCI: number;                // Valor total de la cuota inicial. Incluye el valor de la cuota sobre la base y los valores de impuestos seleccionados en caso de que sea de tipo acumulada
    numeroCobros: number;                // Número de cobros a financiarse. Sin tomar en cuenta la cuota inicial
    tipoCobros: number;                  // Tipo de cobros. 1 = cuota, 2 = letras, 3 = mixto
    rubroPeriodicidadP: number;          // Rubro para periodicidad de cobro. Tomado del rubro 79
    rubroPeriodicidadH: number;          // Detalle de Rubro para periodicidad de cobro. Tomado del rubro 79
    tipoPeriodicidadCobro: number;       // Tipo de distribución de periodicidad de cobro. 1 = periódico fijo (La periodicidad se la tomaría del rubro 79), 2 = Arbitrario = cobros que tienen una periodicidad fija sino arbitraria
    dependeOtraFinanciacion: number;     // Campo que indica que esta financiación depende de la financiación de otro documento
    numeroDocumentoDepende: string;      // Número de documento del que depende. Tomado del campo numeroDocumentoString de la entidad DocumentoCobro
    idDepende: number;                   // ID del documento del que depende
}
