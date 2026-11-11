/**
 * C25b — Detector de referencias en los textos de Seguimiento Novedades (hallazgo, resolución, por qué importa, qué se
 * registró, requerimientos, notas, flujo del mes, fichas). Función pura, sin Angular: la usa TextoEnlazadoComponent
 * para partir el texto en segmentos y convertir cada referencia en un enlace. Pruebas: detector-referencias.spec.ts.
 *
 * Tipos (coinciden con GET /nvdd/referencia, salvo NOVEDAD, DECISION y FACTURA, que resuelve la pantalla):
 *   DECISION   D-033, D-015b
 *   ASIENTO    IN-A-2025-06-0053 (y EG-A, DI-A, DIA, CRE, CXP, CXC, RRH, CNT, NOM); "asiento(s) 13295[, 13296 a 13300]";
 *              "(id 13610)"; "(13584)" (código interno entre paréntesis, 5 cifras que empiezan en 1)
 *   NOVEDAD    C-01, B-07, X-04, TABLAS-59 (del mes de contexto); "N-01 de julio [2025]" -> 2025-07/N-01
 *   PRESTAMO   "préstamo(s) 2996[, 3001 y 3002]"
 *   OPERACION  "operación(es) 63031"
 *   ENTIDAD    "entidad(es) 3978", "partícipe 3978"
 *   PAGO       "PGPR 123456", "pago PGPR 123456" ("pagos del préstamo 2996" es el PRÉSTAMO 2996)
 *   COBRO      "cobro(s) [CBCR] 227[ a 243]"
 *   FILA       "fila(s) [del extracto] 1706", "DEXB 1706"
 *   CARGA      "carga [Petro] 352"
 *   CORRIDA    "corrida(s) 48"
 *   EJECUCION  "ejecución 604"
 *   CUENTA     1.4.90.90.05, 2.3.01.10.03, 5.1.90 (código de cuenta con puntos)
 *   EMPLEADO   E09 (referencia del lote de nómina), "empleado 123" (código del SAA)
 *   FACTURA    "factura(s) 577" (la pantalla la abre como CxC en el módulo CXC y como CxP en el resto)
 *
 * Lo que no se enlaza (no hay a dónde llevarlo): órdenes, cheques, códigos de lote del cargador, montos y fechas.
 */

export type TipoReferencia =
  | 'DECISION'
  | 'ASIENTO'
  | 'NOVEDAD'
  | 'PRESTAMO'
  | 'OPERACION'
  | 'ENTIDAD'
  | 'PAGO'
  | 'COBRO'
  | 'FILA'
  | 'CARGA'
  | 'CORRIDA'
  | 'EJECUCION'
  | 'CUENTA'
  | 'EMPLEADO'
  | 'FACTURA';

export interface Referencia {
  tipo: TipoReferencia;
  /** Valor para la ficha: número interno, número de asiento, D-nnn, código de novedad ("C-01" o "2025-07/N-01"). */
  valor: string;
}

export interface Segmento {
  texto: string;
  ref?: Referencia;
}

/** Coincidencia con su posición en el texto original. */
export interface Coincidencia extends Referencia {
  inicio: number;
  fin: number;
}

export interface ContextoReferencias {
  /** Año del mes de contexto (para "N-01 de julio" sin año). */
  anio?: number | null;
}

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

/** Separadores de una lista de números después de la palabra clave: "2996, 3001 y 3002", "13295 a 13300", "304-337". */
const SEP = String.raw`(?:\s*,\s*|\s+y\s+|\s+a\s+|\s*[-–/]\s*)`;

/** Palabra clave + lista de números: cada número de la lista es una referencia del tipo. */
interface ReglaLista {
  tipo: TipoReferencia;
  clave: string; // expresión de la palabra clave (sin grupos de captura)
  digitos: string; // cuántas cifras tiene cada número, p. ej. '\\d{3,5}'
}

