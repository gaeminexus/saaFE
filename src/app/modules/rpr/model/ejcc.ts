/** EJCC - Control de ejecución de reportes de cartera (CPRM, CJBM, CCPM) */
export interface Ejcc {
  /** EJCCCDGO – Código único de ejecución (Identity) */
  codigo: number | null;
  /** EJCCMESS – Mes de ejecución (1-12) */
  mes: number;
  /** EJCCANOO – Año de ejecución */
  anio: number;
  /** EJCCUSRO – Usuario que ejecutó los reportes */
  usuario: string;
  /** EJCCFCGN – Fecha y hora de generación */
  fechaGeneracion: any;
  /** EJCCOBSR – Observaciones generales */
  observaciones: string;
}
