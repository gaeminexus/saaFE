
import { Empresa } from "../../../shared/model/empresa";
import { Usuario } from "../../../shared/model/usuario";
import { Asiento } from "../../cnt/model/asiento";
import { Cheque } from "./cheque";
import { Persona } from "./persona";



export interface TempPago {
    codigo: number;                     // Identificador único del pago temporal
    tipoId: number;                     // Tipo de identificación (1 = Cédula, 2 = RUC)
    numeroId: string;                   // Número de identificación
    proveedor: string;                  // Nombre del proveedor al que se realiza el pago
    descripcion: string;                // Descripción del pago
    fechaPago: Date;                    // Fecha en la que se realiza el pago
    nombreUsuario: string;              // Nombre del usuario que realiza el pago
    valor: number;                      // Valor total del pago
    empresa: Empresa;                   // Empresa en la que se realiza el pago
    fechaInactivo: Date;                // Fecha de desactivación
    rubroMotivoAnulacionP: number;      // Rubro padre (motivo de anulación del pago)
    rubroMotivoAnulacionH: number;      // Rubro hijo (motivo de anulación del pago)
    rubroEstadoP: number;               // Rubro padre (estado del pago)
    rubroEstadoH: number;               // Rubro hijo (estado del pago)
    cheque: Cheque;                     // Cheque con el que se realiza el pago
    persona: Persona;                   // Persona a la que se realiza el pago
    asiento: Asiento;                   // Asiento contable ligado al pago
    numeroAsiento: number;              // Número de asiento asignado al pago
    tipoPago: number;                   // Tipo de pago (1 = Factura, 2 = Anticipo)
    usuario: Usuario;                   // Usuario que realiza el pago
}
