// Progreso de un lote por carga TXT — endpoint: GET /carga-documentos/progresoLote/{idCargaTxt}
// Forma exacta del §6.3 de docs/cxp/PLAN-CARGA-AUTOMATICA-SRI.md. Un solo endpoint sirve a los
// dos lotes (descarga de XML del SRI y registro/contabilización).
// El avance son tres números (§11 decisión 16): totalCarga describe la carga; total y procesados
// describen el lote en curso y los mantiene el orquestador, no se derivan de la base.

import { ErrorBloqueante } from './error-bloqueante';

/** Contadores en vivo de la carga; el backend los cuenta sobre DCXP, no hay tabla de lotes. */
export interface ContadoresLote {
  sinXml: number;             // estado 1/6 sin pathXml
  conXml: number;             // estado 2 con pathXml
  registrados: number;        // estado 3
  requierenAtencion: number;  // estado 2 con observacion
  conError: number;           // estado 4
  fueraVentana: number;       // resultadoSri = FUERA_VENTANA
}

/** Fila de documento dentro del progreso del lote. */
export interface DocumentoProgreso {
  id: number;
  serieComprobante: string;
  razonSocialEmisor: string;
  tipoComprobante: string;
  estadoDocumento: number;
  esReembolso: number;
  resultadoSri: string | null;
  mensajeSri: string | null;
  observacion: string | null;
  bloqueantes: ErrorBloqueante[];
}

export interface ProgresoLote {
  idCargaTxt: number;
  enCurso: boolean;
  tipoLote: 'DESCARGA' | 'REGISTRO' | null;
  /** Cuántos de la lista de trabajo del lote en curso ya tienen desenlace. 0 si no hay lote */
  procesados: number;
  /** Tamaño de la lista de trabajo del lote EN CURSO. 0 si no hay lote */
  total: number;
  /** Documentos de la carga TXT. Siempre poblado, corra o no un lote */
  totalCarga: number;
  contadores: ContadoresLote;
  /** Siempre todos los documentos de la carga, no solo los del lote en curso */
  documentos: DocumentoProgreso[];
}
