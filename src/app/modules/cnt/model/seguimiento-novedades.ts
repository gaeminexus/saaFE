/**
 * C25 — Seguimiento de novedades (Contabilidad > Procesos > Seguimiento Novedades).
 *
 * Interfaces 1:1 con las entidades de saaBE (tablas CNT.NVDD, RQNV, RSNV, ADNV, VNNV, HSNV, DCSN; el nombre de la
 * columna va en el comentario) y con las proyecciones de GET /nvdd/bandeja, /vistaRequerimientos, /{id}/detalle,
 * /resumenMes, /cuentasPorRegularizar y /reporteActa. Las fechas llegan como arreglo Jackson o texto: se muestran con
 * `formatoFecha()` de cierre-periodo.service.
 */

export type FechaBackend = string | number[] | number | null;

/** CNT.NVDD */
export interface NovedadSeguimiento {
  codigo: number; // NVDDCDGO
  idEmpresa: number; // PJRQCDGO
  idPeriodo: number | null; // PRDOCDGO
  anio: number; // NVDDANNN
  mes: number; // NVDDMSSS
  modulo: string; // NVDDMDLO
  codigoNovedad: string; // NVDDCDNV
  titulo: string; // NVDDTTLO
  hallazgo: string | null; // NVDDHLLZ
  resolucion: string | null; // NVDDRSLC
  tipoRespuesta: string; // NVDDTPRS
  area: string | null; // NVDDARRS
  valor: number | null; // NVDDVLOR
  criterios: string | null; // NVDDCRTR
  fuentes: string | null; // NVDDFNTE (solo GAEMII)
  archivo: string | null; // NVDDARCH
  version: number; // NVDDVRSN
  lote: string | null; // NVDDLTCR
  estado: number; // NVDDESTD
  fechaEnvio: FechaBackend; // NVDDFCEN
  usuarioEnvio: string | null; // NVDDUSEN
  fechaLimite: FechaBackend; // NVDDFCLM
  fechaCierre: FechaBackend; // NVDDFCCR
  usuarioCierre: string | null; // NVDDUSCR
  motivoCierre: string | null; // NVDDMTCR
  fechaRegistro: FechaBackend; // NVDDFCRG
  usuarioRegistro: string; // NVDDUSAR
}

/** CNT.RQNV */
export interface RequerimientoNovedad {
  codigo: number; // RQNVCDGO
  idNovedad: number; // NVDDCDGO
  secuencia: number; // RQNVSCNC
  tipo: string; // RQNVTPRQ
  area: string | null; // RQNVARRS
  descripcion: string; // RQNVDSCR
  tipoReferencia: string | null; // RQNVTPRF
  referencia: string | null; // RQNVRFRN
  valor: number | null; // RQNVVLOR
  fechaReferencia: FechaBackend; // RQNVFCRF
  opciones: string | null; // RQNVOPCN
  supuesto: string | null; // RQNVSPST
  estado: number; // RQNVESTD
  fechaRegistro: FechaBackend; // RQNVFCRG
  usuarioRegistro: string; // RQNVUSAR
}

/** CNT.RSNV */
export interface RespuestaNovedad {
  codigo: number; // RSNVCDGO
  idRequerimiento: number; // RQNVCDGO
  idDecision: number | null; // DCSNCDGO
  fecha: FechaBackend; // RSNVFCHA
  canal: string; // RSNVCNAL
  area: string | null; // RSNVARRS
  texto: string | null; // RSNVTXTO
  opcion: string | null; // RSNVOPCN
  estado: number; // RSNVESTD 1 RECIBIDA, 2 ACEPTADA, 3 OBSERVADA, 4 ANULADA
  fechaRevision: FechaBackend; // RSNVFCRV
  usuarioRevision: string | null; // RSNVUSRV
  observacionRevision: string | null; // RSNVOBRV
  fechaRegistro: FechaBackend; // RSNVFCRG
  usuarioRegistro: string; // RSNVUSAR
}

/** CNT.ADNV */
export interface AdjuntoNovedad {
  codigo: number; // ADNVCDGO
  idNovedad: number | null; // NVDDCDGO
  idRequerimiento: number | null; // RQNVCDGO
  idRespuesta: number | null; // RSNVCDGO
  idDecision: number | null; // DCSNCDGO
  tipoDocumento: string; // ADNVTPDC
  nombreArchivo: string; // ADNVNMAR
  url: string; // ADNVURLA
  mimeType: string | null; // ADNVMMTY
  tamanio: number | null; // ADNVTMNO
  hash: string | null; // ADNVHASH
  observacion: string | null; // ADNVOBSR
  fechaCopiaExpediente: FechaBackend; // ADNVFCEX
  fechaRegistro: FechaBackend; // ADNVFCRG
  usuarioRegistro: string; // ADNVUSAR
  estado: number; // ADNVESTD
}

