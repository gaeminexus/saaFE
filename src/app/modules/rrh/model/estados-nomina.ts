import { PeriodoNomina } from './periodo-nomina';

/**
 * Códigos alternos de los detalles de los rubros del motor de nómina.
 *
 * Son identificadores del catálogo, igual que los códigos de rubro: la descripción que ve el
 * usuario sale siempre de `DetalleRubroService`, aquí solo está el código con el que se compara.
 * Ningún importe, porcentaje ni plazo aparece en este archivo.
 */

/** Rubro 182 · estado del período de nómina. */
export class EstadoPeriodo {
  public static readonly ABIERTO = 1;
  public static readonly EN_CALCULO = 2;
  public static readonly CALCULADO = 3;
  public static readonly APROBADO = 4;
  public static readonly CONTABILIZADO = 5;
  public static readonly PAGADO = 6;
  public static readonly CERRADO = 7;
  public static readonly ANULADO = 8;
}

/** Rubro 183 · estado de la nómina de un colaborador. */
export class EstadoNomina {
  public static readonly BORRADOR = 1;
  public static readonly CALCULADA = 2;
  public static readonly APROBADA = 3;
  public static readonly PAGADA = 4;
  public static readonly ANULADA = 5;
  public static readonly EXCLUIDA = 6;
}

/** Rubro 184 · el interruptor de contabilización. */
export class ModoPeriodo {
  public static readonly HISTORICO_SIN_CONTABILIZAR = 1;
  public static readonly PRODUCTIVO_CONTABILIZA = 2;
}

/** Acciones de la barra del período, en el orden en que se recorren. */
export type AccionPeriodo =
  | 'validar'
  | 'calcular'
  | 'aprobar'
  | 'contabilizar'
  | 'contabilizarProvisiones'
  | 'cerrar'
  | 'reabrir';

/**
 * Estados en los que el backend admite cada proceso, **verificados contra su código**, no
 * deducidos de sus mensajes de error.
 *
 * Los mensajes dicen «el periodo debe estar APROBADO» y se quedan cortos en los tres casos: la
 * condición real acepta más estados. Replicar el mensaje deja el botón oculto donde la acción
 * sigue siendo legítima, que es un fallo silencioso —el usuario no puede hacer algo permitido y
 * nada lo explica—.
 *
 * Son listas nombradas y no rangos `>=` a propósito: hoy los estados son consecutivos, pero un
 * estado intercalado en el rubro 182 rompería un rango sin que nada avisara.
 *
 * **Ojo: contabilizar no es la misma lista que las otras dos** — no admite PAGADO.
 */
export const ESTADOS_CONTABILIZA = [EstadoPeriodo.APROBADO, EstadoPeriodo.CONTABILIZADO];

export const ESTADOS_GENERA_ROLES = [
  EstadoPeriodo.APROBADO,
  EstadoPeriodo.CONTABILIZADO,
  EstadoPeriodo.PAGADO,
];

export const ESTADOS_GENERA_ORDEN_PAGO = [
  EstadoPeriodo.APROBADO,
  EstadoPeriodo.CONTABILIZADO,
  EstadoPeriodo.PAGADO,
];

/**
 * Estados en los que previsualizar un asiento tiene sentido.
 *
 * No persiste y funciona en modo histórico, pero **construye las líneas a partir de las nóminas
 * del período**: sobre uno abierto y sin calcular no hay nada que mostrar, y el usuario acaba
 * mirando un diálogo vacío sin entender por qué. Desde CALCULADO ya hay nóminas.
 */
export const ESTADOS_PREVISUALIZA_ASIENTO = [
  EstadoPeriodo.CALCULADO,
  EstadoPeriodo.APROBADO,
  EstadoPeriodo.CONTABILIZADO,
  EstadoPeriodo.PAGADO,
  EstadoPeriodo.CERRADO,
];

/** `true` si el período está en uno de los estados dados. */
export function estadoEn(periodo: PeriodoNomina | null, estados: number[]): boolean {
  if (!periodo) return false;
  return estados.includes(Number(periodo.estado));
}

/**
 * Qué acciones admite el período en su estado actual.
 *
 * La secuencia es validar → calcular → aprobar → contabilizar → cerrar. Reabrir queda
 * disponible mientras no exista asiento del rol: una vez emitido, deshacer el período exigiría
 * reversar contabilidad y eso no se hace desde aquí.
 *
 * En modo histórico `contabilizar` sigue estando disponible: no emite asiento, pero es el paso
 * que mueve el período a CONTABILIZADO para que pueda cerrarse.
 *
 * **Rol y provisiones son dos asientos distintos**, guardados en `PRDNASNT` y `PRDNASPR`, y se
 * emiten por separado. Por eso ambos siguen ofreciéndose en CONTABILIZADO: llegar a ese estado
 * significa que el asiento del rol ya salió, no que el de provisiones también.
 */
export function accionesDisponibles(periodo: PeriodoNomina | null): Set<AccionPeriodo> {
  const acciones = new Set<AccionPeriodo>();
  if (!periodo) return acciones;

  const estado = Number(periodo.estado);

  switch (estado) {
    case EstadoPeriodo.ABIERTO:
    case EstadoPeriodo.EN_CALCULO:
      acciones.add('validar');
      acciones.add('calcular');
      break;
    case EstadoPeriodo.CALCULADO:
      acciones.add('validar');
      acciones.add('calcular');
      acciones.add('aprobar');
      break;
    case EstadoPeriodo.CONTABILIZADO:
    case EstadoPeriodo.PAGADO:
      acciones.add('cerrar');
      break;
  }

  if (estadoEn(periodo, ESTADOS_CONTABILIZA)) {
    acciones.add('contabilizar');
    acciones.add('contabilizarProvisiones');
  }

  // Reabrir: todo menos PAGADO y ANULADO, y sin asiento emitido.
  //
  // **CERRADO sí se reabre**, y excluirlo era el fallo que esta misma clase advierte doce líneas
  // más arriba: replicar el backend de memoria y quedarse corto deja el botón inerte donde la
  // acción es legítima, sin que nada lo explique. `reabrirPeriodo` sólo rechaza PAGADO
  // (`ProcesoNominaServiceImpl:565`) —un período pagado no se toca porque el dinero ya salió—.
  // Y un CERRADO es justo el que hay que poder reabrir: es el estado en el que queda un mes
  // histórico al que después hay que aplicarle una corrección del motor.
  //
  // Corregido el 2026-08-21, al bloquear el recálculo de enero–mayo con el motor corregido.
  const pagado = estado === EstadoPeriodo.PAGADO;
  const anulado = estado === EstadoPeriodo.ANULADO;
  if (!pagado && !anulado && !periodo.asientoRol) {
    acciones.add('reabrir');
  }

  return acciones;
}

/** Un período histórico no emite asiento aunque se pulse contabilizar. */
export function esHistorico(periodo: PeriodoNomina | null): boolean {
  return Number(periodo?.modo) === ModoPeriodo.HISTORICO_SIN_CONTABILIZAR;
}
