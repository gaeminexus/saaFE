/**
 * LSRI - Listados SRI
 * Tabla CBR.LSRI
 * Definición de tipos de listados SRI (retenciones, impuestos, etc)
 */
export interface ListadoSri {
  id: number;           // ID único del listado
  tabla: string;        // Nombre de la tabla relacionada (max 100)
  detalle: string;      // Descripción del listado (max 500)
  estado: number;       // Estado: 1 = activo, 2 = inactivo
}
