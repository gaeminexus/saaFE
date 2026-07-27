import { CargaArchivoTxt } from './carga-archivo-txt';
import { DocumentoCxp } from './documento-cxp';

// Línea de aparición de un documento en un archivo TXT — endpoint: /dctx
// Puede haber N líneas para un mismo documento (mismo claveAcceso).
// El ciclo de vida del documento está en DocumentoCxp (FK: documento)
export interface DetalleCargaTxt {
  id: number;
  cargaTxt: CargaArchivoTxt;      // FK a CRTX
  documento: DocumentoCxp;         // FK a DCXP — documento único
  valorSinImpuestosCarga: number;  // Valor en ESTA carga (snapshot)
  ivaCarga: number;                // IVA en esta carga (snapshot)
  importeTotalCarga: number;       // Total en esta carga (snapshot)
  // Resultado de procesamiento en esta carga:
  // NUEVO (1)                    — Primera vez que aparece el documento
  // DUPLICADO (2)                — Ya existía sin diferencias
  // NOVEDAD (3)                  — Ya existía con diferencias en montos/fechas, pendiente de acción
  // IGNORADO (4)                 — RUC receptor no coincide con la empresa
  // DESAPARECIDO (5)             — Pendiente de procesar y no apareció en esta carga. Requiere acción
  // REGISTRADO_CON_DIFERENCIAS (6) — Ya registrado con asiento. El SRI reporta valores distintos. Solo informativo
  // REGISTRADO_DESAPARECIDO (7)  — Ya registrado con asiento. No apareció en esta carga. Solo informativo
  resultado: string;
  observacion: string;
}