/** CNT.HSNV */
export interface HistorialNovedad {
  codigo: number; // HSNVCDGO
  idNovedad: number; // NVDDCDGO
  idRequerimiento: number | null; // RQNVCDGO
  accion: string; // HSNVACCN
  estadoAnterior: number | null; // HSNVESAN
  estadoNuevo: number | null; // HSNVESNV
  motivo: string | null; // HSNVMTVO
  fecha: FechaBackend; // HSNVFCHA
  usuario: string; // HSNVUSAR
}

/** CNT.DCSN */
export interface Decision {
  codigo: number; // DCSNCDGO
  idEmpresa: number; // PJRQCDGO
  numero: string; // DCSNNMRO
  fecha: FechaBackend; // DCSNFCHA
  tema: string; // DCSNTEMA
  detalle: string | null; // DCSNDTLL
  tipoDecide: string; // DCSNTPDC
  cargo: string | null; // DCSNCRGO
  evidencia: string | null; // DCSNEVDN
  origen: string; // DCSNORGN
  fechaCopiaExpediente: FechaBackend; // DCSNFCEX
  usuarioCopiaExpediente: string | null; // DCSNUSEX
  estado: number; // DCSNESTD
}

/** Fila de GET /nvdd/bandeja (proyección, sin CLOB). */
export interface FilaBandejaNovedad {
  codigo: number;
  anio: number;
  mes: number;
  modulo: string;
  codigoNovedad: string;
  titulo: string;
  tipoRespuesta: string;
  area: string | null;
  valor: number | null;
  estado: number;
  estadoNombre: string;
  version: number;
  fechaEnvio: FechaBackend;
  fechaLimite: FechaBackend;
  fechaCierre: FechaBackend;
  archivo: string | null;
  criterios: string | null;
  requerimientos: number;
  pendientes: number;
  porRevisar: number;
  porAplicar: number;
  terminados: number;
  asientosOrigen: number;
  asientosAjuste: number;
  saldoPorRegularizar: number;
  ultimaAccion: FechaBackend;
  adjuntos: number;
  diasDesdeEnvio: number | null;
  vencida: boolean;
  listaParaCerrar: boolean;
}

/** Fila de GET /nvdd/vistaRequerimientos. */
export interface FilaRequerimiento {
  codigo: number;
  secuencia: number;
  tipo: string;
  area: string | null;
  descripcion: string;
  tipoReferencia: string | null;
  referencia: string | null;
  valor: number | null;
  fechaReferencia: FechaBackend;
  opciones: string | null;
  supuesto: string | null;
  estado: number;
  estadoNombre: string;
  idNovedad: number;
  anio: number;
  mes: number;
  modulo: string;
  codigoNovedad: string;
  tituloNovedad: string;
  estadoNovedad: number;
  fechaEnvio: FechaBackend;
  fechaLimite: FechaBackend;
  respuestas: number;
  ultimaRespuesta: FechaBackend;
  diasDesdeEnvio: number | null;
  vencido: boolean;
}

export interface LineaAsiento {
  idDetalle: number;
  cuenta: string;
  nombreCuenta: string;
  debe: number | null;
  haber: number | null;
  descripcion: string | null;
  porRegularizar: boolean;
}

/** Vínculo del detalle (CNT.VNNV con el asiento, la decisión o la novedad relacionada). */
export interface VinculoDetalle {
  codigo: number;
  tipo: string;
  idRequerimiento: number | null;
  idAsiento: number | null;
  numeroAsiento: string | null;
  fechaAsiento: FechaBackend;
  estadoAsiento: number | null;
  observacionAsiento: string | null;
  idDecision: number | null;
  numeroDecision: string | null;
  temaDecision: string | null;
  idNovedadRelacionada: number | null;
  novedadRelacionada?: string;
  tituloRelacionada?: string;
  estadoRelacionada?: string;
  idPartidaC22: number | null;
  tipoDocumentoModulo: string | null;
  idDocumentoModulo: number | null;
  valor: number | null;
  observacion: string | null;
  fechaRegistro: FechaBackend;
  usuarioRegistro: string;
  estado: number;
  fechaAnulacion: FechaBackend;
  usuarioAnulacion: string | null;
  motivoAnulacion: string | null;
  moduloOrigenAsiento: string | null;
  lineas?: LineaAsiento[];
  totalDebe?: number;
  totalHaber?: number;
}

