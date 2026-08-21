import { RolPago } from '../../../model/rolPago';

/**
 * Estado real del rol de pago.
 *
 * **`RLPGESTD` no manda.** Se quedó como `String` y no se le creó rubro, por decisión tomada:
 * el estado lo llevan `RLPGFCEN` (fecha de envío) y `RLPGRCBD` (recibido), y de esos dos se
 * deriva. Leer `rol.estado` daría un texto libre que nadie mantiene.
 *
 * La secuencia es generado → enviado → recibido, y no retrocede: un rol recibido lo está aunque
 * su fecha de envío falte, porque la constancia del colaborador pesa más que la trazabilidad
 * del envío.
 */
export type EstadoRol = 'generado' | 'enviado' | 'recibido';

export function estadoRol(rol: RolPago): EstadoRol {
  if (rol.recibido === 'S') return 'recibido';
  if (rol.fechaEnvio) return 'enviado';
  return 'generado';
}

const ETIQUETAS: Record<EstadoRol, string> = {
  generado: 'Generado',
  enviado: 'Enviado',
  recibido: 'Recibido',
};

export function etiquetaEstadoRol(rol: RolPago): string {
  return ETIQUETAS[estadoRol(rol)];
}

/** Solo tiene sentido registrar la recepción de un rol que aún no la tiene. */
export function admiteRecepcion(rol: RolPago): boolean {
  return estadoRol(rol) !== 'recibido';
}
