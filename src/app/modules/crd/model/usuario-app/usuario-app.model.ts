/**
 * Credenciales de la app móvil (`CRD.USAP`). Contrato: docs/crd/API-USUARIO-APP-MOVIL.md.
 * Solo los endpoints de intranet (`estado`, `crear`, `resetearClave`, `reactivar`).
 */

/** Estado de la cuenta: 1 Activa, 2 Bloqueada, 3 Eliminada (la borró el partícipe desde la app). */
export type EstadoUsuarioApp = 1 | 2 | 3;

export const TEXTO_ESTADO_USUARIO_APP: Partial<Record<number, string>> = {
  1: 'Activa',
  2: 'Bloqueada',
  3: 'Eliminada',
};

/**
 * `UsuarioAppDTO` ya con las fechas normalizadas. En el cable `bloqueadoHasta`, `fechaCreacion` y
 * `fechaUltimoAcceso` llegan como arreglo Jackson (`[2026,10,21,9,30,0]`); el servicio las convierte
 * con `FuncionesDatosService.convertirFechaDesdeBackend()`. El DTO nunca trae el hash de la clave.
 */
export interface UsuarioAppDTO {
  codigo: number;
  idEntidad: number | null;
  identificacion: string;
  estado: number;
  intentosFallidos: number | null;
  bloqueadoHasta: Date | null;
  debeCambiarClave: boolean;
  fechaCreacion: Date | null;
  fechaUltimoAcceso: Date | null;
  usuarioRegistro: string | null;
}

/** Body de `POST usap/crear`, `usap/resetearClave` y `usap/reactivar`. `usuario` es el de la sesión. */
export interface SolicitudUsuarioApp {
  identificacion: string;
  claveTemporal: string;
  usuario: string;
}
