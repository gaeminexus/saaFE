import { Empleado } from './empleado';

export interface SolicitudVacaciones {
  codigo: number;
  empleado: Empleado;
  fechaDesde: Date;
  fechaHasta: Date;
  diasSolicitados: number;
  estado: string;
  usuarioAprobacion: string | null;
  observacion: string | null;
  fechaAprobacion: Date;
  fechaRegistro: Date;
  usuarioRegistro: string;
}

/**
 * Body de `POST /slct/aprobar/{id}` (`SolicitudVacacionesRest.java`, saaBE). Valida días
 * disponibles, consume el saldo FIFO (RHH.SLDV/DVAC) y genera la novedad de "Vacaciones pagadas"
 * del período de la fecha de inicio — el `PUT` plano de `update()` no hace nada de esto, sólo
 * cambia el campo `estado` (defecto reportado 2026-09-08: seis solicitudes de agosto quedaron
 * APROBADAS sin consumir saldo ni generar novedad).
 */
export interface AprobarSolicitudVacacionesRequest {
  idUsuario: number;
  observacion?: string;
}

/** Body de `POST /slct/rechazar/{id}`. No toca saldo ni novedad. */
export interface RechazarSolicitudVacacionesRequest {
  idUsuario: number;
  motivo?: string;
}

/**
 * Body de `POST /slct/anularAprobacion/{id}`. Acepta tanto una solicitud APROBADA (devuelve el
 * saldo a los años exactos de donde salió y retira la novedad — rechaza si esa novedad ya entró
 * en un rol pagado) como una SOLICITADA (pasa directo a ANULADA, sin saldo ni novedad que
 * revertir) — confirmado con el backend 2026-09-08. Es el único camino para anular una solicitud;
 * ya no hace falta el `update()` plano para ningún caso.
 */
export interface AnularAprobacionSolicitudVacacionesRequest {
  idUsuario: number;
  motivo?: string;
}
