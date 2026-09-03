/**
 * `GET /rest/asgn/prevueloAfectacion` (`docs/crd/VALIDACION-TOPE-AFECTACION-MANUAL.md` §9). Solo
 * lectura, informa — corre la MISMA validación que bloquea al procesar
 * (`validarTopeAfectacionManualPorParticipe`), pero en seco y sobre toda la carga, ANTES de que el
 * operador termine de repartir. No bloquea nada: el operador decide si corrige o procesa igual — la
 * que impide aplicar sigue siendo la validación del proceso.
 *
 * ⛔ Alcance, y hay que decirlo en pantalla: solo ve el exceso de afectaciones MANUALES. No proyecta
 * lo que el flujo automático aplicará encima del tope manual, porque eso todavía no ocurrió.
 */
export interface PrevueloAfectacionCarga {
  idCarga: number;
  participesConExceso: number;
  excesoTotal: number;
  detalle: PrevueloParticipeExceso[];
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
}
