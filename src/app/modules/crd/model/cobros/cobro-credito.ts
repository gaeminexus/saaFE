import { CuentaBancaria } from '../../../tsr/model/cuenta-bancaria';
import { Entidad } from '../entidad';
import { Prestamo } from '../prestamo';
import { TipoAporte } from '../tipo-aporte';
import { TipoFilaBandejaAprobacion, TipoOperacionCobro } from './catalogos-cobro';

/**
 * Modelos del circuito de cobros de crédito con aprobación de contabilidad (`CRD.CBCR`).
 * Contrato congelado: docs/crd/API-COBROS-APROBACION-CONTABILIDAD.md.
 *
 * ⚠️ No agregar campos a los `Solicitud*` que no estén en el contrato: `FAIL_ON_UNKNOWN_PROPERTIES`
 * está activo y una clave de más devuelve HTTP 400 "Not able to deserialize data provided" antes
 * de entrar al método — no es un error de negocio, es un bug de cliente.
 */

// ══════════════ Detalle (líneas del cobro) ══════════════

export interface DetalleCobroCredito {
  idPrestamo?: number | null;
  valor: number;
  /** Solo `ABONO_CAPITAL`, obligatoria ahí; rechazada en todos los demás tipos. */
  modalidad?: number | null;
  /** Solo `REGISTRO_APORTE`/`COBRO_MIXTO`. En `COBRO_MIXTO`, XOR con `idPrestamo` en cada línea. */
  idTipoAporte?: number | null;
  /** Solo `REGISTRO_APORTE`/`COBRO_MIXTO`. `yyyy-MM-dd`, primer día del mes. */
  periodoDevengo?: string | null;
  observacion?: string | null;
}

// ══════════════ POST /cbcr/registrar ══════════════

export interface SolicitudRegistroCobro {
  idEntidad: number;
  tipoOperacion: TipoOperacionCobro;
  /** TSR.CNBC: cuenta de la institución donde ENTRÓ el dinero. */
  idCuentaBancaria: number;
  referencia: string;
  rutaRespaldo: string;
  valor: number;
  /** `yyyy-MM-dd`, `LocalDate`. */
  fecha: string;
  observacion?: string | null;
  usuario: string;
  detalles: DetalleCobroCredito[];
}

/** HTTP 201. */
export interface ResultadoRegistroCobro {
  idCobro: number;
  estado: number;
  valor: number;
  /** Si es `false`, los dos campos de asiento vienen `null`. */
  contabilidadActiva: boolean;
  idAsientoTransitorio: number | null;
  numeroAsientoTransitorio: number | null;
  mensaje: string;
}

// ══════════════ POST /cbcr/{id}/aprobar · rechazar · anular ══════════════

export interface SolicitudAprobacionCobro {
  usuario: string;
  /** Obligatorio en `rechazar` y `anular`; se ignora en `aprobar` y `procesar`. */
  motivo?: string | null;
}

// ══════════════ POST /cbcr/{id}/reenviar ══════════════

/**
 * Mismos campos editables del registro, MÁS `usuario`. NO lleva `idEntidad` ni `tipoOperacion`:
 * esos no se cambian — se anula el cobro y se registra uno nuevo si hace falta cambiarlos.
 */
export interface SolicitudEdicionCobro {
  idCuentaBancaria: number;
  referencia: string;
  rutaRespaldo: string;
  valor: number;
  fecha: string;
  observacion?: string | null;
  detalles: DetalleCobroCredito[];
  usuario: string;
}

// ══════════════ POST /cbcr/{id}/procesar ══════════════

/**
 * HTTP 200 SIEMPRE, incluso cuando NO se procesó nada: `procesado: false` con `estado: 4`
 * (RECHAZADO) es el rechazo automático por staleness (el monto ya no coincide con el préstamo
 * porque alguien pagó algo en el medio). Ramificar por `procesado`, NUNCA por el código HTTP.
 */
export interface ResultadoProcesoCobro {
  idCobro: number;
  estado: number;
  procesado: boolean;
  mensaje: string;
}

// ══════════════ Lectura: GET /cbcr/getAll · getId · bandeja · porEntidad ══════════════

/**
 * Entidad `CobroCredito` serializada directa (sin capa de DTO) — es lo que devuelven `getAll`,
 * `bandeja/{estado}` y `porEntidad/{id}`. ⚠️ NUNCA trae las líneas de detalle: `detalles` queda
 * siempre `undefined` en estos tres endpoints (no es un campo con otro nombre, directamente no
 * viaja). Para el detalle línea por línea hay que pedir `getId/{id}` aparte — ver
 * `RespuestaCobroCreditoDetalle` más abajo, que es la única lectura que SÍ lo trae.
 */
