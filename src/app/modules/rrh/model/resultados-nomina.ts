/**
 * DTO de los endpoints de proceso del motor de nómina.
 *
 * Espejo de los POJO `Serializable` de `com.saa.model.rhh` que fija la sección 6 del documento
 * maestro. No son entidades: no tienen tabla ni CRUD, solo viajan como respuesta de
 * `/rest/prdn/*` y `/rest/pyir/*`.
 */

/** Un renglón tal como lo devuelve el motor de cálculo, antes o después de persistirse. */
export interface RenglonCalculado {
  codigoConcepto: number;
  nombreConcepto: string;
  tipoConcepto: number;
  cantidad: number | null;
  base: number | null;
  porcentaje: number | null;
  valor: number;
  orden: number;
}

/** Resultado del cálculo de un colaborador. Lo devuelven `recalcularEmpleado` y `simular`. */
export interface ResultadoCalculoNomina {
  idEmpleado: number;
  nombreEmpleado: string;
  diasTrabajados: number;
  renglones: RenglonCalculado[];
  totalIngresos: number;
  totalDescuentos: number;
  neto: number;
  advertencias: string[];
}

/** Resultado del cálculo de todo el período. Lo devuelve `calcular`. */
export interface ResultadoCalculoPeriodo {
  idPeriodo: number;
  empleadosProcesados: number;
  empleadosConError: number;
  totalIngresos: number;
  totalDescuentos: number;
  totalNeto: number;
  totalPatronal: number;
  errores: string[];
}

/** Resultado de la proyección del impuesto a la renta de un colaborador. */
export interface ResultadoProyeccionIr {
  idEmpleado: number;
  anio: number;
  ingresosProyectados: number;
  baseImponible: number;
  impuestoCausado: number;
  gastosDeclarados: number;
  tope: number;
  rebaja: number;
  impuestoAPagar: number;
  mesesRestantes: number;
  retencionMensual: number;
}

/** Línea del asiento contable de nómina, para la previsualización previa a contabilizar. */
export interface LineaAsientoNomina {
  cuenta: string;
  /**
   * El backend le añade el sufijo `(SIN CONFIGURAR: cuenta marcadora)` cuando la línea sigue
   * apuntando a la cuenta marcadora. Se detecta con `lineaSinConfigurar()`, no comparando el
   * número de cuenta: el 9678 nunca se escribe en el cliente.
   */
  nombreCuenta: string;
  descripcion: string;
  debe: number;
  haber: number;
  codigoLinea: number;
  centroCosto: string | null;
}

/** Marca con la que el backend señala una línea cuya cuenta contable falta por mapear. */
const MARCA_SIN_CONFIGURAR = 'SIN CONFIGURAR';

/**
 * `true` si la línea sigue apuntando a la cuenta marcadora, es decir, si su cuenta contable
 * todavía no se ha configurado. Emitir el asiento con ella dejaría el importe en la cuenta
 * equivocada, así que la previsualización tiene que distinguirla a simple vista.
 */
export function lineaSinConfigurar(linea: LineaAsientoNomina): boolean {
  return (linea.nombreCuenta ?? '').toUpperCase().includes(MARCA_SIN_CONFIGURAR);
}

/**
 * Resultado del finiquito. Lo devuelve `POST /rest/lqdc/simular`, que **no persiste**.
 *
 * `causal` viaja como el nombre de la causal, no como su código: es el texto que se muestra.
 * `codigoConcepto` de cada rubro es el **código alterno** (`CPNMALTR`), igual que en el motor
 * de nómina — verificado contra el desplegado el 2026-08-20.
 */
export interface ResultadoLiquidacion {
  idEmpleado: number;
  fechaSalida: any;
  causal: string;
  aniosServicio: number;
  rubros: RenglonCalculado[];
  totalIngresos: number;
  totalDescuentos: number;
  neto: number;
}
