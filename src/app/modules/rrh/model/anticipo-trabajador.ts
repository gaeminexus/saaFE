import { Empleado } from './empleado';

/**
 * Estado del anticipo (rubro 234). Coincide con `EstadoAnticipoEmpleado.java`
 * en saaBE. PAGADO/APROBADO son transitorios en la práctica: `aprobar()` deja
 * el pago CONFIRMADO en la misma llamada, así que el anticipo pasa por ahí y
 * llega a EN_DESCUENTO antes de que la pantalla vuelva a consultar — no
 * asumir que "aprobar" siempre deja el estado en APROBADO.
 */
export enum EstadoAnticipo {
  SOLICITADO = 1,
  APROBADO = 2,
  PAGADO = 3,
  EN_DESCUENTO = 4,
  CANCELADO = 5,
  ANULADO = 6,
}

export const ESTADO_ANTICIPO_LABELS: Record<number, string> = {
  1: 'Solicitado',
  2: 'Aprobado',
  3: 'Pagado',
  4: 'En descuento',
  5: 'Cancelado',
  6: 'Anulado',
};

/**
 * RHH.ANTE. OJO: la PK del backend es `codigo` (getCodigo()/setCodigo()), no
 * `id` — Jackson serializa la entidad tal cual, sin alias. Todo lo que llame
 * a /ante/aprobar/{codigo} o /ante/anular/{codigo} debe usar este campo.
 */
export interface AnticipoTrabajador {
  codigo: number;
  empleado: Empleado;
  /** LocalDate del backend: puede llegar como array [y,m,d], string ISO o Date ya parseado. */
  fecha: unknown;
  valor: number;
  numeroCuotas: number;
  valorCuota: number;
  /** Saldo pendiente por descontar (RHH.ANTE.ANTESLDD) — no "saldoPendiente" en el JSON. */
  saldo: number;
  fechaInicioDescuento: unknown;
  motivo: string | null;
  observacion: string | null;
  /** Ver EstadoAnticipo. */
  estado: number;
  usuarioAprueba?: number | null;
  fechaAprobacion?: unknown;
  motivoAnulacion?: string | null;
  fechaRegistro?: unknown;
  usuarioRegistro?: string | null;
}

/** Body de POST /ante/solicitar. */
export interface SolicitarAnticipoRequest {
  idEmpleado: number;
  valor: number;
  numeroCuotas: number;
  /** yyyy-MM-dd. */
  fechaInicioDescuento?: string;
  motivo: string;
  observacion?: string;
  idUsuario: number;
}

/** Body de POST /ante/aprobar/{codigo}. formaPago: solo 3 (Cheque) o 4 (Débito automático). */
export interface AprobarAnticipoRequest {
  idCuentaBancariaOrigen: number;
  formaPago: number;
  debitoAutomatico: boolean;
  referencia?: string;
  idUsuario: number;
}

/** Respuesta de POST /ante/aprobar/{codigo}. */
export interface ResultadoAprobarAnticipo {
  idAnticipo: number;
  idPago?: number | null;
  /** Ver EstadoPagoProgramado de CXP (3 = CONFIRMADO). Refleja esto, no asumir el estado del anticipo. */
  estadoPago?: number | null;
  /** Presente solo si se pagó con cheque. */
  numeroCheque?: number | string | null;
}

/** Body de POST /ante/anular/{codigo}. */
export interface AnularAnticipoRequest {
  motivo: string;
  idUsuario: number;
}

/** Query params de GET /ante/listar. Todos opcionales salvo idEmpresa. */
export interface FiltrosListarAnticipos {
  idEmpresa: number;
  idEmpleado?: number;
  estado?: number;
}
