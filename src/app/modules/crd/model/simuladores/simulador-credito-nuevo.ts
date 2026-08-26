import { CuotaProyectada } from '../pagos/operaciones-pago';

/**
 * Contrato de `POST /rest/prst/simularCreditoNuevo` (§7 de
 * `docs/crd/PLAN-SIMULADORES-PRESTAMOS.md`).
 *
 * Simulación pura: no persiste nada y no necesita que el préstamo exista (§4.1 y §4.8 del plan).
 * `tipoAmortizacion` es un literal, no un catálogo del backend (§2.2 del plan): 1 = Francesa,
 * 2 = Alemana.
 */
export interface ParametrosAmortizacion {
  monto: number;
  /** Porcentaje anual, p. ej. `12.5` para 12.5%. */
  tasaAnual: number;
  /** Plazo en meses. */
  plazo: number;
  /** 1 = Francesa · 2 = Alemana. */
  tipoAmortizacion: number;
  /**
   * ⚠️ `ParametrosAmortizacion.fechaInicio` es `java.time.LocalDateTime` en el backend
   * (`ejb/crd/service/dto/ParametrosAmortizacion.java:19`, verificado — espeja `Prestamo.
   * fechaInicio`/`PRSTFCIN`, de cuya hora el motor deriva los vencimientos), **no**
   * `LocalDate`. Viaja como ISO local sin zona: `"yyyy-MM-ddTHH:mm:ss"` (p. ej.
   * `"2026-08-25T00:00:00"`), **nunca** `"yyyy-MM-dd"` a secas — eso deserializa con
   * `InvalidFormatException` (`Cannot deserialize value of type java.time.LocalDateTime`).
   * Y nunca un `Date` de JavaScript ni nada terminado en `Z`: Jackson descarta el offset en vez
   * de convertirlo, así que un `Date` de las 08:30 en Ecuador se grabaría como 13:30, cinco
   * horas adelantado y sin ningún error. El tipo lo decide el Java, no la convención de la
   * pantalla — ver CLAUDE.md §Serialización.
   */
  fechaInicio: string | null;
  tieneCuotaCero: boolean;
  desgravamenPorCuota: number;
  seguroIncendioPorCuota: number;
}

/** Reutiliza `CuotaProyectada` (de `simularAbonoCapital`) más los totales de la simulación. */
export interface ResultadoSimulacionCreditoNuevo {
  tablaProyectada: CuotaProyectada[];
  totalCapital: number;
  totalInteres: number;
  totalDesgravamen: number;
  totalSeguro: number;
  totalAPagar: number;
  /** Valor de la cuota regular (no necesariamente igual a la cuota 0, si el crédito la tiene). */
  valorCuota: number;
}
