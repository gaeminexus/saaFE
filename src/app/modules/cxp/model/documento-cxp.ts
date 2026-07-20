// Documento único por clave de acceso SRI — endpoint: /dcxp

import { Empresa } from "../../../shared/model/empresa";

// Tabla PGS.DCXP — UN solo registro por documento (por claveAcceso)
export interface DocumentoCxp {
  id: number;
  empresa: Empresa;
  claveAcceso: string;               // UNIQUE — clave SRI del documento
  rucEmisor: string;
  razonSocialEmisor: string;
  tipoComprobante: string;           // Factura / Nota de Crédito / etc.
  serieComprobante: string;          // Ej: 001-001-000000123
  fechaAutorizacion: string;         // ISO LocalDateTime
  fechaEmision: string;              // YYYY-MM-DD
  valorSinImpuestos: number;
  iva: number;
  importeTotal: number;
  // Estado: 1=LEIDO 2=XML_CARGADO 3=REGISTRADO_BD 4=ERROR 5=NOVEDAD 6=REVERTIDO
  estadoDocumento: number;
  pathXml: string;
  idDocumentoBD: number;
  tipoTablaDestino: string;          // FACTURA_COMPRA / NOTA_CREDITO_COMPRA / etc.
  novedad: string;                   // Descripción de diferencias detectadas
  // Estado novedad: 1=PENDIENTE 2=REEMPLAZADO 3=MANTENIDO
  estadoNovedad: number;
  fechaRegistroBD: string;
  usuarioRegistroBD: number;
  fechaCargaXml: string;
  usuarioCargaXml: number;
  fechaReversion: string;
  usuarioReversion: number;
}
