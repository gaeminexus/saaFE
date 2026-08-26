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

/**
 * Por qué una acción está deshabilitada, o `null` si no lo está.
 *
 * No es una segunda fuente de verdad: se apoya en `accionesDisponibles`, que sigue siendo quien
 * decide qué se puede pulsar. Esto sólo pone en palabras la razón, para el botón gris y mudo que
 * hoy le cuesta una llamada a Steven cada vez.
 */
export function motivoBloqueado(periodo: PeriodoNomina | null, accion: AccionPeriodo): string | null {
  if (!periodo) return null;
  if (accionesDisponibles(periodo).has(accion)) return null;

  const estado = Number(periodo.estado);

  switch (accion) {
    case 'validar':
    case 'calcular':
      return 'Requiere el período Abierto o En cálculo.';
    case 'aprobar':
      return 'Requiere el período Calculado.';
    case 'contabilizar':
    case 'contabilizarProvisiones':
      return 'Requiere el período Aprobado, o ya Contabilizado si falta el asiento de provisiones.';
    case 'cerrar':
      return 'Requiere el período Contabilizado o Pagado.';
    case 'reabrir':
      if (estado === EstadoPeriodo.PAGADO) return 'Un período Pagado no se reabre: el dinero ya salió.';
      if (estado === EstadoPeriodo.ANULADO) return 'Un período Anulado no se reabre.';
      if (periodo.asientoRol) {
        return 'Ya tiene un asiento del rol emitido; reabrir exigiría reversar contabilidad primero.';
      }
      return null;
    default:
      return null;
  }
}

/**
 * Estado con forma, no sólo con texto — D19/D24 otra vez, aquí para el rubro 182.
 *
 * Sin colores literales: son las clases que ya trae `_pantalla-rrh.scss` (`.pill`, `.chip`) más
 * las nuevas de este archivo, para que la hoja de estilos sea la única que decide el color real.
 */
export function claseEstado(estado: number | null | undefined): string {
  switch (Number(estado)) {
    case EstadoPeriodo.ABIERTO:
      return 'estado-abierto';
    case EstadoPeriodo.EN_CALCULO:
      return 'estado-en-calculo';
    case EstadoPeriodo.CALCULADO:
      return 'estado-calculado';
    case EstadoPeriodo.APROBADO:
      return 'estado-aprobado';
    case EstadoPeriodo.CONTABILIZADO:
      return 'estado-contabilizado';
    case EstadoPeriodo.PAGADO:
      return 'estado-pagado';
    case EstadoPeriodo.CERRADO:
      return 'estado-cerrado';
    case EstadoPeriodo.ANULADO:
      return 'estado-anulado';
    default:
      return 'estado-desconocido';
  }
}

/** Ícono por estado, para leerlo de un vistazo antes que el texto. */
export function iconoEstado(estado: number | null | undefined): string {
  switch (Number(estado)) {
    case EstadoPeriodo.ABIERTO:
      return 'edit_note';
    case EstadoPeriodo.EN_CALCULO:
      return 'hourglass_top';
    case EstadoPeriodo.CALCULADO:
      return 'calculate';
    case EstadoPeriodo.APROBADO:
      return 'how_to_reg';
    case EstadoPeriodo.CONTABILIZADO:
      return 'receipt_long';
    case EstadoPeriodo.PAGADO:
      return 'paid';
    case EstadoPeriodo.CERRADO:
      return 'lock';
    case EstadoPeriodo.ANULADO:
      return 'cancel';
    default:
      return 'help_outline';
  }
}
