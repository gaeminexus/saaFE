/**
 * C34 — Seguimiento de Novedades v2. Contrato: saaBE docs/logica-negocio/cnt/C34-NOVEDADES-V2.md (REST /nvdd2).
 * Diseño: cuadreSuper 03-trabajo/cambios-saa/c34-novedades-v2/C34-NOVEDADES-V2-DISENO.md.
 */

export type GrupoNovedad = 'POR_REGULARIZAR' | 'PEDIDO' | 'INFORMATIVA';
export type EstadoVisible = 'PENDIENTE' | 'EN_PROCESO' | 'LISTA' | 'CERRADA' | 'POR_CONOCER';

export const GRUPOS_V2: { valor: GrupoNovedad; etiqueta: string; ayuda: string }[] = [
  {
    valor: 'POR_REGULARIZAR',
    etiqueta: 'Por regularizar',
    ayuda: 'Movimientos que quedaron en cuentas por regularizar: se justifica cada uno y se dice a qué cuenta va su valor.',
  },
  { valor: 'PEDIDO', etiqueta: 'Decisiones y documentos', ayuda: 'Pedidos de documentos, confirmaciones y decisiones de ASOPREP.' },
  { valor: 'INFORMATIVA', etiqueta: 'Informativas', ayuda: 'Avisos: se leen y se dan por conocidos.' },
];

export const AREAS_V2: { valor: string; etiqueta: string }[] = [
  { valor: 'CONTABILIDAD', etiqueta: 'Contabilidad' },
  { valor: 'CREDITO', etiqueta: 'Crédito' },
  { valor: 'TESORERIA', etiqueta: 'Tesorería' },
  { valor: 'TALENTO_HUMANO', etiqueta: 'Talento humano' },
  { valor: 'GERENCIA', etiqueta: 'Gerencia' },
  { valor: 'SISTEMAS', etiqueta: 'Sistemas' },
];

export const ESTADOS_V2: { valor: string; etiqueta: string }[] = [
  { valor: 'ABIERTAS', etiqueta: 'Abiertas (todas las no cerradas)' },
  { valor: 'PENDIENTE', etiqueta: 'Pendiente' },
  { valor: 'EN_PROCESO', etiqueta: 'En proceso' },
  { valor: 'LISTA', etiqueta: 'Lista para cerrar' },
  { valor: 'POR_CONOCER', etiqueta: 'Por leer' },
  { valor: 'CERRADA', etiqueta: 'Cerrada / conocida' },
];

export const TIPOS_DOCUMENTO_V2: { valor: string; etiqueta: string }[] = [
  { valor: 'COMPROBANTE', etiqueta: 'Comprobante (egreso, ingreso, transferencia)' },
  { valor: 'FACTURA', etiqueta: 'Factura' },
  { valor: 'LIQUIDACION', etiqueta: 'Liquidación' },
  { valor: 'RETENCION', etiqueta: 'Retención' },
  { valor: 'ACTA', etiqueta: 'Acta' },
  { valor: 'CORREO', etiqueta: 'Correo' },
  { valor: 'CERTIFICADO', etiqueta: 'Certificado' },
  { valor: 'CONTRATO', etiqueta: 'Contrato' },
  { valor: 'EXTRACTO', etiqueta: 'Extracto bancario' },
  { valor: 'TABLA_AMORTIZACION', etiqueta: 'Tabla de amortización' },
  { valor: 'ROL', etiqueta: 'Rol de pagos' },
  { valor: 'OTRO', etiqueta: 'Otro' },
];

/** Fila de la bandeja (GET /nvdd2/bandeja). */
export interface FilaNovedadV2 {
  codigo: number;
  anio: number;
  mes: number;
  periodo: string;
  modulo: string;
  codigoNovedad: string;
  titulo: string;
  tituloTecnico: string;
  tipoRespuesta: string;
  area: string | null;
  areaNombre: string;
  grupo: GrupoNovedad;
  lineas: number;
  lineasJustificadas: number;
  valor: number;
  saldo: number;
  justificado: number;
  pedidos: number;
  pedidosAtendidos: number;
  valorNovedad: number | null;
  fechaCierre: string | null;
  usuarioCierre: string | null;
  comentarioCierre: string | null;
  estado: EstadoVisible;
  estadoNombre: string;
  siguientePaso: string;
  puedeCerrar: boolean;
  motivoNoCierra: string | null;
}

