/** Nombres de mes, en el orden de `PRDNMSEE`/`NVNMESTD` — 1 es enero, nunca 0. */
export const NOMBRES_MES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/** `nombreMes(2)` → `'Febrero'`. Cadena vacía si `mes` no es 1–12. */
export function nombreMes(mes: number | null | undefined): string {
  const indice = Number(mes) - 1;
  return NOMBRES_MES[indice] ?? '';
}
