import { Entidad } from "./entidad";

// Tabla CRD.CNYG - Cónyuge del partícipe
export interface Conyuge {
    codigo: number;       // CNYGCDGO - PK
    entidad: Entidad;     // ENTDCDGO - FK Entidad padre
    nombres: string;      // CNYGNMBR - Nombres completos
    cedula: string;       // CNYGCDLA - Número de cédula
    correo: string;       // CNYGCRREO - Correo electrónico
    estado: number;       // CNYGIDST - 1=activo, 0=inactivo
}
