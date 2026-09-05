import { Entidad } from './entidad';
import { Filial } from './filial';

/**
 * Contrato: docs/crd/API-PAGO-PENSION-COMPLEMENTARIA.md.
 *
 * Sobre común de `generarPagosDelMes` y `sincronizarPagos`: `exito`, `mensaje`, y el cuerpo real
 * anidado bajo `resultado` (nunca al nivel superior). En fallo HTTP ≥400 el mismo sobre trae
 * `error` con el código estable (§6).
 */
export interface RespuestaPgpc<T> {
  exito: boolean;
  mensaje?: string;
  error?: string;
  resultado?: T;
}

/**
 * §6/§4ter — cómo participó un jubilado en la corrida (real o previsualizada). Campo EXPLÍCITO: no
 * deducirlo cruzando `tieneCertificado`/`montoADinero`/`montoACruzar` — eso se rompe la primera
 * vez que cambie una regla.
 *
 * - `COMPLETA`: nada quedó retenido — se aplicó todo lo que correspondía (a préstamo, al banco, al
 *   seguro, o a varios). Un jubilado 100% cruzado (sin remanente) es `COMPLETA`, tenga o no
 *   certificado: sin remanente no hay nada que el certificado pudiera haber dejado retenido.
 * - `SOLO_CRUCE`: ⚠️ **léase «Parcial»** (§6, 2026-09-05) — el literal NO cambió, pero desde §4ter
 *   ya no implica que hubo cruce. Significa: quedó remanente de PENSIÓN retenido por falta de
 *   certificado o de cuenta única; se procesó lo que sí se podía (cruce contra préstamo y/o
 *   traspaso del seguro). Es ACCIONABLE (conseguir el certificado libera la pensión retenida) —
 *   tratarlo con el mismo criterio visual que una "Desviación", nunca como bloqueo: sí entra, sí
 *   suma a "Total a préstamos" y/o "Seguro a traspaso interno".
 * - `BLOQUEADO`: no participa en absoluto — sin préstamo, sin certificado Y sin seguro médico
 *   (§4ter). `motivoBloqueo` dice por qué.
 * - `AL_DIA`: sin meses adeudados a este período (retroactivo). No es bloqueo ni error.
 * - `null`: no fue un evento de participación de esta corrida (`YA_EXISTIA`, o casos donde el
 *   backend no distingue `AL_DIA` de forma explícita).
 */
export type Participacion = 'COMPLETA' | 'SOLO_CRUCE' | 'BLOQUEADO' | 'AL_DIA';

/** §1 — un renglón de `detalle` dentro de `ResultadoGeneracionPagos`. */
export interface DetallePagoPension {
  idEntidad: number;
  /**
   * Ausente en la rama `YA_EXISTIA` de una segunda corrida sobre el mismo período (§1 del
   * contrato): esa rama solo trae `idEntidad`, `idPago`, `valorPension`, `valorSeguroSalud` y
   * `estado`. No asumir que siempre viene.
   */
  nombre?: string;
  idPago: number;
  valorPension: number;
  valorSeguroSalud: number;
  valorCruzadoAPrestamo?: number;
  valorOrdenPago?: number;
  generoOrdenPago?: boolean;
  idAsientoDevengo?: number;
  /**
   * `SIN_ANCLA` y `AL_DIA` son finales NORMALES del retroactivo (con préstamo), nunca `ERROR` —
   * el operador necesita distinguir "terminó bien" de "se rompió" (PLAN-PAGO-RETROACTIVO-JUBILADOS.md).
   */
  estado: 'GENERADO' | 'YA_EXISTIA' | 'ERROR' | 'SIN_ANCLA' | 'AL_DIA';
  mensaje?: string | null;
  /** §6. Puede faltar en respuestas de un backend más viejo; no asumir que siempre viene. */
  participacion?: Participacion | null;
  /**
   * §4bis — el seguro médico se muestra APARTE de la pensión: son dos cuentas contables distintas
   * (pensión → `2.3.01.10.03`, seguro → `2.3.90.90.06 SEGURO POR PAGAR JUBILADOS`). ⛔
   * `VPPC.valorPagar` YA INCLUYE el seguro — `valorPensionMensual` es una porción de ese total, no
   * un adicional; sumar pensión + seguro para "recalcular" el total lo duplica. Opcionales: pueden
   * faltar en respuestas de un backend más viejo.
   */
  valorPensionMensual?: number;
  valorSeguroMensual?: number;
  /** Acumulado de todos los meses del retroactivo (pensión y seguro suman exacto: `total = totalPension + totalSeguro`). */
  totalPension?: number;
  totalSeguro?: number;
  /**
   * §4ter — subconjunto de `totalSeguro`: la porción de seguro médico que salió en la orden
   * aparte al proveedor del seguro (nunca al jubilado). ⚠️ Decisión del usuario, 2026-09-05: el
   * seguro médico NUNCA fue plata del jubilado — se descuenta y se traspasa siempre, tenga o no
   * certificado bancario. NO asumir que depende de `tieneCertificado`. El nombre del campo sigue
   * siendo `valorSeguroInterno` a propósito, pendiente del renombre que coordina el backend.
   * Opcional: puede faltar en un backend más viejo (anterior a §4ter).
   */
  valorSeguroInterno?: number;
}