const LISTAS: ReglaLista[] = [
  { tipo: 'PAGO', clave: String.raw`(?:pagos?\s+)?PGPR`, digitos: String.raw`\d{1,9}` },
  { tipo: 'PRESTAMO', clave: String.raw`pr[eé]stamos?(?:\s+\(id\))?`, digitos: String.raw`\d{3,6}` },
  { tipo: 'OPERACION', clave: String.raw`operaci(?:[oó]n|ones)`, digitos: String.raw`\d{3,7}` },
  { tipo: 'ENTIDAD', clave: String.raw`(?:entidad(?:es)?|part[ií]cipes?)`, digitos: String.raw`\d{3,6}` },
  { tipo: 'COBRO', clave: String.raw`cobros?(?:\s+(?:CBCR|mixto|de\s+cr[eé]dito))?`, digitos: String.raw`\d{1,7}` },
  { tipo: 'FILA', clave: String.raw`(?:filas?(?:\s+del\s+extracto)?|DEXB)`, digitos: String.raw`\d{1,7}` },
  { tipo: 'CARGA', clave: String.raw`cargas?(?:\s+(?:Petro|PETRO|Arch|ARCH))?`, digitos: String.raw`\d{1,6}` },
  { tipo: 'CORRIDA', clave: String.raw`corridas?`, digitos: String.raw`\d{1,5}` },
  { tipo: 'EJECUCION', clave: String.raw`ejecuci(?:[oó]n|ones)`, digitos: String.raw`\d{1,6}` },
  { tipo: 'ASIENTO', clave: String.raw`asientos?(?:\s+(?:c[oó]digo|interno|ASNTCDGO))?`, digitos: String.raw`\d{4,7}` },
  { tipo: 'EMPLEADO', clave: String.raw`empleados?`, digitos: String.raw`\d{1,6}` },
  { tipo: 'FACTURA', clave: String.raw`facturas?`, digitos: String.raw`(?:\d{3}-\d{3}-\d{1,9}|\d{1,9})` },
];

const RE_NUMERO_ASIENTO = /\b(?:IN-A|EG-A|DI-A|DIA|CRE|CXP|CXC|RRH|CNT|NOM)-\d{4}-\d{2}-\d{4}\b/g;
const RE_DECISION = /\bD-\d{3}b?\b/g;
const RE_NOVEDAD = /\b(TABLAS-59|[CABKXRNE]-\d{2})(?![\d-])(?:\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+(?:de\s+)?(\d{4}))?)?/gi;
const RE_CUENTA = /(?<![\d.,])\d\.\d(?:\.\d{2}){1,4}(?![\d,]|\.\d)/g;
const RE_ID_ASIENTO = /\((?:id\s+)?(1\d{4})\)/g;
const RE_EMPLEADO_REF = /\bE\d{2}\b(?!-)/g;

function agregar(out: Coincidencia[], c: Coincidencia): void {
  out.push(c);
}

/**
 * Todas las coincidencias del texto, sin solapes (gana la que empieza antes; a igual inicio, la más larga), en orden.
 */
