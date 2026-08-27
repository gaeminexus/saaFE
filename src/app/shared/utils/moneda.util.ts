/**
 * Formato de dinero único del proyecto: símbolo `$`, 2 decimales, separador de miles
 * (`$1,234.56`). Antes se repetía byte por byte como método privado `formatMoneda` en
 * varios componentes (devolución de aportes, contrato-edit, los dos simuladores) — única
 * implementación acá para no seguir repartiendo el mismo formateo por archivo.
 *
 * Solo para lo que es DINERO. Plazos, número de cuota, porcentajes de tasa y días no pasan
 * por acá — llevan su propio sufijo (`%`, "cuotas", etc.) o van sin formatear.
 */
export function formatearMoneda(valor: number | null | undefined): string {
  return '$' + (valor ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
