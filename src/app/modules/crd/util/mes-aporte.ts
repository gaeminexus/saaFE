import { Aporte } from '../model/aporte';

export interface MesAporte {
  /** «MM/AAAA» */
  texto: string;
  /** true = el aporte no tiene `periodoDevengo` y se usó el mes de caja (`fechaTransaccion`). */
  porCaja: boolean;
  /** AAAAMM, para ordenar. */
  clave: number;
}

/**
 * Año y mes de una fecha que llega como arreglo de Jackson `[2026,7,1]`, texto ISO
 * (`"2026-07-01"` o con hora), `Date` o timestamp. No pasa por `new Date(texto)`: un ISO de
 * solo fecha se interpreta en UTC y en Ecuador cae al día (y mes) anterior.
 */
function anioMes(valor: unknown): { anio: number; mes: number } | null {
  if (!valor) return null;
  if (Array.isArray(valor)) {
    const [anio, mes] = valor;
    return anio && mes ? { anio, mes } : null;
  }
  if (typeof valor === 'string') {
    const m = /^(\d{4})-(\d{2})/.exec(valor.trim());
    return m ? { anio: +m[1], mes: +m[2] } : null;
  }
  const fecha = valor instanceof Date ? valor : typeof valor === 'number' ? new Date(valor) : null;
  return fecha && !isNaN(fecha.getTime()) ? { anio: fecha.getFullYear(), mes: fecha.getMonth() + 1 } : null;
}

/**
 * Mes del aporte: `periodoDevengo` (APRTPRDV) y, si es null (aportes anteriores al 27-08), el mes
 * de `fechaTransaccion` (mismo criterio que cartera: NVL(APRTPRDV, mes de APRTFCTR)).
 * null solo si tampoco hay fecha de caja válida.
 */
export function mesDevengoAporte(aporte: Pick<Aporte, 'periodoDevengo' | 'fechaTransaccion'>): MesAporte | null {
  const devengo = anioMes(aporte.periodoDevengo);
  const am = devengo ?? anioMes(aporte.fechaTransaccion);
  if (!am) return null;
  return {
    texto: `${String(am.mes).padStart(2, '0')}/${am.anio}`,
    porCaja: !devengo,
    clave: am.anio * 100 + am.mes,
  };
}
