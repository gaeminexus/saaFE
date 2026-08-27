/**
 * Cierre de conciliación con partidas en tránsito.
 *
 * Contrato REAL confirmado en
 * docs/logica-negocio/tsr/DISENO-CONCILIACION-PARTIDAS-EN-TRANSITO.md §10.3
 * en saaBE (backend ya implementado, 2026-08-27) — reemplaza el contrato
 * asumido de la primera versión de este archivo (base `/cncl`, un solo
 * array `pendientes` con campo `origen`), que resultó incorrecto en casi
 * todos los detalles salvo el concepto general. Ver también §3/§10.2 para
 * la fórmula corregida.
 */

export enum TipoTransito {
  DEPOSITO_EN_TRANSITO = 1,
  CHEQUE_GIRADO_NO_COBRADO = 2,
  NC_BANCO_NO_REGISTRADA = 3,
  ND_BANCO_NO_REGISTRADA = 4,
}

export const TIPO_TRANSITO_LABELS: Record<number, string> = {
  1: 'Depósito en tránsito',
  2: 'Cheque girado no cobrado',
  3: 'NC del banco no registrada',
  4: 'ND del banco no registrada',
};

/**
 * Coeficiente de cada tipo sobre saldoExtracto (§3, CORREGIDO el 2026-08-27
 * — la primera versión de este documento y de este archivo agrupaba los
 * signos por "está en libros / está en el banco", que es el eje
 * equivocado: lo que manda es la DIRECCIÓN de cada partida, no su origen):
 *
 *   saldoExtracto = saldoLibros − tipo1 + tipo2 + tipo3 − tipo4
 *
 * Ejemplo numérico (saldo libros = 1.000), verificado en §10.2 de saaBE:
 *  - Tipo 1, depósito en tránsito $200: libros YA lo sumaron, el banco
 *    todavía no acreditó → RESTA. 1000 − 200 = 800.
 *  - Tipo 2, cheque girado no cobrado $150: libros YA lo restaron, pero el
 *    banco no lo ha debitado — ese dinero SIGUE en la cuenta → SUMA.
 *    1000 + 150 = 1150. Es el caso menos intuitivo: no importa que el
 *    cheque haya salido "de libros", lo que importa es que el banco
 *    todavía no lo movió.
 *  - Tipo 3, NC del banco no registrada $50: el banco YA acreditó, los
 *    libros no → SUMA. 1000 + 50 = 1050.
 *  - Tipo 4, ND del banco no registrada $30 (comisión, etc.): el banco YA
 *    debitó, los libros no → RESTA. 1000 − 30 = 970.
 *
 * El par 1/2 tiene signos OPUESTOS entre sí, igual que el par 3/4 — agrupar
 * por origen (libros vs. banco) en vez de por dirección es justo el error
 * de la primera versión. No "corregir" esto de vuelta a agrupar por origen.
 */
export function coeficienteTransito(tipo: number): 1 | -1 {
  return tipo === TipoTransito.CHEQUE_GIRADO_NO_COBRADO || tipo === TipoTransito.NC_BANCO_NO_REGISTRADA ? 1 : -1;
}

/** Un grupo N:M ya conciliado en el período — bloque informativo. */
export interface ConciliadoDelMes {
  idGrupo: number;
  valorExtracto: number;
  valorAsiento: number;
  fechaConciliacion: unknown;
  usuarioConcilia: string;
}

/** Línea de extracto sin registrar en libros — candidata a tipo 3/4. */
export interface PendienteExtracto {
  idDetalleExtracto: number;
  fecha: unknown;
  descripcion: string;
  valor: number;
  esArrastrada: boolean;
  tipoSugerido: number | null;
}

/** Línea de asiento/libros sin acreditar en el banco — candidata a tipo 1/2. */
export interface PendienteAsiento {
  idDetalleAsiento: number;
  idAsiento: number;
  /** null = esta línea NO se puede declarar en tránsito (sin MovimientoBanco asociado, ver §10.2). */
  idMovimientoBanco: number | null;
  fecha: unknown;
  descripcion: string;
  valor: number;
  esArrastrada: boolean;
  tipoSugerido: number | null;
}

export interface PrepararCierreResponse {
  idCuentaBancaria: number;
  idPeriodo: number;
  conciliadosDelMes: ConciliadoDelMes[];
  pendientesExtracto: PendienteExtracto[];
  pendientesAsiento: PendienteAsiento[];
  saldoLibros: number;
  /** Puede venir null si no hay ninguna fila de extracto en el período. Es una SUGERENCIA editable, no un hecho fijo — el usuario la confirma o corrige antes de cerrar. */
  saldoExtractoSugerido: number | null;
  diferenciaSugerida: number | null;
}

/** Una partida declarada, dentro del body de POST /cnct/transito/cerrar. Exactamente uno de idMovimientoBanco/idDetalleExtracto va poblado; el backend calcula `valor` a partir de la referencia, no se manda desde el frontend. */
export interface PartidaDeclarada {
  idMovimientoBanco?: number | null;
  idDetalleExtracto?: number | null;
  tipo: number;
  observacion?: string;
}

export interface CerrarConciliacionRequest {
  idCuentaBancaria: number;
  idPeriodo: number;
  partidas: PartidaDeclarada[];
  saldoExtracto: number;
  /** Nombre de usuario (string) — este endpoint puntual no pide idUsuario numérico. */
  usuario: string;
}

export interface CerrarConciliacionResponse {
  idCierre: number;
  idCuentaBancaria: number;
  idPeriodo: number;
  saldoLibros: number;
  saldoExtracto: number;
  diferencia: number;
  estado: number;
  fechaCierre: unknown;
  usuarioCierre: string;
  partidasDeclaradas: number;
}

export interface AnularCierreRequest {
  motivo: string;
  usuario: string;
}

/** Fila de GET /cnct/transito/antiguas/{idEmpresa} — el backend ya trae los días calculados. */
export interface PartidaTransitoAntigua {
  idPartida: number;
  tipo: number;
  valor: number;
  diasEnTransito: number;
  cuentaBancaria: string;
  declaradaEn: unknown;
  observacion: string;
}
