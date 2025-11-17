
import { CierreCaja } from "./cierre-caja";
import { CajaLogica } from "./caja-logica";
import { Persona } from "./persona";
import { Empresa } from "../../../shared/model/empresa";
import { UsuarioPorCaja } from "./usuario-por-caja";


export interface TempCobro {
    codigo: number;                    // Identificador único del cobro temporal
    tipoId: number;                    // Tipo de identificación (1 = Cédula, 2 = RUC)
    numeroId: string;                  // Número de identificación del cliente
    cliente: string;                   // Nombre del cliente que realiza el cobro
    descripcion: string;               // Descripción del cobro
    fecha: Date;                       // Fecha en que se realiza el cobro
    nombreUsuario: string;             // Usuario que realiza el cobro
    valor: number;                     // Valor total del cobro
    empresa: Empresa;                  // Empresa en la que se realiza el cobro
    usuarioPorCaja: UsuarioPorCaja;    // Usuario por caja que realiza el cobro
    cierreCaja: CierreCaja;            // Cierre de caja asociado al cobro
    fechaInactivo: Date;               // Fecha en que se inactiva el cobro
    rubroMotivoAnulacionP: number;     // Rubro 29 - Motivo de anulación (principal)
    rubroMotivoAnulacionH: number;     // Detalle de Rubro 29 - Motivo de anulación
    rubroEstadoP: number;              // Rubro 28 - Estado del cobro (principal)
    rubroEstadoH: number;              // Detalle de Rubro 28 - Estado del cobro
    cajaLogica: CajaLogica;            // Caja lógica donde se realiza el cobro
    persona: Persona;                  // Persona a la que se realiza el cobro
    tipoCobro: number;                 // Tipo de cobro (1 = Factura, 2 = Anticipo)
}
