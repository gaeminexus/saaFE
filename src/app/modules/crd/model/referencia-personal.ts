import { Entidad } from "./entidad";

// Tabla CRD.RRPP - Referencia Personal
export interface ReferenciaPersonal {
    codigo: number;       // RRPPCDGO - PK
    entidad: Entidad;     // ENTDCDGO - FK Entidad padre
    nombres: string;      // RRPPNMBR - Nombres completos
    cedula: string;       // RRPPCDLA - Cédula de identidad
    contacto: string;     // RRPPCNTC - Número de contacto
    parentesco: string;   // RRPPPRNT - Parentesco
    estado: number;       // RRPPIDST - 1=activo, 0=inactivo
}