/** §1 — cuerpo de `resultado` de `POST /pgpc/generarPagosDelMes`. */
export interface ResultadoGeneracionPagos {
  anio: number;
  mes: number;
  evaluados: number;
  generados: number;
  yaGenerados: number;
  conError: number;
  totalPagado: number;
  totalCruzadoAPrestamos: number;
  totalOrdenesGeneradas: number;
  /** §4bis. Suma del seguro médico de todos los jubilados de la corrida. Opcional: backend viejo. */
  totalSeguroGeneral?: number;
  /**
   * §4ter. Subconjunto de `totalSeguroGeneral`: el seguro que salió en la orden aparte al
   * proveedor. No depende de `tieneCertificado` (decisión del usuario, 2026-09-05) — nombre
   * pendiente de renombre coordinado con el backend.
   */
  totalSeguroInternoGeneral?: number;
  errores: string[];
  detalle: DetallePagoPension[];
}

/** §2 — cuerpo de `resultado` de `POST /pgpc/sincronizarPagos`. */
export interface ResultadoSincronizacion {
  evaluadas: number;
  marcadasPagadas: number;
  marcadasRechazadas: number;
  huerfanas: number;
  conError: number;
  errores: string[];
}

/**
 * §3/§4 — la entidad JPA cruda de `CRD.PGPC`, tal cual la devuelven `porEntidad` y `porPeriodo`
 * (arreglo pelado, sin sobre `{exito,...}`). NO trae `valorCruzadoAPrestamo`, `valorOrdenPago` ni
 * `generoOrdenPago`: esos campos existen solo en `DetallePagoPension`, el DTO de la corrida.
 */
export interface PagoPensionComplementaria {
  codigo: number;
  entidad: Entidad;
  filial: Filial;
  anio: number;
  mes: number;
  valorPension: number;
  valorSeguro: number;
  valor: number;
  /** `LocalDate` del backend: `[y, m, d]`. Formatear con un helper, nunca mostrar crudo. */
  fecha: number[];
  estado: number;
  idPagoProgramado: number | null;
  idAporte: number | null;
  numeroAsiento: number | null;
  numeroAsientoDevengo: number | null;
  usuarioRegistro: string;
  /** `LocalDateTime` del backend: `[y, m, d, h, mi, s, ns]`. */
  fechaRegistro: number[];
  /** `LocalDate` del backend, o `null`. */
  fechaPago: number[] | null;
  usuarioAnulacion: string | null;
  fechaAnulacion: number[] | null;
  motivoAnulacion: string | null;
}

/** §5 — estados de `PGPC.PGPCESTD`. Constantes planas, no catálogo `Rubro`. */
export const ESTADO_PGPC = {
  REGISTRADA: 1,
  EN_PAGO: 2,
  PAGADA: 3,
  RECHAZADA: 4,
  ANULADA: 5,
} as const;

export const NOMBRE_ESTADO_PGPC: Record<number, string> = {
  1: 'Registrada',
  2: 'En pago',
  3: 'Pagada',
  4: 'Rechazada',
  5: 'Anulada',
};

