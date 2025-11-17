import { Empresa } from "../../../shared/model/empresa";
import { Persona } from "./persona";



export interface PersonaRol {
    codigo: number;                 // Identificador único del registro
    persona: Persona;               // Persona asociada al rol
    rubroRolPersonaP: number;       // Código alterno del rubro (tomado del rubro 55)
    rubroRolPersonaH: number;       // Código alterno del detalle de rubro (rubro 55)
    diasVencimientoFactura: number; // Días de vencimiento de facturas asociados al rol
    calificacionRiesgo: string;     // Calificación de riesgo de la persona en este rol
    estado: number;                 // Estado del rol: 1 = Activo, 2 = Inactivo
    empresa: Empresa;               // Empresa a la que pertenece el rol
}
