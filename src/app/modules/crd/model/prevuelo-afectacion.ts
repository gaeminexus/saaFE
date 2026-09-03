/**
 * `GET /rest/asgn/prevueloAfectacion` (`docs/crd/VALIDACION-TOPE-AFECTACION-MANUAL.md` §9 y §14).
 * Solo lectura, informa — corre la MISMA validación que bloquea al procesar
 * (`validarTopeAfectacionManualPorParticipe`), pero en seco y sobre toda la carga, ANTES de que el
 * operador termine de repartir. No bloquea nada: el operador decide si corrige o procesa igual — la
 * que impide aplicar sigue siendo la validación del proceso.
 *
 * ⛔ Alcance, y hay que decirlo en pantalla: solo ve exceso/faltante de afectaciones MANUALES. No
 * proyecta lo que el flujo automático aplicará encima del tope manual, porque eso todavía no ocurrió.
 *
 * Dos listas SEPARADAS, nunca combinadas en una sola con signo (§14): son dos acciones opuestas
 * para el operador — a `detalle` (excesos) hay que BAJARLE la afectación, a `detalleFaltante` hay
 * que SUBÍRSELA/completarla. Los faltantes no bloquean el proceso al arrancar (es válido por
 * diseño), pero SÍ hacen fallar la red final después de los 20+ minutos — es la lista que evita
 * esperar el proceso completo para enterarse de algo visible desde antes de arrancar.
 */
export interface PrevueloAfectacionCarga {
  idCarga: number;
  participesConExceso: number;
  excesoTotal: number;
  detalle: PrevueloParticipeExceso[];
  participesConFaltante: number;
  faltanteTotal: number;
  detalleFaltante: PrevueloParticipeFaltante[];
}

export interface PrevueloParticipeExceso {
  codigoPetro: number;
  cedula: string;
  participe: string;
  disponible: number;
  afectado: number;
  exceso: number;
  /** Códigos AVPC (`AfectacionValoresParticipeCarga`) involucrados en el exceso de este partícipe. */
  avpc: number[];
  /** Texto del backend, tal cual — nunca redactar uno propio (§14: debe leerse igual acá y en el error del proceso). */
  mensaje: string;
}

/**
 * Misma forma que `PrevueloParticipeExceso`, pero `faltante` en vez de `exceso` (§14). Solo
 * incluye partícipes que YA tienen alguna afectación manual — si no tiene ninguna, el flujo
 * automático se encarga de todo el pozo y no falta nada (el backend filtra esos, no el FE).
 */
export interface PrevueloParticipeFaltante {
  codigoPetro: number;
  cedula: string;
  participe: string;
  disponible: number;
  afectado: number;
  faltante: number;
  avpc: number[];
  /** Texto del backend, tal cual — nunca redactar uno propio. */
  mensaje: string;
}
