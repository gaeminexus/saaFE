import { ResultadoSimulacionCreditoNuevo } from './simuladores/simulador-credito-nuevo';

/**
 * Evaluación del otorgamiento (capacidad de pago ≤ 50 % de la remuneración y cupo ≤ 100 % de la cuenta
 * individual). Es el DTO directo de `GET/POST prst/evaluarOtorgamiento` del backend
 * (docs/logica-negocio/crd/DISENO-SOLICITUD-V1-AUTORIZACION-Y-REGLAS-OTORGAMIENTO.md §B1).
 * `capacidadOk` / `cupoOk` en `null` significan «no evaluable» (p. ej. sin remuneración).
 */
export interface EvaluacionOtorgamiento {
  idEntidad: number | null;
  idPrestamo: number | null;
  idPrestamoOriginal: number | null;
  monto: number | null;
  aplicaReglas: boolean;
  motivoNoAplica: string | null;
  remuneracion: number | null;
  capacidadPago: number | null;
  cuotasVigentes: number | null;
  cuotaNueva: number | null;
  capacidadOk: boolean | null;
  saldoCuentaIndividual: number | null;
  saldoCapitalVigentes: number | null;
  cupoOk: boolean | null;
  mensajes: string[] | null;
}

/** Respuesta de `POST prst/generarTablaAmortizacion/...?conEvaluacion=true`. */
export interface TablaGeneradaConEvaluacion<TPrestamo> {
  prestamo: TPrestamo;
  evaluacion: EvaluacionOtorgamiento | null;
}

/** Cuerpo de `POST prst/evaluarOtorgamiento` (simulador). */
export interface SolicitudEvaluacionOtorgamiento {
  idEntidad: number;
  monto: number;
  cuotaNueva: number;
  idPrestamoOriginal: number | null;
}

/** Respuesta de `POST prst/simularNovacion` (dentro del sobre `{exito, etapa, mensaje, resultado}`). */
export interface ResultadoSimulacionNovacion {
  original: {
    idPrestamo: number;
    idAsoprep: number | null;
    producto: string;
    cuotaActual: number | null;
    vs: number;
    desgloseVs: { capital: number; interes: number; mora: number; seguros: number };
  };
  /** Misma forma que el resultado de `simularCreditoNuevo`. */
  simulacion: ResultadoSimulacionCreditoNuevo;
  valorLiquido: number;
  evaluacion: EvaluacionOtorgamiento | null;
}

/**
 * Total de la cuota 1 de una tabla simulada (la que se descuenta por rol): es la `cuotaNueva` que pide
 * `POST prst/evaluarOtorgamiento`. Si la tabla no trae la cuota 1 rotulada, cae a la primera cuota
 * regular y, en último caso, a `valorCuota`.
 */
export function cuotaTotalPrimera(simulacion: ResultadoSimulacionCreditoNuevo | null | undefined): number {
  const tabla = simulacion?.tablaProyectada ?? [];
  const c = tabla.find((x) => x.numeroCuota === 1) ?? tabla.find((x) => x.numeroCuota > 0);
  if (!c) return simulacion?.valorCuota ?? 0;
  return Math.round(((c.total ?? c.cuota) + Number.EPSILON) * 100) / 100;
}
