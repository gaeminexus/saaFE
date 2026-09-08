/**
 * Planilla que emite el portal del IESS por rubro y período: rol normal, préstamos
 * quirografarios, préstamos hipotecarios o fondos de reserva (`RHH.PLIS`, backend
 * `com.saa.model.rhh.PlanillaIess`). Ver `docs/rrh/API-PLANILLA-IESS.md`.
 *
 * **No confundir con `PlanillaControlIess`** (`modules/rrh/model/planilla-control-iess.ts`): esa
 * es el POJO calculado desde nuestras nóminas (`/plie`, sin tabla) contra el que ésta se concilia.
 * Esta es la que emitió el portal, se guarda (`/plis`) y se paga.
 */
export interface PlanillaIess {
  codigo: number;
  empresa?: { codigo: number } | null;
  periodo?: { codigo: number } | null;
  /** Rubro 330 (`RhhTipoPlanillaIess`): 1 rol normal · 2 quirografarios · 3 hipotecarios · 4 fondos de reserva. */
  tipo: number;
  /** El que emite el portal. Único por empresa + tipo. */
  numeroComprobante: string;
  fechaEmision: any; // LocalDate del backend: normalizar con FuncionesDatosService.
  fechaMaximaPago: any;
  /** Total que cobra el IESS según el comprobante del portal. */
  valorIess: number;
  /**
   * Nuestro total al conciliar — snapshot, no se recalcula. `null` si el tipo de planilla no
   * tiene control calculado hoy (solo el tipo 1, rol normal, lo tiene: ver §5.2 del contrato).
   */
  valorControl?: number | null;
  /** `valorIess − valorControl`. `null` si `valorControl` es `null`: no hay diferencia sin control. */
  diferencia?: number | null;
  /** Ver `EstadoPlanillaIess`: 1 Registrada · 2 Conciliada · 3 Pagada · 4 Anulada. */
  estado: number;
  /** Fecha real del débito del IESS. Se llena al pagar. */
  fechaPago?: any;
  asiento?: { codigo: number } | null;
  observacion?: string | null;
  motivoAnulacion?: string | null;
  fechaRegistro?: any;
  usuario?: number | null;
  /** Renglones del comprobante — sólo vienen poblados desde `getId`/`porPeriodo`, no en `getAll`. */
  renglones?: DetallePlanillaIess[];
}

/** Un renglón del comprobante (`RHH.DLIS`). */
export interface DetallePlanillaIess {
  codigo?: number;
  /** Texto del renglón tal como lo trae el comprobante del portal. */
  concepto: string;
  /**
   * Concepto normalizado (rubro 331, `RhhConceptoPlanillaIess`): 1 aporte personal · 2 aporte
   * patronal · 3 contribución CCC · 4 seguro tiempo parcial · 5 otro. `null` = sin clasificar.
   * Decide contra qué total de la planilla de control se compara este renglón al conciliar — la
   * correspondencia NUNCA se resuelve por el texto de `concepto` (ver §3.4 del contrato).
   */
  conceptoTipo?: number | null;
  valorIess: number;
  /** `null` si el concepto no tiene contraparte calculada: no se inventa un cero. */
  valorControl?: number | null;
  /** `null` si `valorControl` es `null`. */
  diferencia?: number | null;
}

/** Cuerpo de `POST /plis/registrar`. */
export interface RegistrarPlanillaIessRequest {
  idEmpresa: number;
  idPeriodo: number;
  tipo: number;
  numeroComprobante: string;
  /** yyyy-MM-dd. */
  fechaEmision: string;
  fechaMaximaPago: string;
  valorIess: number;
  observacion?: string | null;
  renglones: { concepto: string; conceptoTipo: number | null; valorIess: number }[];
  idUsuario: number;
}

/** Respuesta de `POST /plis/conciliar/{id}`. */
export interface ConciliarPlanillaIessResponse {
  idPlanilla: number;
  tipo: number;
  valorIess: number;
  valorControl: number | null;
  diferencia: number | null;
  hayDiferencia: boolean;
  renglones: {
    concepto: string;
    conceptoTipo?: number | null;
    valorIess: number;
    valorControl: number | null;
    diferencia: number | null;
  }[];
  mensaje: string;
}

/** Cuerpo de `POST /plis/pagar/{id}`. */
export interface PagarPlanillaIessRequest {
  idCuentaBancaria: number;
  /** yyyy-MM-dd; fecha real del débito, no la de hoy por defecto. */
  fechaPago: string;
  idUsuario: number;
}

/** Respuesta de `POST /plis/pagar/{id}`. */
export interface PagarPlanillaIessResponse {
  idPlanilla: number;
  estado: number;
  idPago: number;
  idAsiento?: number | null;
  numeroAsiento?: string | number | null;
  mensaje: string;
}

/** Estado de `RHH.PLIS.PLISESTD` — no es un rubro catalogado, es un flag simple. */
export enum EstadoPlanillaIess {
  REGISTRADA = 1,
  CONCILIADA = 2,
  PAGADA = 3,
  ANULADA = 4,
}

/** Rubro 330 (`RhhTipoPlanillaIess`), espejado como enum por comodidad de comparación en TS. */
export enum TipoPlanillaIess {
  ROL_NORMAL = 1,
  PRESTAMOS_QUIROGRAFARIOS = 2,
  PRESTAMOS_HIPOTECARIOS = 3,
  FONDOS_DE_RESERVA = 4,
}

/** Rubro 331 (`RhhConceptoPlanillaIess`), espejado como enum por comodidad de comparación en TS. */
export enum ConceptoPlanillaIess {
  APORTE_PERSONAL = 1,
  APORTE_PATRONAL = 2,
  CONTRIBUCION_CCC = 3,
  SEGURO_SALUD_TIEMPO_PARCIAL = 4,
  OTRO = 5,
}
