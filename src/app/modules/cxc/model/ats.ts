/**
 * ATS (Anexo Transaccional Simplificado) — `com.saa.ejb.sri.AtsRest` en saaBE. Contrato
 * confirmado contra docs/logica-negocio/sri/LEVANTAMIENTO-ATS-103-104.md §10.2 en saaBE y contra
 * `ResultadoGeneracionAts.java` directamente (el doc no traía el DTO completo).
 *
 * El ZIP NUNCA se validó contra el validador oficial del SRI (§10.1 en saaBE) — mostrar siempre
 * un aviso de revisarlo ahí antes de presentar, además de `avisos`.
 */
export interface GenerarAtsRequest {
  idFacturador: number;
  anio: number;
  mes: number;
}

/**
 * `avisos` no es opcional de leer: son los campos que el generador no pudo resolver (catálogos
 * del SRI sin verificar, datos faltantes en el titular/documento) — revisar siempre antes de
 * enviar el ZIP.
 */
export interface ResultadoGeneracionAts {
  nombreArchivo: string;
  /** Contenido del ZIP en base64 — no llega como octet-stream, hay que decodificarlo para descargar. */
  contenidoBase64: string;
  tamanoBytes: number;
  totalCompras: number;
  totalVentas: number;
  totalAnulados: number;
  totalVentasDeclarado: number;
  avisos: string[];
}
