/**
 * Fecha en formato ISO (`yyyy-MM-dd`) para columnas de CSV — nunca `dd/mm/yyyy`: ese formato es
 * el que se usa en pantalla, pero es ambiguo para Excel según el locale (en-US lo lee como
 * mm/dd/yyyy y cambia el mes silenciosamente). El ISO 8601 es el único formato de fecha que
 * Excel reconoce igual en cualquier locale sin reinterpretarlo (lote 3, ítem 3.3, regla 2).
 *
 * Recibe un `Date` ya normalizado (p.ej. vía `FuncionesDatosService.convertirFechaDesdeBackend()`)
 * — no re-parsea el valor crudo del backend, eso es responsabilidad del llamador.
 */
export function fechaCsv(fecha: Date | null | undefined): string {
  if (!fecha || Number.isNaN(fecha.getTime())) return '';
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
