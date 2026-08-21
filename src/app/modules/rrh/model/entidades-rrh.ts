/**
 * Códigos de entidad del módulo de Recursos Humanos para `table-basic-hijos`.
 *
 * `ServiceLocatorService` despacha por el valor numérico, no por el tipo, así que estos códigos
 * no pueden colisionar con `EntidadesContabilidad` (1–26), `EntidadesTesoreria` (1–51),
 * `EntidadesCrd` (400–468) ni `EntidadesRpr` (500–513). RHH arranca en 600.
 */
export class EntidadesRrh {
  // Parametrización
  public static readonly CONCEPTO_NOMINA = 600;
  public static readonly CONFIGURACION_NOMINA = 601;
  public static readonly PARAMETRO_NOMINA = 602;
  public static readonly TABLA_IMPUESTO_RENTA = 603;
  public static readonly TOPE_GASTO_PERSONAL = 604;
  public static readonly CAUSAL_TERMINACION = 605;
  public static readonly FORMATO_MARCACION = 606;
  public static readonly DETALLE_FORMATO_MARCACION = 607;

  // Maestro de personal
  public static readonly EMPLEADO = 619;
  public static readonly CARGA_FAMILIAR = 620;
  public static readonly CUENTA_BANCARIA_EMPLEADO = 621;
  public static readonly GASTO_PERSONAL_PROYECTADO = 622;
  public static readonly CONCEPTO_FIJO_EMPLEADO = 623;
  public static readonly NOVEDAD_IESS = 624;
  public static readonly CONTRATO_EMPLEADO = 625;
  public static readonly HISTORIAL_CARGO = 626;

  // Migración de apertura y descuentos recurrentes
  public static readonly SALDO_APERTURA = 630;
  public static readonly ACUMULADO_NOMINA = 631;
  public static readonly DESCUENTO_RECURRENTE = 632;
  public static readonly CUOTA_DESCUENTO = 633;

  // Motor de nómina
  public static readonly PERIODO_NOMINA = 640;
  public static readonly NOVEDAD_NOMINA = 641;
  public static readonly HORA_EXTRA = 642;

  // Asistencia
  public static readonly MARCACION = 650;
  public static readonly RESUMEN_DIARIO = 651;

  // Contabilización y pago (fase 6)
  public static readonly FORMATO_ARCHIVO_BANCARIO = 660;
  public static readonly DETALLE_FORMATO_BANCARIO = 661;
  public static readonly ORDEN_PAGO = 662;
  public static readonly DETALLE_ORDEN_PAGO = 663;

  // Parametrización preexistente, reconstruida sobre table-basic-hijos
  public static readonly CARGO = 610;
  public static readonly DEPARTAMENTO = 611;
  public static readonly DEPARTAMENTO_CARGO = 612;
  public static readonly TIPO_CONTRATO_EMPLEADO = 613;
  public static readonly TURNO = 614;
}
