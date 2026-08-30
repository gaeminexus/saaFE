import { CuentaBancaria } from '../../../tsr/model/cuenta-bancaria';
import { Entidad } from '../entidad';
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
  /** Solo `REGISTRO_APORTE`. */
  idTipoAporte?: number | null;
  /** Solo `REGISTRO_APORTE`. `yyyy-MM-dd`, primer día del mes. */
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
 * Entidad `CobroCredito` serializada directa (sin capa de DTO). El contrato no confirma el nombre
 * exacto del campo de detalle en la lectura (el de escritura es `detalles`, plural) — se tipa como
 * `detalles?` opcional y se ajusta contra la respuesta real la primera vez que se vea en vivo.
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
