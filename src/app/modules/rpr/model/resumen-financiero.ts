/**
 * C27-E — Resumen Financiero de Informes Mensuales comparado con el balance
 * (GET /ejcc/resumenFinanciero/{codigo}). Lo arma el backend: el navegador solo lo muestra.
 */
export interface LineaResumenFinanciero {
  /** Grupo de la línea ("1. CAPITAL POR VENCER", "5. PROVISIONES", ...) */
  grupo: string;
  /** Nombre de la cuenta o del rubro */
  concepto: string;
  /** Cuenta contable equivalente; null si la línea no tiene cuenta */
  cuenta: string | null;
  /** Valor del informe, redondeado a 2 decimales */
  valorInforme: number | null;
  /** Saldo contable de la cuenta al corte (signo de la naturaleza de la línea) */
  saldoContable: number | null;
  /** valorInforme - saldoContable */
  diferencia: number | null;
  /** true si la línea debe cuadrar con su cuenta; false = informativa */
  comparable: boolean;
  /** Operaciones o partícipes de la línea */
  registros: number | null;
  /** Aclaración de la definición de la línea */
  nota: string | null;
  /** true en las líneas de total */
  total: boolean;
}

export interface ResumenFinancieroCartera {
  codigoEjecucion: number;
  mes: number;
  anio: number;
  corte: any;
  fechaGeneracion: any;
  fechaCierreContable: any;
  fechaCierreCartera: any;
  periodoCerrado: boolean;
  /** true si la ejecución es anterior al último cierre contable o de cartera del mes, o el período está abierto */
  desactualizada: boolean;
  aviso: string;
  lineas: LineaResumenFinanciero[];
}
