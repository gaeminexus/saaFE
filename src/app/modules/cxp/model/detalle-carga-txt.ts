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
  // Resultado: NUEVO / DUPLICADO / NOVEDAD / IGNORADO
  resultado: string;
  observacion: string;
}
