/** Respuesta de GET /cjch/saldo/{id} y de cada elemento de GET /cjch/saldos/{idEmpresa}. */
export interface SaldoCajaChica {
  idCaja: number;
  nombre: string;
  fondo: number;
  saldo: number;
  /** % del fondo que queda disponible (no lo ya gastado). */
  porcentaje: number;
  /** true cuando `porcentaje` cayó por debajo del umbral configurado en la caja. */
  alerta: boolean;
  /** Cuánto se sugiere reponer para volver al fondo completo. */
  montoSugeridoReposicion: number;
  ultimoCierre: any;
}
