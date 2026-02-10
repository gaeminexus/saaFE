import { Empresa } from '../../../shared/model/empresa';
import { Usuario } from '../../../shared/model/usuario';
import { Asiento } from '../../cnt/model/asiento';
import { Cheque } from './cheque';
import { Titular } from './titular';

/**
 * Representa un pago realizado por una empresa.
 * Equivalente a la entidad TSR.PGSS en Java.
 * Contiene la información de los pagos registrados en tesorería.
 */
export interface Pago {
  codigo: number; // Identificador único del pago
  tipoId: number; // Tipo de identificación (1 = Cédula, 2 = RUC)
  numeroId: string; // Número de identificación
  proveedor: string; // Nombre del proveedor al que se realiza el pago
  descripcion: string; // Descripción del pago
  fechaPago: string; // Fecha en la que se realiza el pago (ISO 8601)
  nombreUsuario: string; // Nombre del usuario que realiza el pago
  valor: number; // Valor total del pago
  empresa: Empresa; // Empresa a la que pertenece el pago
  fechaInactivo: string; // Fecha de desactivación del pago (si aplica)
  rubroMotivoAnulacionP: number; // Rubro principal (motivo de anulación del pago)
  rubroMotivoAnulacionH: number; // Rubro detalle (motivo de anulación del pago)
  rubroEstadoP: number; // Rubro principal (estado del pago)
  rubroEstadoH: number; // Rubro detalle (estado del pago)
  cheque: Cheque; // Cheque con el que se realiza el pago
  persona: Titular; // Persona a la que se realiza el pago
  asiento: Asiento; // Asiento contable ligado al pago
  numeroAsiento: number; // Número de asiento asignado al pago
  tipoPago: number; // Tipo de pago (1 = Factura, 2 = Anticipo)
  usuario: Usuario; // Usuario que realiza el pago
  idTempPago: number; // Id del registro temporal del pago
}
