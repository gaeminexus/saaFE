/** Fila del padrón de partícipes elegibles, generado por GET /rest/entd/padron-participes */
export interface PadronParticipeDTO {
  numero: number;
  entidadId: number;
  cedula: string;
  nombresApellidos: string;
  /** Correos del partícipe, separados por "; " cuando hay más de uno */
  correo: string;
  calidadParticipeId: number;
  calidadParticipe: string;
  numeroAportes: number;
  estadoMora: string;
  mesesEnMora: number | null;
  habilitadoVoto: string;
  elegibleMiembro: string;
}

/** Filtros opcionales para GET /rest/entd/padron-participes */
export interface PadronParticipeFiltros {
  /** Formato yyyy-MM-dd. Por defecto: fecha actual (en el backend) */
  fechaEjecucion?: string;
  /** ENTDIDST — calidad del partícipe (ESPRCDGO) */
  calidadId?: number;
  /** Mínimo de aportes requeridos para elegibilidad. Por defecto 90 (en el backend) */
  minimoAportes?: number;
}
