import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';

/**
 * Compuerta de los campos de asistencia ampliados por la fase 7.
 *
 * **Abierta el 2026-08-19**, con la publicación de la fase 7 y verificada contra las clases
 * desplegadas: `Marcaciones` ya mapea `MRCCPRCS`, `CRMRCDGO`, `MRCCDSPS` y `MRCCLNAR`, y
 * `ResumenNomina` mapea las once columnas del script 05 —`RSMNHRTR`, `RSMNHRSP`, `RSMNHREX`,
 * `RSMNHRNC`, `RSMNSLAN`, `RSMNTPAS`, `RSMNENTT`, `RSMNSLDT`, `RSMNINCN`, `RSMNPRCS` y
 * `RSMNJSTC`— con exactamente los nombres de propiedad ratificados en el contrato.
 *
 * Se conserva la bandera en vez de borrarla porque documenta qué depende de esa ampliación y
 * permite volver a cerrarla si un despliegue retrocede: lo que gobierna es la columna
 * "Consolidada" de marcaciones, los seis campos del diálogo de corrección del resumen y la marca
 * de día ya consumido.
 */
export const CAMPOS_ASISTENCIA_PERSISTEN: boolean = true;

/**
 * Descripción de un código alterno de rubro.
 *
 * `MRCC.tipo`, `MRCC.origen` y `RSMN.fuente` son `NUMBER` desde el delta 11 y el backend los
 * mapea como `Long` desde la recompilación del 2026-08-19, así que ya no hay que tolerar el
 * texto libre que convivía con el código.
 */
export function descripcionRubro(
  detalleRubroService: DetalleRubroService,
  rubroAlterno: number,
  valor: number | null | undefined,
): string {
  if (valor === null || valor === undefined) return '—';
  return detalleRubroService.getDescripcionByParentAndAlterno(rubroAlterno, valor) || '—';
}

/** Rango por defecto de las pantallas de asistencia: el mes en curso. */
export function rangoPorDefecto(): { desde: string; hasta: string } {
  const hoy = new Date();
  const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  return { desde: aValorDeInput(primero), hasta: aValorDeInput(hoy) };
}

/** Convierte una fecha al formato `yyyy-MM-dd` que exige un `input[type=date]`. */
export function aValorDeInput(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * `LocalDateTime` como ISO local, sin zona — para campos donde la hora importa de verdad
 * (`Marcaciones.fechaHora`, `MRCCFCHH`, sin `@JsonFormat`: Jackson exige el separador `T`).
 *
 * Nunca `.toISOString()`: usa UTC y termina en `Z`, así que Jackson descarta el offset y una
 * marcación de las 08:30 en Ecuador queda grabada a las 13:30 (la trampa del §0 de los contratos
 * de este módulo). Tampoco sirve `TipoFormatoFechaBackend.FECHA_HORA_ISO` de
 * `FuncionesDatosService`: usa el separador correcto pero fija la hora en `00:00:00`, pensado para
 * fechas sin hora real. Esta función arma el mismo formato con la hora que sí trae la fecha.
 */
export function fechaHoraLocalISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  const segundos = String(fecha.getSeconds()).padStart(2, '0');
  return `${anio}-${mes}-${dia}T${horas}:${minutos}:${segundos}`;
}
