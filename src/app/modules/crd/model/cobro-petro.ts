/**
 * Cobro de Petro en dos pasos — contrato congelado en
 * `docs/crd/API-COBRO-PETRO-DOS-PASOS.md` (§2). No cambiar estos nombres de campo por cuenta
 * propia: si algo no cuadra contra el backend real, se reporta BLOQUEADA, no se adivina.
 *
 * Paso 1 (contabilidad, a mano): registrar las N transferencias con las que Petro pagó y
 * confirmar que el dinero entró al banco. Paso 2 (proceso de aplicación del archivo): reparte
 * de la cuenta transitoria a las cuentas reales. El paso 2 no puede correr sin el paso 1.
 */

/** GET /rest/asgn/transferencias/{idCarga} — TransferenciaDTO, §2.1. */
export interface TransferenciaDTO {
  idTransferencia: number;
  idCarga: number;
  idCuentaBancaria: number;
  /** Número/nombre para mostrar, ya resuelto por el backend. */
  cuentaBancaria: string;
  idBanco: number;
  nombreBanco: string;
  idBancoExterno: number;
  nombreBancoExterno: string;
  cuentaOrigen: string;
  numero: string;
  valor: number;
  /** `LocalDate` del backend: string ISO o arreglo `[y,m,d]` — normalizar con FuncionesDatosService. */
  fecha: string | number[];
  observacion: string | null;
  estado: number;
  usuarioRegistro: string;
  fechaRegistro: string | number[];
}

/** GET /rest/asgn/transferencias/{idCarga} — respuesta completa, §2.1. */
export interface EstadoTransferenciasCargaDTO {
  idCarga: number;
  /** "yyyy-MM". */
  periodo: string;
  nombreFilial: string;
  /** Lo que el archivo dice que se descontó. */
  totalArchivo: number;
  /** Suma de las transferencias vigentes. */
  totalTransferencias: number;
  /** totalArchivo − totalTransferencias. */
  diferencia: number;
  /** |diferencia| <= 0.01. */
  cuadra: boolean;
  /** ¿Ya se hizo el paso 1? */
  confirmada: boolean;
  usuarioConfirma: string | null;
  fechaConfirmacion: string | number[] | null;
  transferencias: TransferenciaDTO[];
}

/** POST /rest/asgn/transferencias — body, §2.1. */
export interface NuevaTransferenciaRequest {
  idCarga: number;
  idCuentaBancaria: number;
  idBanco: number;
  idBancoExterno: number;
  cuentaOrigen: string;
  numero: string;
  valor: number;
  /** `yyyy-MM-dd`. Nunca un `Date` crudo ni nada terminado en `Z`. */
  fecha: string;
  observacion: string | null;
  usuario: string;
}

/** DELETE /rest/asgn/transferencias/{idTransferencia}?usuario=X — respuesta, §2.1. */
export interface AnulacionTransferenciaResponse {
  anulada: true;
}

/** POST /rest/asgn/confirmarRecepcion/{idCarga} — body, §2.2. */
export interface ConfirmarRecepcionRequest {
  usuario: string;
  ip: string;
  observacion: string | null;
}

/** POST /rest/asgn/confirmarRecepcion/{idCarga} — respuesta, §2.2. */
export interface ConfirmarRecepcionResponse {
  idCarga: number;
  confirmada: true;
  idAsiento: number;
  numeroAsiento: string;
  fechaAsiento: string | number[];
  valorAsiento: number;
  /** false = se confirmó pero NO se generó asiento. No es error: avisar sin pintarlo en rojo. */
  contabilidadActiva: boolean;
  mensaje: string;
}

/** POST /rest/asgn/reversarRecepcion/{idCarga} — body, §2.3. Motivo OBLIGATORIO. */
export interface ReversarRecepcionRequest {
  usuario: string;
  ip: string;
  motivo: string;
}

/** POST /rest/asgn/reversarRecepcion/{idCarga} — respuesta, §2.3. */
export interface ReversarRecepcionResponse {
  idCarga: number;
  confirmada: false;
  idAsientoAnulado: number;
  mensaje: string;
}

/** Tipo de asiento en CRD.ANCP — GET /rest/asgn/estadoContable/{idCarga}, §2.4. */
export enum TipoAsientoCobroPetro {
  TRANSITORIO = 1,
  REPARTO = 2,
  APLICACION = 3,
}

/** Línea de `asientos` en GET /rest/asgn/estadoContable/{idCarga}, §2.4. */
export interface AsientoCobroPetroDTO {
  tipo: number;
  /** El backend resuelve el catálogo, no el cliente. */
  tipoTexto: string;
  idAsiento: number;
  numeroAsiento: string;
  fecha: string | number[];
  valor: number;
  lineas: number;
  /** 1 vigente, 0 reversado. */
  estado: number;
  usuarioRegistro: string;
  fechaRegistro: string | number[];
}

/**
 * GET /rest/asgn/estadoContable/{idCarga} — respuesta, §2.4.
 * `asientos: []` = todavía no se contabilizó nada. NO es error, el backend devuelve 200.
 */
export interface EstadoContableCargaDTO {
  idCarga: number;
  contabilidadActiva: boolean;
  asientos: AsientoCobroPetroDTO[];
}
