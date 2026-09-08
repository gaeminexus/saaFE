import { Empleado } from './empleado';
import { PeriodoNomina } from './periodo-nomina';

/**
 * RHH.VNPG — Valor No Pagado: un anticipo al revés. Se retiene un valor X del neto de un
 * empleado en un período (no se le paga ese mes) y se le devuelve completo en el pago del
 * siguiente. Contrato: `saaBE/docs/logica-negocio/rhh/PLAN-VALORES-NO-PAGADOS.md`.
 *
 * **El backend se está escribiendo en paralelo (2026-09-08): estos tipos siguen el contrato del
 * plan (§4/§10), no código real todavía.** Si al integrar el JSON real no coincide, se corrige
 * primero el documento y después este archivo — no al revés.
 */

/** `VNPGESTD`, rubro nuevo `RHH_ESTADO_VALOR_NO_PAGADO` (plan §5). */
export enum EstadoValorNoPagado {
  REGISTRADO = 1,
  RETENIDO = 2,
  PAGADO = 3,
  ANULADO = 4,
  FINIQUITADO = 5,
}

export const ESTADO_VALOR_NO_PAGADO_LABELS: Record<number, string> = {
  1: 'Registrado',
  2: 'Retenido',
  3: 'Pagado',
  4: 'Anulado',
  5: 'Finiquitado',
};

/** Clase CSS por estado — mismo criterio que `claseEstado()` de `estados-nomina.ts` (D19/D24). */
export function claseEstadoValorNoPagado(estado: number | null | undefined): string {
  switch (Number(estado)) {
    case EstadoValorNoPagado.REGISTRADO:
      return 'estado-registrado';
    case EstadoValorNoPagado.RETENIDO:
      return 'estado-retenido';
    case EstadoValorNoPagado.PAGADO:
      return 'estado-pagado';
    case EstadoValorNoPagado.ANULADO:
      return 'estado-anulado';
    case EstadoValorNoPagado.FINIQUITADO:
      return 'estado-finiquitado';
    default:
      return 'estado-desconocido';
  }
}

/** Referencia liviana a una orden de pago (RHH.RDPG) o a un finiquito, sólo para trazabilidad. */
export interface ReferenciaTrazabilidad {
  codigo: number;
  numero?: string | null;
}

/**
 * Fila de `GET /vnpg/listar` (plan §10). Es una **proyección**, no la entidad `RHH.VNPG` cruda de
 * `getAll`/`selectByCriteria`: trae el empleado y el período ya resueltos, no sólo sus códigos.
 *
 * Toda la trazabilidad (`periodoRecuperacion`, `ordenRetencion`, `ordenPago`, `liquidacion`) es
 * nulable a propósito: un registro recién creado (`REGISTRADO`) no tiene ninguna todavía (plan §9).
 */
export interface ValorNoPagadoListado {
  codigo: number;
  empleado: Empleado;
  /** Período en que NO se paga (`VNPGPRNM`). */
  periodo: PeriodoNomina;
  valor: number;
  motivo: string;
  estado: number;
  /** Período en que se recuperó, P+1 (`VNPGPRRC`). Se llena al pagar. */
  periodoRecuperacion: PeriodoNomina | null;
  /** Orden de pago que lo retuvo (`VNPGORRT`), de P. */
  ordenRetencion: ReferenciaTrazabilidad | null;
  /** Orden de pago que lo devolvió (`VNPGORPG`), de P+1. */
  ordenPago: ReferenciaTrazabilidad | null;
  /** Finiquito que lo absorbió (`VNPGLQDC`), si el empleado salió antes de cobrarlo. */
  liquidacion: ReferenciaTrazabilidad | null;
  /** `LocalDateTime` del backend: normalizar con `FuncionesDatosService.convertirFechaDesdeBackend()`. */
  fechaRegistro: unknown;
  usuarioRegistro: string;
  motivoAnulacion: string | null;
  fechaAnulacion: unknown | null;
  usuarioAnulacion: string | null;
}

/**
 * Query params de `GET /vnpg/listar` (plan §10). Sólo `idEmpresa` es obligatorio. `estado` es
 * repetible — filtrar por más de un estado a la vez (p.ej. REGISTRADO + RETENIDO).
 */
export interface FiltrosListarValoresNoPagados {
  idEmpresa: number;
  idPeriodo?: number;
  idEmpleado?: number;
  estado?: number[];
}

/** Body para registrar un valor no pagado (`POST /vnpg`, plan §8: empleado activo, período ABIERTO, valor > 0, motivo obligatorio). */
export interface RegistrarValorNoPagadoRequest {
  idEmpresa: number;
  idEmpleado: number;
  idPeriodo: number;
  valor: number;
  motivo: string;
  idUsuario: number;
}

/** Body de `POST /vnpg/anular/{id}` (plan §10). Sólo válido desde `REGISTRADO` (plan §8). */
export interface AnularValorNoPagadoRequest {
  motivo: string;
  idUsuario: number;
}
