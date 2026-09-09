/**
 * Respuesta de `POST /rtv2/reenviarSRI/{idRetencion}` (docs/cxc/API-REENVIAR-RETENCION-AL-SRI.md).
 *
 * `200` NO significa autorizado: la respuesta HTTP solo confirma que se pudo reenviar y el SRI
 * contestó. Hay que mirar `exito`/`estado`, nunca el código HTTP — el mismo 200 cubre tanto un
 * reenvío autorizado (`estado: 5`) como uno rechazado (`estado: 4` o `6`, `exito: false`).
 */
export interface ReenviarSriRetencionV2Response {
  exito: boolean;
  estado: number;
  mensaje: string;
  autorizacion?: string;
  clave: string;
}
