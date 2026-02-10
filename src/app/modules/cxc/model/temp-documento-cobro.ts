import { Empresa } from '../../../shared/model/empresa';
import { Asiento } from '../../cnt/model/asiento';
import { Periodo } from '../../cnt/model/periodo';
import { Titular } from '../../tsr/model/titular';

export interface TempDocumentoCobro {
  codigo: number; // Código de la entidad
  empresa: Empresa; // Empresa donde se genera el documento de cobro
  persona: Titular; // Persona o proveedor de la que se recibe el documento
  fechaDocumento: string; // Fecha del documento
  razonSocial: string; // Razón social del proveedor o persona que entrega el documento
  ruc: string; // RUC del proveedor o persona que entrega el documento
  direccion: string; // Dirección del proveedor o persona que entrega el documento
  diasVencimiento: number; // Número de días de vencimiento del documento
  fechaVencimiento: string; // Fecha de vencimiento del documento
  numeroSerie: string; // Número de serie del documento
  numeroDocumentoString: string; // Número de documento (string tal como aparece impreso)
  periodo: Periodo; // Periodo al que pertenece el documento
  mes: number; // Número de mes en el que se encuentra el documento
  anio: number; // Número de año en el que se encuentra el documento
  numeroAutorizacion: number; // Número de autorización del documento
  fechaAutorizacion: string; // Fecha de autorización del documento
  numeroResolucion: string; // Número de resolución del documento
  total: number; // Valor total del documento
  abono: number; // Valor total abonado al documento
  saldo: number; // Valor total del saldo del documento
  asiento: Asiento; // Asiento relacionado con el documento
  idFisico: number; // ID del físico utilizado en el documento
  tipoFormaCobro: number; // Tipo de forma de cobro
  numeroDocumentoNumber: number; // Número de documento en formato numérico
  rubroEstadoP: number; // Rubro para estado del documento (rubro 78)
  rubroEstadoH: number; // Detalle de rubro para estado del documento
}
