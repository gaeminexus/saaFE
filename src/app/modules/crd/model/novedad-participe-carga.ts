import { ParticipeXCargaArchivo } from "./participe-x-carga-archivo";

/**
 * Clasificación que decide si la novedad bloquea el proceso del archivo (docs/crd/API-FAMILIA-NOVEDADES-CARGA.md,
 * contrato congelado). `READ_ONLY` en el backend: nunca se manda en un PUT/POST, el servidor la ignora.
 *
 * NO se deriva del signo de `montoDiferencia` en el cliente — `BLOQUEANTE` incluye los casos con
 * `montoDiferencia: null` (préstamo/cuota/producto no encontrado). Es la MISMA función que usa el
 * backend para decidir si la carga se detiene; reimplementar el criterio acá diverge con el tiempo.
 */
export type FamiliaNovedadCarga = 'BLOQUEANTE' | 'COBRANZA' | 'INFORMATIVA';

export interface NovedadParticipeCarga {
  codigo: number;
  participeXCargaArchivo: ParticipeXCargaArchivo;
  codigoCargaArchivo: number | null;
  tipoNovedad: number;
  descripcion: string;
  codigoProducto: number | null;
  codigoPrestamo: number | null;
  idAsoprepPrestamo: number | null;
  codigoCuota: number | null;
  montoEsperado: number | null;
  montoRecibido: number | null;
  montoDiferencia: number | null;
  estado: number;
  /** Ausente/`null` = el servidor no la mandó donde se esperaba — NO derivar del signo, reportarlo. */
  familia: FamiliaNovedadCarga | null;
}
