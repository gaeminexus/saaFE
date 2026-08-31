import { DetallePrestamo } from './detalle-prestamo';
import { NovedadParticipeCarga } from './novedad-participe-carga';
import { Prestamo } from './prestamo';

/**
 * Fila del excedente de una carga Petro aplicada a un préstamo (`prestamo`+`detallePrestamo`
 * llenos, `tipoAporte` null) o a un aporte de jubilación/cesantía del socio (`tipoAporte` lleno,
 * `prestamo`+`detallePrestamo` null) — nunca los dos ni ninguno: la base lo exige con el CHECK
 * `CK_AVPC_PRST_XOR_TPAP` (docs/crd/API-EXCEDENTE-PETRO-A-APORTES.md §2.2). El signo de
 * `valorAfectar` siempre es positivo; el backend interpreta el sentido.
 */
export interface AfectacionValoresParticipeCarga {
  codigo?: number;
  novedadParticipeCarga: NovedadParticipeCarga;
  prestamo?: Prestamo | null;
  detallePrestamo?: DetallePrestamo | null;
  /** Solo cuando el excedente va a un aporte. Al escribir basta `{ codigo }`. */
  tipoAporte?: { codigo: number; nombre?: string } | null;
  valorCuotaOriginal?: number | null;
  capitalCuotaOriginal?: number | null;
  interesCuotaOriginal?: number | null;
  desgravamenCuotaOriginal?: number | null;
  valorAfectar?: number | null;
  capitalAfectar?: number | null;
  interesAfectar?: number | null;
  desgravamenAfectar?: number | null;
  diferenciaTotal?: number | null;
  diferenciaCapital?: number | null;
  diferenciaInteres?: number | null;
  diferenciaDesgravamen?: number | null;
  fechaAfectacion?: Date | string | null;
  usuarioRegistro?: string | null;
  fechaCreacionRegistro?: Date | string | null;
  observaciones?: string | null;
  estado?: number | null;
}

// ══════════════ GET /avpc/opcionesAporte/{idNovedad} ══════════════

/** Un tipo de aporte vigente al que se puede mandar el excedente, con su saldo actual. */
export interface OpcionAporteExcedente {
  idTipoAporte: number;
  nombreTipoAporte: string;
  saldoActual: number;
}

/**
 * `opciones: []` NO es un error: el partícipe no tiene ningún tipo vigente en el mes de la carga
 * de esta novedad. `mes`/`anio` son los de esa carga, NO los de hoy — úsalos en el mensaje cuando
 * la lista viene vacía ("no hay tipos de aporte vigentes para julio 2026").
 */
export interface RespuestaOpcionesAporte {
  idEntidad: number;
  mes: number;
  anio: number;
  opciones: OpcionAporteExcedente[];
}

// ══════════════ POST /avpc/batch ══════════════

/** Aviso de reparto incompleto de una novedad — `AfectacionValoresParticipeCargaService.diferenciaReparto`. */
export interface AdvertenciaRepartoAfectacion {
  idNovedad: number;
  /** > 0 = falta repartir; < 0 = se repartió de más. */
  diferencia: number;
  mensaje: string;
}

/**
 * El backend NO rechaza el lote si el reparto queda incompleto — cada fila ya se persistió en su
 * propia transacción, rechazar no desharía nada. Por eso esto es un AVISO, no un error: si
 * `advertenciasReparto` trae algo, hay que mostrarlo, pero `totalCreados`/`afectaciones` ya están
 * guardados igual.
 */
export interface ResultadoBatchAfectacion {
  totalCreados: number;
  afectaciones: AfectacionValoresParticipeCarga[];
  advertenciasReparto: AdvertenciaRepartoAfectacion[];
}
