/**
 * Firma electrónica del contrato de adhesión (Security Data). Contrato:
 * saaBE docs/logica-negocio/crd/API-FIRMA-ELECTRONICA-CONTRATO.md.
 * Fechas: LocalDateTime de Jackson (arreglo); se leen con FuncionesDatosService.convertirFechaDesdeBackend().
 */

/** `firma.estado` del trámite (CRD.FRCN). */
export const ESTADO_FIRMA = {
  PENDIENTE_ENVIO: 1,
  ENVIADO: 2,
  FIRMADO: 3,
  RECHAZADO: 4,
  VENCIDO: 5,
  ANULADO: 6,
} as const;

export interface FirmaContrato {
  codigo: number;
  idContrato: number;
  proveedor: string;
  idExterno: string | null;
  estado: number;
  idAdjuntoOriginal: number | null;
  idAdjuntoFirmado: number | null;
  hash: string | null;
  fechaEnvio: unknown;
  fechaFirma: unknown;
  fechaUltimaConsulta: unknown;
  error: string | null;
  fechaRegistro: unknown;
  usuarioRegistro: string | null;
  fechaAnulacion: unknown;
  usuarioAnulacion: string | null;
  motivoAnulacion: string | null;
}

/** Foto del partícipe tal como se envió (CRD.FRFR). Solo lectura: el SAA no gestiona firmantes. */
export interface FirmanteContrato {
  codigo: number;
  idFirma: number;
  orden: number;
  rol: string;
  identificacion: string | null;
  nombre: string | null;
  correo: string | null;
  celular: string | null;
  idEntidad: number | null;
  estado: number;
  fechaFirma: unknown;
  idExterno: string | null;
}

export interface TramiteFirma {
  firma: FirmaContrato;
  firmantes: FirmanteContrato[];
}

/** Cuerpo de enviar/reintentar/actualizar/anular, tanto en 2xx como en 4xx/502. */
export interface RespuestaFirma {
  exito: boolean;
  mensaje: string | null;
  error: string | null;
  tramite?: TramiteFirma | null;
}
