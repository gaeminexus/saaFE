import { TipoOperacionCobro } from './catalogos-cobro';

/**
 * `GET /cbcr/seguimiento?desde=&hasta=` (docs/crd/API-SEGUIMIENTO-COBROS.md §3). Fila de solo
 * lectura, YA armada por el backend con toda la huella del circuito de un cobro — no hay que
 * recomponerla desde `CobroCredito` ni desde `RespuestaCobroCreditoDetalle`.
 *
 * ⚠️ `nombreEstado` lo resuelve el backend con el mismo texto de `textoEstado(...)`
 * (`CobroCreditoServiceImpl`) — no traducir `estado` de nuevo acá: hoy hay dos catálogos de estado
 * en la app y una segunda traducción es cómo se desincronizan.
 *
 * ⚠️ `horasHastaAprobacion`/`horasHastaProceso`: `null` cuando esa etapa NO ocurrió — nunca `0`,
 * que se confundiría con "fue inmediato". Es el dato que dice dónde se corta el circuito.
 *
 * ⚠️ Fechas: `fechaCobro` es `LocalDate` → `yyyy-MM-dd`. El resto son `LocalDateTime` → ISO local
 * SIN zona (Jackson descarta el offset en vez de convertirlo). Normalizar siempre con
 * `FuncionesDatosService.convertirFechaDesdeBackend()`.
 *
 * Los tres asientos viajan como `numeroAlterno` (legible), no como PK; `null` si esa etapa no
 * generó asiento.
 */
export interface FilaSeguimientoCobro {
  idCobro: number;
  tipoOperacion: TipoOperacionCobro;
  estado: number;
  nombreEstado: string;
  fechaCobro: string | number[] | Date;
  referencia: string;
  valor: number;

  idEntidad: number;
  participe: string;
  identificacion: string;

  cuentaBancaria: string;

  usuarioRegistro: string | null;
  fechaRegistro: string | number[] | Date | null;
  usuarioAprobacion: string | null;
  fechaAprobacion: string | number[] | Date | null;
  usuarioRechazo: string | null;
  fechaRechazo: string | number[] | Date | null;
  motivoRechazo: string | null;
  usuarioProceso: string | null;
  fechaProceso: string | number[] | Date | null;
  usuarioAnulacion: string | null;
  fechaAnulacion: string | number[] | Date | null;
  motivoAnulacion: string | null;
  usuarioReverso: string | null;
  fechaReverso: string | number[] | Date | null;
  motivoReverso: string | null;
  numeroReversos: number;

  /** Horas de `fechaRegistro` a `fechaAprobacion`. `null` si esa etapa no ocurrió. */
  horasHastaAprobacion: number | null;
  /** Horas de `fechaAprobacion` a `fechaProceso`. `null` si esa etapa no ocurrió. */
  horasHastaProceso: number | null;

  rutaRespaldo: string | null;
  tieneRespaldo: boolean;

  /** `numeroAlterno` del asiento (p. ej. `CRE-2026-08-0421`), no el PK. `null` si no se generó. */
  asientoTransitorio: string | null;
  asientoReparto: string | null;
  asientoDefinitivo: string | null;
}

/** Una etapa de la línea de tiempo Ingresado → Aprobado → Procesado, para la fila expandida. */
export interface EtapaSeguimientoCobro {
  nombre: string;
  icono: string;
  usuario: string | null;
  fecha: string | number[] | Date | null;
  /** Horas desde la etapa anterior. `null` = etapa aún no ocurrida (se muestra vacía, no ausente). */
  duracionHoras: number | null;
  ocurrio: boolean;
}
