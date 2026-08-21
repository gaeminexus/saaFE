import { CausalTerminacion } from './causal-terminacion';
import { ContratoEmpleado } from './contrato-empleado';
import { Empleado } from './empleado';

/**
 * Aviso al IESS. Tabla `RHH.NVIS`.
 *
 * Cubre entradas, salidas, modificaciones de sueldo y novedades de fondos de reserva. El plazo
 * legal de cada tipo lo calcula el backend y lo deja en `fechaLimite`: el frontend no conoce los
 * plazos, solo compara esa fecha con la de reporte para señalar lo que está por vencer.
 */
export interface NovedadIess {
  codigo: number; // NVISCDGO
  empleado: Empleado | { codigo: number } | null; // MPLDCDGO
  contrato: ContratoEmpleado | { codigo: number } | null; // CNTECDGO
  tipoNovedad: number; // NVISTPNV - rubro 204
  fechaHecho: Date; // NVISFCHC - fecha del hecho que se reporta
  fechaLimite: Date | null; // NVISFCLM - vencimiento legal, calculado por el backend
  fechaReporte: Date | null; // NVISFCRP - fecha en que efectivamente se reportó
  sueldoAnterior: number | null; // NVISSLAN
  sueldoNuevo: number | null; // NVISSLNW
  modalidadFondosReserva: number | null; // NVISMDFR - rubro 190
  causalTerminacion: CausalTerminacion | { codigo: number } | null; // NVISCSTR
  observacion: string | null; // NVISOBSR
  estado: number; // NVISESTD - rubro 205
  fechaRegistro?: Date; // NVISFCHR
  usuarioRegistro?: string; // NVISUSRR

  // ─── Columnas de `sql/41`, publicadas el 2026-08-21 ────────────────────────
  //
  // Las exige el archivo de carga masiva del IESS, cada una en su tipo de novedad
  // (`NORMATIVA-IESS-NOVEDADES.md` §5.2). Están todas declaradas aunque la pantalla de hoy solo
  // lea `respuestaIess`: el contrato con el backend se refleja entero o se refleja mal, y quien
  // construya el alta manual necesita verlas aquí y no en la DDL.

  /** `NVISDIAS` — días declarados. Aviso de entrada y cambio de jornada (tiempo parcial). */
  diasDeclarados?: number | null;
  /** `NVISSLRF` — sueldo referencial. Aviso de entrada a tiempo parcial. */
  sueldoReferencial?: number | null;
  /** `NVISVLVR` — importe de la variación. Novedad de variación por extras. */
  valorVariacion?: number | null;
  /** `NVISCAIS` — causa del IESS, **un solo dígito**. Salida y variación. */
  causaIess?: string | null;
  /** `NVISFCFL` — fecha de fallecimiento, cuando la salida es por esa causa. */
  fechaFallecimiento?: Date | null;
  /** `NVISFCFN` — fecha de fin. Licencias sin remuneración. */
  fechaFin?: Date | null;
  /** `NVISPRDS` / `NVISPRHS` / `NVISMSLB` — período y meses laborados de la novedad de FR. */
  periodoDesde?: Date | null;
  periodoHasta?: Date | null;
  mesesLaborados?: number | null;
  /**
   * `NVISRSPT` — lo que el IESS contestó, y el motivo cuando devuelve una novedad.
   *
   * Va aquí y **no en `observacion`**: `observacion` es la nota de quien registra la novedad, y
   * mezclar las dos hace que meses después nadie sepa si una línea la escribió el usuario o el
   * organismo. Es lo que corrige el apaño de la marca `[IESS]`.
   */
  respuestaIess?: string | null;
  /** `NVISLOTE` — número de comprobante o lote del envío, para la trazabilidad. */
  lote?: string | null;
}
