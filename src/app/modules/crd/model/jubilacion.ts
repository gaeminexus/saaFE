import { MovimientoAporte } from './pagos/respuesta-pago';

/**
 * Traslado de jubilación — `POST /rest/aprt/procesarJubilacion` (verificado contra
 * `SolicitudProcesarJubilacion.java`/`ResultadoJubilacion.java`/`AporteRest.java` en saaBE).
 *
 * ⚠️ Este endpoint NO orquesta nada: solo traslada lo que quede de cesantía/jubilación a pensión
 * complementaria y cambia el estado del partícipe. El cruce contra préstamos
 * (`POST /rest/prst/pagarConAportes`) y la devolución en efectivo (`POST /rest/dvap/registrar`)
 * son decisiones previas y opcionales que hay que llamar ANTES de este endpoint, con lo que haya
 * quedado del saldo — si se llama primero, traslada todo y no queda nada para cruzar o devolver.
 */
export interface SolicitudProcesarJubilacion {
  idEntidad: number;
  usuario: string;
  /** `yyyy-MM-dd`. Si se omite el backend usa hoy; no puede ser futura. */
  fecha?: string | null;
  /**
   * Empresa contable (SCP.PJRQ) sobre la que se genera el asiento. Obligatorio — agregado cuando
   * se desbloqueó la plantilla 29 y el endpoint pasó a generar asiento (antes no lo pedía).
   */
  idEmpresa: number;
}

/**
 * `numeroAsiento` viene `null` mientras la contabilidad de este proceso esté bloqueada esperando
 * la definición de la plantilla — no es un error ni "sin asiento": simplemente no se muestra.
 */
export interface ResultadoJubilacion {
  idEntidad: number;
  fecha: string | number[] | Date;
  /** 0 si no tenía saldo de cesantía. */
  valorCesantiaTrasladado: number;
  /** 0 si no tenía saldo de jubilación. */
  valorJubilacionTrasladado: number;
  /** Suma de los dos anteriores — lo que entró a pensión complementaria. */
  valorTotalTrasladado: number;
  /** Hasta dos negativos (cesantía/jubilación, solo los que tenían saldo) y uno positivo (pensión complementaria). */
  movimientos: MovimientoAporte[];
  estadoNuevo: number;
  numeroAsiento: number | null;
}

/**
 * Mismo estilo de sobre que `RespuestaPago`/`RespuestaDevolucion`: éxito con `exito: true` y
 * `resultado`; fallo con `exito: false`, `mensaje` y `error` (código estable cuando el backend lo
 * da — `PARAMETRO_INVALIDO`, `ENTIDAD_NO_ENCONTRADA`, `ESTADO_NO_ELEGIBLE`, `FECHA_INVALIDA`).
 */
export interface RespuestaJubilacion<T = unknown> {
  exito: boolean;
  etapa?: string;
  mensaje?: string;
  error?: string;
  resultado?: T;
  httpStatus?: number;
}
