// Interfaz para la tabla TipoHidrocarburifica (TPHD)
export interface TipoHidrocarburifica {
    codigo: number;      // TPHDCDGO - Código
    codigoEntidad: number; // ENTDCDGO - FK Código Entidad (opcional)
    codigoExterno: number; // TPHDCDEX - Código Externo (opcional)
    idEstado: number;    // TPHDIDST - ID Estado
}