export interface ResumenGrupo {
  total: number;
  abiertas: number;
  listasParaCerrar: number;
  cerradas: number;
  valor?: number;
  saldo?: number;
  movimientosPendientes?: number;
  cuentas?: { cuenta: string; nombre: string; saldoLibros: number; naturaleza: string; pendienteNovedades: number; resueltoEnNovedades: number; sinNovedad: number; movimientosPendientes: number }[];
}

export type ResumenV2 = Record<GrupoNovedad, ResumenGrupo>;

export interface AdjuntoV2 {
  codigo: number;
  tipoDocumento: string;
  nombreArchivo: string;
  url: string;
  fechaRegistro?: string;
  usuarioRegistro?: string;
}

export interface RepartoV2 {
  codigo?: number;
  idCuenta: number;
  cuenta?: string;
  nombreCuenta?: string;
  valor: number;
  sentido: 'D' | 'H';
  idPrestamo?: number | null;
  idAsoprep?: number | null;
  idCuota?: number | null;
  numeroCuota?: number | null;
  idEntidad?: number | null;
  cedula?: string | null;
  nombre?: string | null;
  glosa?: string | null;
}

export interface JustificacionV2 {
  codigo: number;
  monto: number;
  tipo: 'RESPALDO' | 'DECISION' | 'CRUCE' | 'HECHO';
  tipoNombre: string;
  /** C34d: hecho de crédito que resuelve el movimiento. */
  hecho?: HechoV2 | null;
  idLineaCruce: number | null;
  cruceCon?: string;
  fechaHecho: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  idDecision: number | null;
  numeroDecision: string | null;
  tituloDecision: string | null;
  texto: string | null;
  vigente: boolean;
  fechaRegistro: string;
  usuarioRegistro: string;
  fechaAnulacion: string | null;
  usuarioAnulacion: string | null;
  motivoAnulacion: string | null;
  reparto: RepartoV2[];
  adjuntos: AdjuntoV2[];
}

export interface LineaV2 {
  codigo: number;
  secuencia: number;
  origen: string;
  idAsiento: number | null;
  numeroAsiento: string | null;
  fecha: string | null;
  glosa: string | null;
  descripcion: string | null;
  valor: number;
  sentido: 'D' | 'H';
  tipoMovimiento: string;
  saldo: number;
  estado: number;
  estadoNombre: string;
  idCuentaAfectada: number;
  cuentaAfectada: string;
  nombreCuentaAfectada: string;
  idFilaExtracto: number | null;
  fechaBanco: string | null;
  banco: string | null;
  cuentaBancaria: string | null;
  cuentaMovimiento: string | null;
  nombreCuentaMovimiento: string | null;
  idPrestamo: number | null;
  idAsoprep: number | null;
  /** C34d: operación que menciona el texto del movimiento (para abrir el hecho de crédito con ella puesta). */
  idPrestamoSugerido?: number | null;
  idAsoprepSugerido?: number | null;
  cedula: string | null;
  nombre: string | null;
  codigoParticipe: string | null;
  justificaciones: JustificacionV2[];
}

export interface RespuestaV2 {
  respuesta: {
    codigo: number;
    fecha: string;
    texto: string | null;
    opcion: string | null;
    estado: number;
    usuarioRegistro: string;
    monto: number | null;
    fechaHecho: string | null;
    tipoDocumento: string | null;
    numeroDocumento: string | null;
    filasDetalle: string | null;
  };
  vigente: boolean;
  numeroDecision?: string;
  tituloDecision?: string;
  /** C34d: hecho de crédito con que se atendió el pedido. */
  hecho?: HechoV2 | null;
  reparto: RepartoV2[];
  adjuntos: AdjuntoV2[];
}