/**
 * §4bis — un renglón de `detalle` dentro de `ResultadoPrevisualizacionCorrida`. NO escribe nada:
 * es la simulación de lo que haría `generarPagosDelMes` con los mismos parámetros.
 */
export interface DetallePrevisualizacionPago {
  idEntidad: number;
  nombre: string;
  /** Con el retroactivo, un jubilado puede tener varios meses pendientes en una sola corrida. */
  mesesAdeudados: number;
  /** Estimado: `min(pensiones acumuladas, deuda exigible agregada, saldo del aporte 23)` — el
   *  motor real topa por préstamo y mes a mes, así que con 2+ préstamos puede diferir (§4bis). */
  montoACruzar: number;
  montoADinero: number;
  /**
   * §4ter — seguro médico que saldría en la orden aparte al proveedor del seguro (nunca al
   * jubilado). ⚠️ Decisión del usuario, 2026-09-05: el seguro NUNCA fue plata del jubilado — se
   * descuenta y se traspasa siempre, tenga o no certificado bancario. NO asumir que depende de
   * `tieneCertificado`. ⛔ NO suma a `montoADinero` (que sigue siendo, exclusivamente, dinero que
   * sale al banco DEL JUBILADO); SÍ suma a `total`. Nombre pendiente de renombre con el backend.
   */
  montoSeguroInterno: number;
  /** `montoACruzar + montoADinero + montoSeguroInterno` — lo que se descontaría de la cuenta de pensión complementaria. */
  total: number;
  tienePrestamo: boolean;
  tieneCertificado: boolean;
  /** §6. Es el campo autoritativo — no deducir bloqueo/participación de otros campos. */
  participacion: Participacion | null;
  motivoBloqueo: string | null;
  /**
   * §4bis — el seguro médico se muestra APARTE de la pensión: dos cuentas contables distintas
   * (pensión → `2.3.01.10.03`, seguro → `2.3.90.90.06 SEGURO POR PAGAR JUBILADOS`). ⛔
   * `VPPC.valorPagar` YA INCLUYE el seguro — sumar pensión + seguro para "recalcular" el total lo
   * duplica; `valorPensionMensual` es una PORCIÓN de la mensualidad, no un adicional.
   */
  valorPensionMensual: number;
  valorSeguroMensual: number;
  /**
   * Acumulado de todos los meses del retroactivo. Garantizado por el backend:
   * `total === totalPension + totalSeguro` exacto, incluso con el último mes prorrateado (el
   * seguro se calcula por resta, nunca con su propio redondeo independiente — §4bis).
   */
  totalPension: number;
  totalSeguro: number;
}

/** §4bis — cuerpo de `resultado` de `POST /pgpc/previsualizarCorrida`. NO escribe nada. */
export interface ResultadoPrevisualizacionCorrida {
  anio: number;
  mes: number;
  evaluados: number;
  aptos: number;
  bloqueados: number;
  /** Va a cancelar deuda. No sale de la asociación. */
  totalACruzarPrestamos: number;
  /** Va a salir al banco como orden de pago. Esto sí es dinero saliendo. */
  totalADinero: number;
  /**
   * §4ter — suma de `montoSeguroInterno`: total de seguro médico que sale en la orden aparte al
   * proveedor (nunca a los jubilados). Decisión del usuario, 2026-09-05: no depende del
   * certificado bancario — se descuenta y traspasa siempre. Subconjunto de `totalSeguroGeneral`.
   * NO está incluido en `totalADinero` (que es exclusivamente dinero al banco del jubilado).
   */
  totalSeguroInternoGeneral: number;
  /**
   * La suma de los TRES: `totalACruzarPrestamos + totalADinero + totalSeguroInternoGeneral`
   * (§4ter — ya no son solo dos). Es lo que se descuenta de las cuentas de pensión complementaria.
   */
  totalGeneral: number;
  /** Suma del seguro médico (cuenta `2.3.90.90.06`) de todos los jubilados evaluados. */
  totalSeguroGeneral: number;
  detalle: DetallePrevisualizacionPago[];
}