export interface CuentaNovedad {
  cuenta: string;
  nombre: string;
  origen: number;
  ajuste: number;
  pendiente: number;
}

export interface DetalleNovedad {
  novedad: NovedadSeguimiento;
  estadoNombre: string;
  listaParaCerrar: boolean;
  requerimientos: {
    requerimiento: RequerimientoNovedad;
    estadoNombre: string;
    respuestas: { respuesta: RespuestaNovedad; adjuntos: AdjuntoNovedad[] }[];
    adjuntos: AdjuntoNovedad[];
  }[];
  adjuntos: AdjuntoNovedad[];
  vinculos: VinculoDetalle[];
  cuentasPorRegularizar: CuentaNovedad[];
  historial: HistorialNovedad[];
  c22: { instalado: boolean; mensaje: string };
}

export interface CuentaPorRegularizar {
  cuenta: string;
  nombre: string;
  saldoInicial: number;
  debeMes: number;
  haberMes: number;
  movimientoMes: number;
  explicadoPorNovedades: number;
  sinNovedad: number;
  regularizadoPorAjustes: number;
  saldoFinal: number;
}

export interface CuentasPorRegularizar {
  fuente: string;
  cuentas: CuentaPorRegularizar[];
  totalMovimientoMes: number;
  totalExplicadoPorNovedades: number;
  totalSinNovedad: number;
  totalRegularizadoPorAjustes: number;
  totalSaldoFinal: number;
  c22: { instalado: boolean; mensaje: string };
}

export interface ResumenMesNovedades {
  anio: number;
  mes: number;
  novedades: number;
  porEstado: Record<string, number>;
  porTipo: Record<string, number>;
  porModulo: Record<string, Record<string, number>>;
  requerimientosPorEstado: Record<string, number>;
  pendientesPorArea: Record<string, number>;
  antiguedadPendientes: { hasta15: number; de16a30: number; masDe30: number; vencidos: number };
  cuentasPorRegularizar: CuentasPorRegularizar;
}

export interface ReporteActa {
  mes: string;
  bloqueos: string[];
  puedeGenerarse: boolean;
  decisiones: any[];
  ajustes: any[];
  pendientes: FilaRequerimiento[];
  informativas: FilaBandejaNovedad[];
  texto: string;
}

/** Metadatos de un archivo ya subido con FileService.uploadFileCustomPath. */
export interface AdjuntoEntrada {
  tipoDocumento: string;
  nombreArchivo: string;
  url: string;
  mimeType?: string | null;
  tamanio?: number | null;
  hash?: string | null;
  observacion?: string | null;
}

/** Cuerpo único de las acciones (AccionNovedad del backend). `usuario` lo pone el servicio. */
export interface AccionNovedad {
  motivo?: string | null;
  ids?: number[];
  fechaLimite?: string | null;
  texto?: string | null;
  opcion?: string | null;
  canal?: string | null;
  fecha?: string | null;
  area?: string | null;
  adjuntos?: AdjuntoEntrada[];
  numero?: string | null;
  tema?: string | null;
  tipoDecide?: string | null;
  cargo?: string | null;
  evidencia?: string | null;
  idRespuesta?: number | null;
  idNovedad?: number | null;
  idRequerimiento?: number | null;
  asientos?: string[];
  tipoVinculo?: string | null;
  idAsiento?: number | null;
  idDecision?: number | null;
  idNovedadRelacionada?: number | null;
  idPartidaC22?: number | null;
  tipoDocumentoModulo?: string | null;
  idDocumentoModulo?: number | null;
  valor?: number | null;
  sinAjusteMotivo?: string | null;
}

// ============================ Catálogos (mismos CHECK de C25-01) ============================

export const ESTADOS_NOVEDAD: Record<number, string> = {
  1: 'BORRADOR',
  2: 'ENVIADA',
  3: 'RESPONDIDA PARCIAL',
  4: 'RESPONDIDA',
  5: 'OBSERVADA',
  6: 'POR APLICAR',
  7: 'CERRADA',
  8: 'ANULADA',
  9: 'REEMPLAZADA',
};

