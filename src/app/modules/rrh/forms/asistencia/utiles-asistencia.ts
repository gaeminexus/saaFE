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
