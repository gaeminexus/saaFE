/**
 * `RHH.PRNM.PRNMMDVC` — cómo se acreditan los días de vacaciones del año. No es un rubro: es una
 * columna `NUMBER` con `CHECK IN (1, 2)` y `DEFAULT 1` (`docs/rrh/
 * API-VACACIONES-MODALIDAD-ACREDITACION.md` §3), espejo de `com.saa.rubros.RhhModalidadVacaciones`
 * en el backend. Un `null` se trata como 1 (un año sin el parámetro cargado sigue como siempre).
 */
export enum ModalidadVacaciones {
  POR_ANIVERSARIO = 1,
  DEVENGO_MENSUAL = 2,
}

export const OPCIONES_MODALIDAD_VACACIONES: { value: number; label: string }[] = [
  { value: ModalidadVacaciones.POR_ANIVERSARIO, label: 'Por aniversario (15 días al cumplir el año)' },
  { value: ModalidadVacaciones.DEVENGO_MENSUAL, label: 'Devengo mensual (1,25 días por mes)' },
];

/** Texto de ayuda de la pantalla «Acreditar vacaciones» (contrato §6). `null` si no hay dato: no se inventa un valor. */
export function ayudaModalidadVacaciones(modalidad: number | null): string | null {
  if (modalidad === ModalidadVacaciones.DEVENGO_MENSUAL) {
    return 'Devengo mensual: córralo al cierre de cada mes con el último día del mes como fecha de corte.';
  }
  if (modalidad === ModalidadVacaciones.POR_ANIVERSARIO) {
    return 'Por aniversario: acredita los días completos a quien ya cumplió su año de servicio.';
  }
  return null;
}
