export interface Pais {
    codigo: number;         // PSSSCDGO - Código
    codigoAlterno: string;  // PSSSCDAL - Código Alterno (INEC)
    nombre: string;         // PSSSNMBR - Nombre del país
    nacionalidad: string;  // PSSSNCNL - Nacionalidad
    codigoNacionalidad: string; // PSSSCDNC - Código de nacionalidad
    codigoExterno: string; // PSSSCDEX - Código externo
    idEstado: number;       // PSSSIDST - ID Estado
}