export interface PedidoV2 {
  codigo: number;
  secuencia: number;
  tipo: string;
  tipoNombre: string;
  area: string | null;
  areaNombre: string;
  descripcion: string;
  valor: number | null;
  opciones: string | null;
  supuesto: string | null;
  efectoSi: string | null;
  efectoNo: string | null;
  estado: number;
  atendido: boolean;
  estadoNombre: string;
  respuestas: RespuestaV2[];
}

export interface DetalleOrigenV2 {
  codigo: number;
  grupo: string;
  secuencia: number;
  tipo: string;
  idPrestamo: number | null;
  idAsoprep: number | null;
  cedula: string | null;
  nombre: string | null;
  codigoParticipe: string | null;
  idCuota: number | null;
  numeroCuota: number | null;
  fecha1: string | null;
  fecha2: string | null;
  valor1: number | null;
  valor2: number | null;
  estadoAntes: string | null;
  estadoDespues: string | null;
  descripcion: string | null;
  estadoHoy: string | null;
  fechaPagoHoy: string | null;
  capitalCuota: number | null;
  interesCuota: number | null;
  numeroAsiento: string | null;
}

export interface CuentaNovedadV2 {
  cuenta: string;
  nombre: string;
  sentido: 'D' | 'H';
  sentidoNombre: string;
  movimientos: number;
  valor: number;
  saldo: number;
}

export interface DecisionV2 {
  codigo: number;
  numero: string;
  titulo: string;
  resumen: string | null;
  fecha?: string;
  citadaPorLaNovedad?: boolean;
  usosEnElModulo?: number;
  sugerida?: boolean;
}

export interface DetalleNovedadV2 {
  fila: FilaNovedadV2;
  textos: {
    titulo: string;
    quePaso: string | null;
    quePasoEsTecnico: boolean;
    porQue: string | null;
    registro: string | null;
    queHacer: string | null;
    textoTecnico: string | null;
    resolucionTecnica: string | null;
    criterios: string | null;
    fuentes: string | null;
  };
  cuentas: CuentaNovedadV2[];
  lineas: LineaV2[];
  pedidos: PedidoV2[];
  detalleOrigen: DetalleOrigenV2[];
  decisiones: DecisionV2[];
  historial: { codigo: number; accion: string; motivo: string | null; fecha: string; usuario: string }[];
}

export interface CuentaContableV2 {
  codigo: number;
  cuenta: string;
  nombre: string;
}

export interface PrestamoV2 {
  codigo: number;
  idAsoprep: number | null;
  idEntidad: number;
  cedula: string | null;
  nombre: string | null;
  fecha: string | null;
  monto: number | null;
}

export interface ParticipeV2 {
  codigo: number;
  cedula: string | null;
  nombre: string | null;
  codigoParticipe: string | null;
}

export interface CuotaV2 {
  codigo: number;
  numero: number;
  vencimiento: string | null;
  estado: string | null;
  capital: number | null;
  interes: number | null;
}

export interface AdjuntoEntradaV2 {
  tipoDocumento: string;
  nombreArchivo: string;
  url: string;
  mimeType: string | null;
  tamanio: number | null;
  hash: string | null;
}

/** Cuerpo de las acciones (AccionNovedadV2 del backend). */
export interface AccionV2 {
  motivo?: string | null;
  ids?: number[];
  lineas?: { idLinea: number; monto?: number | null }[];
  tipo?: string | null;
  idLineaCruce?: number | null;
  fechaHecho?: string | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  texto?: string | null;
  idDecision?: number | null;
  reparto?: RepartoV2[];
  adjuntos?: AdjuntoEntradaV2[];
  opcion?: string | null;
  monto?: number | null;
  filasDetalle?: number[];
}

export interface ResultadoAccionV2 {
  mensaje: string;
  fila?: FilaNovedadV2;
  filas?: FilaNovedadV2[];
}

/** Formato de dinero de la pantalla: 11.400,73. */
export function dinero(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v as number)) return '—';
  return (v as number).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Fecha corta dd/mm/aaaa desde lo que manda el backend (yyyy-MM-dd o yyyy-MM-ddTHH:mm:ss, o arreglo de Jackson). */
