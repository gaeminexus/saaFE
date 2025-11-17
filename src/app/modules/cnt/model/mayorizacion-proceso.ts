export interface MayorizacionProceso {
  empresa: number;
  periodoDesde: number;
  periodoHasta: number;
  proceso: number; // 1: Mayorización normal, 2: Mayorización de cierre
}

export interface ProcesoResponse {
  success: boolean;
  mensaje: string;
  codigo?: number;
}

export enum TipoProceso {
  MAYORIZACION = 1,
  MAYORIZACION_CIERRE = 2
}