export interface CobroCredito {
  codigo: number;
  entidad: Entidad;
  tipoOperacion: TipoOperacionCobro;
  estado: number;
  cuentaBancaria: CuentaBancaria;
  referencia: string;
  rutaRespaldo: string;
  valor: number;
  /** `LocalDate` → string `yyyy-MM-dd` (o array `[y,m,d]` según cómo serialice Jackson este endpoint). */
  fecha: string | number[] | Date;
  observacion: string | null;
  /** ⚠️ Siempre `undefined` viniendo de `getAll`/`bandeja`/`porEntidad` — ver el comentario de la interfaz. */
  detalles?: DetalleCobroCredito[];

  motivoRechazo: string | null;
  motivoAnulacion: string | null;
  asientoTransitorio: number | null;
  asientoDefinitivo: number | null;

  // Traza — LocalDateTime, ISO local SIN zona. El contrato dice "seis pares" pero solo nombra
  // cinco (registro/aprobación/rechazo/proceso/anulación); se tipan todos opcionales por las dudas.
  usuarioRegistro?: string | null;
  fechaRegistro?: string | number[] | Date | null;
  usuarioAprobacion?: string | null;
  fechaAprobacion?: string | number[] | Date | null;
  usuarioRechazo?: string | null;
  fechaRechazo?: string | number[] | Date | null;
  usuarioProceso?: string | null;
  fechaProceso?: string | number[] | Date | null;
  usuarioAnulacion?: string | null;
  fechaAnulacion?: string | number[] | Date | null;
}

/**
 * Una línea del detalle en LECTURA (`GET .../getId/{id}`) — objetos completos, no solo ids como en
 * `DetalleCobroCredito` (el de escritura). `prestamo` XOR `tipoAporte` según el tipo de línea, igual
 * que en la escritura de `COBRO_MIXTO`/`REGISTRO_APORTE`.
 */
export interface DetalleCobroCreditoLectura {
  codigo?: number;
  prestamo?: Prestamo | null;
  tipoAporte?: TipoAporte | null;
  /** `LocalDate` → string `yyyy-MM-dd` (o array `[y,m,d]`). Solo en líneas de aporte. */
  periodoDevengo?: string | number[] | Date | null;
  valor: number;
  /** Solo en la línea de un `ABONO_CAPITAL`. */
  modalidad?: number | null;
  eventoPrestamo?: { codigo: number } | null;
  pagoAporte?: { codigo: number } | null;
  acuerdoCondonacion?: { codigo: number } | null;
}

/**
 * `GET /cbcr/getId/{id}`. ⚠️ NO es un `CobroCredito` directo — viene envuelto, porque
 * `CobroCredito` no tiene el detalle mapeado como relación y el backend lo arma aparte. Confundirlo
 * con `CobroCredito` deja `rutaRespaldo` en `undefined` y el detalle vacío, sin ningún error
 * (defecto real, reportado el 2026-08-30 — docs/crd/API-COBROS-APROBACION-CONTABILIDAD.md §4).
 */
export interface RespuestaCobroCreditoDetalle {
  cabecera: CobroCredito;
  detalle: DetalleCobroCreditoLectura[];
}

// ══════════════ GET /cbcr/bandejaAprobacion ══════════════

/**
 * Fila DELIBERADAMENTE POBRE: cobro de crédito y carga Petro no comparten modelo, así que la fila
 * solo lleva lo que las dos tienen en común. NO trae `rutaRespaldo`, `referencia`, `cuentaBancaria`
 * ni `tipoOperacion` — para el detalle hay que pedir `GET /cbcr/getId/{id}` (si `tipo` es
 * `COBRO_CREDITO`) al abrir la fila. `id` es el código en la tabla propia de cada tipo (CBCR o
 * CRAR) — NO son el mismo espacio de códigos, nunca mezclar entre tipos.
 */
export interface FilaBandejaAprobacion {
  tipo: TipoFilaBandejaAprobacion;
  id: number;
  /** Nombre del partícipe (cobro) o de la filial (carga Petro). */
  descripcion: string;
  valor: number;
  usuarioRegistro: string;
  /** `LocalDateTime` ISO local sin zona. */
  fechaRegistro: string | number[] | Date;
}