export function buscarReferencias(texto: string | null | undefined, ctx: ContextoReferencias = {}): Coincidencia[] {
  if (!texto) return [];
  const t = String(texto);
  const out: Coincidencia[] = [];

  for (const m of t.matchAll(RE_NUMERO_ASIENTO)) agregar(out, { tipo: 'ASIENTO', valor: m[0], inicio: m.index!, fin: m.index! + m[0].length });
  for (const m of t.matchAll(RE_DECISION)) agregar(out, { tipo: 'DECISION', valor: m[0], inicio: m.index!, fin: m.index! + m[0].length });
  for (const m of t.matchAll(RE_NOVEDAD)) {
    const codigo = m[1].toUpperCase();
    // "A-2025" no es novedad: el lookahead ya lo descarta; "IN-A-..." tampoco (lo toma RE_NUMERO_ASIENTO antes).
    let valor = codigo;
    if (m[2]) {
      const mes = MESES[m[2].toLowerCase()];
      const anio = m[3] ? Number(m[3]) : ctx.anio;
      if (anio) valor = `${anio}-${String(mes).padStart(2, '0')}/${codigo}`;
    }
    agregar(out, { tipo: 'NOVEDAD', valor, inicio: m.index!, fin: m.index! + m[0].length });
  }
  for (const m of t.matchAll(RE_CUENTA)) agregar(out, { tipo: 'CUENTA', valor: m[0], inicio: m.index!, fin: m.index! + m[0].length });
  for (const m of t.matchAll(RE_ID_ASIENTO)) {
    const ini = m.index! + m[0].indexOf(m[1]);
    agregar(out, { tipo: 'ASIENTO', valor: m[1], inicio: ini, fin: ini + m[1].length });
  }
  for (const m of t.matchAll(RE_EMPLEADO_REF)) agregar(out, { tipo: 'EMPLEADO', valor: m[0], inicio: m.index!, fin: m.index! + m[0].length });

  for (const r of LISTAS) {
    // un número de la lista no puede seguir con cifras ni ser parte de un monto ("175,10") o de una cuenta
    const num = String.raw`${r.digitos}(?!\d|[.,]\d)`;
    const re = new RegExp(String.raw`(?<![\p{L}\d])(${r.clave})\s+(?:n\.?[º°]\s*)?((?<![\d.,])${num}(?:${SEP}${num})*)`, 'giu');
    for (const m of t.matchAll(re)) {
      const inicioLista = m.index! + m[0].length - m[2].length;
      for (const n of m[2].matchAll(new RegExp(num, 'g'))) {
        const ini = inicioLista + n.index!;
        // la primera referencia de la lista lleva la palabra clave dentro del enlace ("préstamo 2996")
        const desde = n.index === 0 ? m.index! : ini;
        agregar(out, { tipo: r.tipo, valor: n[0], inicio: desde, fin: ini + n[0].length });
      }
    }
  }

  out.sort((a, b) => a.inicio - b.inicio || b.fin - b.inicio - (a.fin - a.inicio));
  const limpio: Coincidencia[] = [];
  let hasta = -1;
  for (const c of out) {
    if (c.inicio >= hasta) {
      limpio.push(c);
      hasta = c.fin;
    }
  }
  return limpio;
}

/** Parte el texto en segmentos: texto plano y referencias (enlaces). La concatenación de los segmentos es el texto. */
export function segmentarReferencias(texto: string | null | undefined, ctx: ContextoReferencias = {}): Segmento[] {
  if (!texto) return [];
  const t = String(texto);
  const out: Segmento[] = [];
  let pos = 0;
  for (const c of buscarReferencias(t, ctx)) {
    if (c.inicio > pos) out.push({ texto: t.slice(pos, c.inicio) });
    out.push({ texto: t.slice(c.inicio, c.fin), ref: { tipo: c.tipo, valor: c.valor } });
    pos = c.fin;
  }
  if (pos < t.length) out.push({ texto: t.slice(pos) });
  return out;
}

/** Tipo de referencia del requerimiento (RQNVTPRF) al tipo de la ficha; null si no hay a dónde llevarlo. */
export function tipoDeReferenciaRequerimiento(tipoReferencia: string | null | undefined): TipoReferencia | null {
  switch ((tipoReferencia || '').toUpperCase()) {
    case 'PRESTAMO':
      return 'PRESTAMO';
    case 'OPERACION':
      return 'OPERACION';
    case 'ENTIDAD':
      return 'ENTIDAD';
    case 'FILA_EXTRACTO':
      return 'FILA';
    case 'CARGA':
      return 'CARGA';
    case 'EMPLEADO':
      return 'EMPLEADO';
    case 'FACTURA':
      return 'FACTURA';
    default:
      return null; // ORDEN, CHEQUE, OTRO: no hay registro del SAA que abrir por ese número
  }
}
