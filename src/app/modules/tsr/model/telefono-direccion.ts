import { DireccionTitular } from "./direccion-titular";

export interface TelefonoDireccion {
    codigo: number;                   // Identificador único del teléfono
    DireccionTitular: DireccionTitular; // Dirección a la que pertenece el teléfono
    rubroTipoTelefonoP: number;       // Rubro 31 - Tipo de teléfono (principal)
    rubroTipoTelefonoH: number;       // Detalle de Rubro 31 - Tipo de teléfono
    telefono: string;                 // Número de teléfono
    principal: number;                // Indica si es el teléfono principal (1 = Sí)
    nombreContacto: string;           // Nombre del contacto asignado
    rubroPrefijoTelefonoP: number;    // Rubro 39/40 - Prefijo telefónico (principal)
    rubroPrefijoTelefonoH: number;    // Detalle de Rubro 39/40 - Prefijo telefónico
}
