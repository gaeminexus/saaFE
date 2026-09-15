// Seguimiento de un pago (PGS.PGTR) — docs/tsr/API-SEGUIMIENTO-PAGOS.md.
// GET /rest/pgtr/seguimiento (buscar) y GET /rest/pgtr/seguimiento/{idPago} (detalle).
// Sin endpoint nuevo para las acciones: Anular/Revertir usan PagoProgramadoService.

/** Fila de la búsqueda — GET /pgtr/seguimiento?numero=|texto=|origen=&idOrigen=. */
export interface ResumenSeguimientoPago {
  idPago: number;
  estado: number;
  estadoTexto: string;
  valor: number;
  fechaProgramada: string;
  beneficiario: string;
  origen: string;
  origenTexto: string;
  concepto: string;
}

/** Exactamente uno de numero / texto / (origen + idOrigen) — el backend rechaza con 400 si no. */
export interface BuscarSeguimientoPagoParams {
  numero?: number;
  texto?: string;
  origen?: string;
  idOrigen?: number;
  idEmpresa?: number;
}

export interface LoteSeguimiento {
  idLote: number;
  nombreArchivo: string;
  estado: number;
  estadoTexto: string;
}

export interface AsientoSeguimiento {
  codigo: number;
  numeroAlterno?: string | null;
}

/** `pago` del detalle — campos propios de PGTR, ya resueltos a texto donde aplica. */
export interface DetallePagoSeguimiento {
  idPago: number;
  estado: number;
  estadoTexto: string;
  formaPago?: number | null;
  formaPagoTexto?: string | null;
  valor: number;
  fechaProgramada: string;
  beneficiario: string;
  identificacionBeneficiario?: string | null;
  concepto: string;
  observacion?: string | null;
  cuentaOrigen?: string | null;
  cuentaDestino?: string | null;
  motivo?: string | null;
  referenciaBanco?: string | null;
  fechaRespuesta?: string | null;
  lote?: LoteSeguimiento | null;
  asiento?: AsientoSeguimiento | null;
}

/** Documento del módulo de origen; `null` cuando `origen.resuelto` es `false`. */
export interface DocumentoOrigenSeguimiento {
  numero: string;
  estado: number;
  estadoTexto: string;
  fecha: string;
  total: number;
}

/**
 * Origen del pago. `resuelto: false` significa que el backend no tiene resolutor para esa clave
 * de origen — no es un error, la pantalla muestra "Origen sin detalle" y sigue funcionando
 * (§3 y §5 del contrato: nunca un 500 por esto).
 */
export interface OrigenSeguimiento {
  clave: string;
  texto: string;
  idOrigen: number;
  resuelto: boolean;
  documento: DocumentoOrigenSeguimiento | null;
  /** Pantalla de la etapa previa (app.routes.ts al 2026-09-15, §3 del contrato). `null` si no aplica. */
  ruta: string | null;
}

export type SituacionEtapa = 'HECHA' | 'ACTUAL' | 'PENDIENTE';

/**
 * Una etapa de la línea de tiempo. En un pago RECHAZADO/ANULADO, la última etapa alcanzada queda
 * `ACTUAL` y el backend agrega una etapa extra `{clave:"RECHAZADO"|"ANULADO", situacion:"ACTUAL"}`
 * — esa etapa sintética puede no traer `texto` ni `ruta`.
 */
export interface EtapaSeguimiento {
  clave: string;
  texto?: string;
  situacion: SituacionEtapa;
  ruta?: string | null;
}

/**
 * Qué se puede hacer desde acá. El backend aplica las MISMAS reglas que ya rigen
 * `POST /pgtr/anular/{id}` y `POST /pgtr/revertirConfirmado/{id}` — la pantalla no las duplica,
 * solo deshabilita el botón y muestra el motivo tal cual (§5 del contrato: "no calcular en el FE
 * si se puede anular").
 */
export interface AccionesSeguimiento {
  rutaEtapaActual: string | null;
  puedeAnular: boolean;
  motivoNoAnular: string | null;
  puedeRevertir: boolean;
  motivoNoRevertir: string | null;
}

/** GET /pgtr/seguimiento/{idPago} — 404 con {mensaje} si no existe, nunca 500. */
export interface DetalleSeguimientoPago {
  pago: DetallePagoSeguimiento;
  origen: OrigenSeguimiento;
  etapas: EtapaSeguimiento[];
  acciones: AccionesSeguimiento;
}