export const ESTADOS_REQUERIMIENTO: Record<number, string> = {
  1: 'PENDIENTE',
  2: 'RESPONDIDO',
  3: 'ACEPTADO',
  4: 'OBSERVADO',
  5: 'NO EXISTE',
  6: 'APLICADO',
  7: 'NO APLICA',
  8: 'ANULADO',
};

export const ESTADOS_RESPUESTA: Record<number, string> = { 1: 'RECIBIDA', 2: 'ACEPTADA', 3: 'OBSERVADA', 4: 'ANULADA' };

export const MODULOS_NOVEDAD = ['CREDITO', 'APORTES', 'BANCOS', 'CONTABILIDAD', 'CXP', 'CXC', 'RRHH', 'ESTRUCTURAS'];

/** D-056 (6): todas las novedades se muestran, clasificadas por tipo. */
export const TIPOS_NOVEDAD: { valor: string; etiqueta: string; ayuda: string }[] = [
  { valor: 'INFORMATIVA', etiqueta: 'Informativa', ayuda: 'Sin pedido: se da por conocida con el acta' },
  { valor: 'DOCUMENTO', etiqueta: 'Documento', ayuda: 'Se pide un documento' },
  { valor: 'DECISION', etiqueta: 'Decisión', ayuda: 'Contabilidad de ASOPREP decide con constancia' },
  { valor: 'CONFIRMACION', etiqueta: 'Confirmación', ayuda: 'Confirmar un supuesto (sí / no)' },
  { valor: 'ELECCION', etiqueta: 'Elección', ayuda: 'Elegir entre opciones' },
  { valor: 'APROBACION', etiqueta: 'Aprobación', ayuda: 'Aprobar una propuesta' },
];

export const AREAS_ASOPREP: { valor: string; etiqueta: string }[] = [
  { valor: 'CREDITO', etiqueta: 'Crédito' },
  { valor: 'TESORERIA', etiqueta: 'Tesorería' },
  { valor: 'CONTABILIDAD', etiqueta: 'Contabilidad' },
  { valor: 'TALENTO_HUMANO', etiqueta: 'Talento humano' },
  { valor: 'GERENCIA', etiqueta: 'Gerencia' },
  { valor: 'SISTEMAS', etiqueta: 'Sistemas' },
];

export const CANALES_RESPUESTA = ['SAA', 'CORREO', 'ACTA', 'REUNION'];

export const TIPOS_DOCUMENTO_ADJUNTO = [
  'COMPROBANTE', 'LIQUIDACION', 'FACTURA', 'RETENCION', 'ACTA', 'CORREO', 'TABLA_AMORTIZACION', 'CERTIFICADO',
  'CONTRATO', 'ROL', 'EXTRACTO', 'OTRO',
];

export const TIPOS_DECIDE: { valor: string; etiqueta: string }[] = [
  { valor: 'CONTABILIDAD_ASOPREP', etiqueta: 'Contabilidad de ASOPREP (autorizador, D-056)' },
  { valor: 'RESPONSABLE_ASOPREP', etiqueta: 'Responsable autorizador de ASOPREP' },
  { valor: 'GERENCIA', etiqueta: 'Gerencia de ASOPREP' },
  { valor: 'LIDER_PROYECTO', etiqueta: 'Líder del proyecto' },
  { valor: 'GAEMII', etiqueta: 'GAEMII NEXUS' },
];

export function etiquetaTipo(valor: string | null | undefined): string {
  return TIPOS_NOVEDAD.find((t) => t.valor === valor)?.etiqueta ?? valor ?? '—';
}

export function etiquetaArea(valor: string | null | undefined): string {
  return AREAS_ASOPREP.find((a) => a.valor === valor)?.etiqueta ?? valor ?? '—';
}

/** Clase CSS del chip de estado de la novedad. */
export function claseEstadoNovedad(estado: number): string {
  switch (estado) {
    case 1: return 'chip-gris';
    case 2: return 'chip-azul';
    case 3:
    case 4: return 'chip-ambar';
    case 5: return 'chip-rojo';
    case 6: return 'chip-violeta';
    case 7: return 'chip-verde';
    default: return 'chip-gris';
  }
}

export function claseEstadoRequerimiento(estado: number): string {
  switch (estado) {
    case 1: return 'chip-azul';
    case 2:
    case 5: return 'chip-ambar';
    case 3: return 'chip-violeta';
    case 4: return 'chip-rojo';
    case 6:
    case 7: return 'chip-verde';
    default: return 'chip-gris';
  }
}
