import { Empresa } from "../../../shared/model/empresa";
import { Asiento } from "../../cnt/model/asiento";
import { Periodo } from "../../cnt/model/periodo";
import { Persona } from "../../tsr/model/persona";
import { DetalleDocumentoCobro } from "./detalle-documento-cobro";
import { FinanciacionXDocumentoCobro } from "./financiacion-x-documento-cobro";
import { ResumenValorDocumentoCobro } from "./resumen-valor-documento-cobro";
import { ValorImpuestoDocumentoCobro } from "./Valor-impuesto-documento-cobro";


export interface DocumentoCobro {
    codigo: number;                                                  // Código de la entidad
    empresa: Empresa;                                                // Empresa donde se genera el documento de cobro
    persona: Persona;                                                // Persona o proveedor de la que se recibe el documento
    fechaDocumento: string;                                          // Fecha del documento
    razonSocial: string;                                             // Razón social del proveedor o persona que entrega el documento
    ruc: string;                                                     // RUC del proveedor o persona que entrega el documento
    direccion: string;                                               // Dirección del proveedor o persona que entrega el documento
    diasVencimiento: number;                                         // Número de días de vencimiento del documento. Tomados desde la fecha del documento
    fechaVencimiento: string;                                        // Fecha de vencimiento del documento
    numeroSerie: string;                                             // Número de serie del documento
    numeroDocumentoString: string;                                   // Número de documento. Contiene el número de documento tal como se imprime en el físico
    perido: Periodo;                                                 // Periodo al que pertenece el documento
    mes: number;                                                     // Número de mes en el que se encuentra el documento
    anio: number;                                                    // Número de año en el que se encuentra el documento
    numeroAutorizacion: number;                                      // Número de autorización del documento
    fechaAutorizacion: string;                                       // Fecha de autorización del documento
    numeroResolucion: string;                                        // Número de resolución del documento
    total: number;                                                   // Valor total del documento
    abono: number;                                                   // Valor total abonado al documento
    saldo: number;                                                   // Valor total del saldo del documento
    asiento: Asiento;                                                // Asiento relacionado con el documento
    idFisico: number;                                                // ID del físico utilizado en el documento. Es solo una referencia de la entidad Documento por bloque
    tipoFormaCobro: number;                                          // Tipo de forma de cobro. 1 = Débito bancario, 2 = Tarjeta de crédito, 3 = Otros
    numeroDocumentoNumber: number;                                   // Número de documento. Contiene el valor numérico del número de documento
    rubroEstadoP: number;                                            // Rubro para estado de documento de cobro. Tomado del rubro 78
    rubroEstadoH: number;                                            // Detalle de Rubro para estado de documento de cobro. Tomado del rubro 78
    detalleDocumentoCobro: DetalleDocumentoCobro;                 // Listado de detalle de documentos de cobro que tiene el documento
    valorImpuestoDocumentoCobro: ValorImpuestoDocumentoCobro;     // Listado de los valores de impuesto que se aplicaron al documento
    resumenValorDocumentoCobro: ResumenValorDocumentoCobro;       // Listado del resumen de valores del documento
    financiacionXDocumentoCobro: FinanciacionXDocumentoCobro;     // Listado de financiaciones relacionadas con el documento
}
