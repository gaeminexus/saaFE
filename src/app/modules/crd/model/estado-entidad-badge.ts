/**
 * Color del badge de estado de Entidad, resuelto por el NOMBRE del estado.
 *
 * Antes el color salía de `colores[idEstado % colores.length]`, es decir del
 * valor numérico del código. Al migrar los códigos del catálogo, todos los
 * índices se corrieron y la tabla se recoloreó sola: ACTIVO pasó de índigo a
 * rojo sin que nada fallara. Resolviendo por nombre, el color queda estable
 * ante cualquier renumeración futura del catálogo.
 *
 * Las clases devueltas están definidas en el SCSS de cada pantalla que lo usa
 * (entidad-consulta y participe-dash).
 */
export function claseBadgeEstadoEntidad(nombreEstado: string | null | undefined): string {
  const nombre = (nombreEstado || '').toLowerCase();
  if (!nombre) return 'estado-desconocido';

  // El orden importa: 'activo' está contenido en 'inactivo' y en 'activo en
  // mora'; 'cesante' en 'cesante desafiliado' y 'cesante fallecido'. Lo más
  // específico va primero.

  if (nombre.includes('aprobado')) return 'estado-activo'; // Verde
  if (nombre.includes('rechazado')) return 'estado-inactivo'; // Rojo

  // ACTIVO EN MORA es un estado nuevo: activo pero sin descuento de aportes.
  if (nombre.includes('mora')) return 'estado-mora'; // Rojo ladrillo

  if (nombre.includes('inactivo')) return 'estado-suspendido'; // Naranja

  // DESAFILIACION (café) y CESANTE DESAFILIADO (rosa) son estados distintos.
  if (nombre.includes('desafiliacion')) return 'estado-desafiliado'; // Café
  if (nombre.includes('desafiliad')) return 'estado-aportar'; // Rosa

  // Igual que arriba: FALLECIDA (negro) y CESANTE FALLECIDO (naranja).
  if (nombre.includes('fallecida')) return 'estado-fallecido'; // Negro
  if (nombre.includes('fallecid')) return 'estado-suspendido'; // Naranja

  if (nombre.includes('jubilado')) return 'estado-jubilado'; // Morado
  if (nombre.includes('cesado')) return 'estado-cesado'; // Gris azulado
  if (nombre.includes('cesante')) return 'estado-pendiente'; // Amarillo
  if (nombre.includes('nuevo')) return 'estado-revision'; // Azul
  if (nombre.includes('activo')) return 'estado-pension'; // Índigo
  if (nombre.includes('pendiente')) return 'estado-pendiente'; // Amarillo
  if (nombre.includes('proceso')) return 'estado-revision'; // Azul
  if (nombre.includes('disponible')) return 'estado-disponible'; // Cyan
  if (nombre.includes('pension')) return 'estado-pension'; // Índigo
  if (nombre.includes('aportar')) return 'estado-aportar'; // Rosa

  return 'estado-otro'; // Gris
}
