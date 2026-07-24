import { Entidad } from "./entidad";

// Tabla CRD.RRFF - Referencia Familiar
export interface ReferenciaFamiliar {
    codigo: number;       // RRFFCDGO - PK
    entidad: Entidad;     // ENTDCDGO - FK Entidad padre
    nombres: string;      // RRFFNMBR - Nombres completos
    cedula: string;       // RRFFCDLA - Cédula de identidad
    contacto: string;     // RRFFCNTC - Número de contacto
    parentesco: string;   // RRFFPRNT - Parentesco
    estado: number;       // RRFFIDST - 1=activo, 0=inactivo
}
