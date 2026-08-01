// Interfaz para la tabla HDAP (HistoricoDesgloseAporteParticipe)
// Nota: el backend relaciona este registro por `cedula` (numeroIdentificacion de Entidad) + `idCarga`,
// NO por entidad.codigo como el resto de entidades de crd — ver com.saa.model.crd.HistoricoDesgloseAporteParticipe.
export interface HistoricoDesgloseAporteParticipe {
    orden: number;                  // HDAPORDE - Código (PK)
    codigoInterno: string;          // HDAPCODI - Código interno del partícipe en Petrocomercial
    cedula: string;                 // HDAPCEDU - Número de cédula del partícipe
    aporteJubilacion: number;       // HDAPJUBI - Valor de aporte mensual para Jubilación
    aporteCesantia: number;         // HDAPCESA - Valor de aporte mensual para Cesantía
    totalBeneficios: number;        // HDAPTOBE - Sumatoria total de beneficios (aportes)
    prestamoEmergente: number;      // HDAPEMER
    prestamoQuirografario: number;  // HDAPQUIR
    prestamoHipotecario: number;    // HDAPHIPO
    prestamoPrendario: number;      // HDAPPREN
    totalPrestamos: number;         // HDAPTOPR
    prestamoVehicular: number;      // HDAPVEHI
    seguroIncendios: number;        // HDAPINCE
    tonsupa: number;                // HDAPTONS
    descuentoTotal: number;         // HDAPDSCT
    idCarga: number;                // HDAPIDCA - ID de carga (lote de Petrocomercial)
    fechaCarga: Date;               // HDAPFCTR
    usuarioCarga: string;           // HDAPUSAR
    estado: number;                 // HDAPESTD - 1: Cargado, 2: Procesado
}
