import { Entidad } from "./entidad";

// Interfaz para la tabla TipoHidrocarburifica (TPHD)
export interface TipoHidrocarburifica {
    codigo: number;      // TPHDCDGO - Código
    entidad: Entidad; // ENTDCDGO - FK Código Entidad (opcional)
    codigoExterno: number; // TPHDCDEX - Código Externo (opcional)
    estado: number;    // TPHDIDST - ID Estado
}
