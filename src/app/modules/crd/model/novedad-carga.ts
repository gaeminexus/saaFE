import { ParticipeXCargaArchivo } from "./participe-x-carga-archivo";

/**
 * Representa una novedad de carga del catálogo (Rubro 169)
 */
export interface NovedadCarga {
  codigo: number;                    // Código de la novedad (0-8)
  descripcion: string;               // "Partícipe no encontrado", etc.
  tipo: 'PARTICIPE' | 'DESCUENTO';   // Categoría de la novedad
  severidad: 'success' | 'warning' | 'error';
  icono: string;                     // Material icon name
  colorChip: string;                 // Color del badge (primary, accent, warn)
}

/**
 * Agrupación de registros por tipo de novedad
 */
export interface NovedadAgrupada {
  novedad: NovedadCarga;
  registros: ParticipeXCargaArchivo[];
  total: number;
}

/**
 * Partícipe similar encontrado para resolver Novedad 1
 */
export interface ParticipeSimilar {
  participe: any;                    // Tu interfaz de Partícipe existente
  similitud: number;                 // Porcentaje de similitud (0-100)
  coincidencias: string[];           // ["Nombre similar", "Código cercano"]
}