export function fechaCorta(v: any): string {
  if (!v) return '';
  if (Array.isArray(v)) {
    const [a, m, d] = v;
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a}`;
  }
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

// ---------------------------------------------------------------- C34d: hechos de crédito

export type TipoHecho = 'ABONO_CAPITAL' | 'PAGO_CUOTAS' | 'PRECANCELACION' | 'REAPERTURA_CUOTAS' | 'PARTICIPE_DEBE';
export type TipoOrigen = 'EXTRACTO' | 'APORTE' | 'PENDIENTE' | 'SIN_DINERO';

export const TIPOS_HECHO: { valor: TipoHecho; etiqueta: string; ayuda: string }[] = [
  { valor: 'ABONO_CAPITAL', etiqueta: 'Abono a capital', ayuda: 'El partícipe abonó a capital; la tabla se recalcula desde la cuota indicada.' },
  { valor: 'PAGO_CUOTAS', etiqueta: 'Pago de cuotas', ayuda: 'El dinero pagó una o varias cuotas.' },
  { valor: 'PRECANCELACION', etiqueta: 'Precancelación', ayuda: 'El préstamo se canceló por completo con este pago.' },
  { valor: 'REAPERTURA_CUOTAS', etiqueta: 'Reapertura de cuotas', ayuda: 'Cuotas marcadas pagadas sin dinero que deben volver a cobrarse.' },
  { valor: 'PARTICIPE_DEBE', etiqueta: 'El partícipe debe', ayuda: 'No hubo dinero: el valor queda como deuda del partícipe.' },
];

/** Movimiento que puede ser origen del dinero (buscador de orígenes). */
export interface OrigenCandidatoV2 {
  fuente: 'EXTRACTO' | 'APORTE' | 'PENDIENTE';
  fuenteNombre: string;
  id: number;
  clave: string;
  fecha: any;
  valor: number;
  sentido: 'Entrada' | 'Salida';
  descripcion: string;
  aplicadoHoy: string;
  idEntidad: number | null;
  entidad: string | null;
  relacion: string | null;
  usado: number;
  disponible: number;
  puntaje?: number;
  novedad?: string;
  secuencia?: number;
}

export interface OrigenHechoV2 {
  tipo: TipoOrigen;
  tipoNombre: string;
  idFilaExtracto: number | null;
  idAporte: number | null;
  idLinea: number | null;
  valor: number;
  estabaComo: string | null;
  enRealidadEs: string | null;
  idEntidadAnterior: number | null;
  texto: string | null;
}

export interface HechoV2 {
  codigo: number;
  idPrestamo: number;
  idAsoprep: number | null;
  titular?: string;
  tipo: TipoHecho;
  tipoNombre: string;
  fecha: any;
  valor: number;
  numeroCuota?: number | null;
  texto: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  vigente: boolean;
  usuarioRegistro: string;
  fechaRegistro: any;
  motivoAnulacion: string | null;
  origenes: OrigenHechoV2[];
  resuelve: { idLinea: number; novedad: string; movimiento: number; monto: number; asiento: string | null }[];
  atiende: { idPedido: number; novedad: string; pedido: number }[];
  adjuntos: AdjuntoV2[];
}

export interface CandidatosHechoV2 {
  idPrestamo: number;
  idAsoprep: number | null;
  titular: string;
  valorCuota: number | null;
  lineas: (OrigenCandidatoV2 & { idNovedad: number })[];
  pedidos: { codigo: number; idNovedad: number; novedad: string; secuencia: number; tipoNombre: string; descripcion: string }[];
}

/** Cuerpo para registrar un hecho (HechoCreditoDto del backend). */
export interface HechoEntradaV2 {
  idEmpresa: number;
  idPrestamo: number;
  tipo: TipoHecho;
  fecha: string;
  valor: number;
  idCuota?: number | null;
  texto?: string | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  origenes: { tipo: TipoOrigen; idFilaExtracto?: number | null; idAporte?: number | null; idLinea?: number | null; valor: number; conceptoReal?: string | null; texto?: string | null }[];
  lineas: number[];
  pedidos: number[];
  adjuntos: AdjuntoEntradaV2[];
}
