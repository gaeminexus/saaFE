/**
 * Códigos alternos de los rubros del módulo de Recursos Humanos (`SCP.PRBR.PRBRALTR`).
 *
 * Espejo de las interfaces de `com.saa.rubros` que crea el script 06. Son identificadores del
 * catálogo, no valores de negocio: los porcentajes, topes y plazos viven en `RHH.PRNM`,
 * `RHH.TBIR` y `RHH.TPGP`, nunca aquí.
 *
 * Se usan como `rubroAlterno` en los combos de `table-basic-hijos`, que resuelve la descripción
 * contra `DetalleRubroService`.
 */
/**
 * Rubros anteriores al 179 que consume Recursos Humanos. Ya existían en el sistema y sus códigos
 * alternos están en `com.saa.rubros`; se declaran aquí para no repetir el número suelto.
 */
export class RubrosSistema {
  /** 1 = cédula, 2 = RUC, 3 = pasaporte, 4 = identificación del exterior. */
  public static readonly TIPO_IDENTIFICACION = 36;
}

export class RubrosRrh {
  public static readonly TIPO_CONCEPTO_NOMINA = 179;
  public static readonly TIPO_CALCULO_CONCEPTO = 180;
  public static readonly BASE_CALCULO = 181;
  public static readonly ESTADO_PERIODO_NOMINA = 182;
  public static readonly ESTADO_NOMINA = 183;
  public static readonly MODO_PERIODO_NOMINA = 184;
  public static readonly ESTADO_EMPLEADO = 185;
  public static readonly TIPO_RELACION_LABORAL = 186;
  public static readonly REGION_DECIMO_CUARTO = 187;
  public static readonly MODALIDAD_DECIMO_TERCERO = 188;
  public static readonly MODALIDAD_DECIMO_CUARTO = 189;
  public static readonly MODALIDAD_FONDOS_RESERVA = 190;
  public static readonly TIPO_HORA_EXTRA = 191;
  public static readonly TIPO_MARCACION = 192;
  public static readonly ORIGEN_MARCACION = 193;
  public static readonly ESTADO_CARGA_MARCACIONES = 194;
  public static readonly CAUSAL_TERMINACION = 195;
  public static readonly ESTADO_LIQUIDACION = 196;
  public static readonly TIPO_DESCUENTO_RECURRENTE = 197;
  public static readonly ESTADO_DESCUENTO_RECURRENTE = 198;
  public static readonly TIPO_CUENTA_BANCARIA = 199;
  public static readonly PARENTESCO_CARGA = 200;
  public static readonly TIPO_GASTO_PERSONAL = 201;
  public static readonly TIPO_ACUMULADO = 202;
  public static readonly TIPO_BENEFICIO_SOCIAL = 203;
  public static readonly TIPO_NOVEDAD_IESS = 204;
  public static readonly ESTADO_NOVEDAD_IESS = 205;
  public static readonly TIPO_PROVISION = 206;
  public static readonly TIPO_AUSENCIA = 207;
  public static readonly ESTADO_ORDEN_PAGO = 208;
  public static readonly FORMATO_ARCHIVO_MARCACION = 209;
  public static readonly TIPO_JORNADA = 210;
  public static readonly TIPO_SALDO_APERTURA = 211;
  public static readonly TIPO_PERIODO_NOMINA = 212;
  public static readonly ORIGEN_RENGLON = 213;
  public static readonly LINEA_ASIENTO = 214;
  public static readonly CAMPO_ARCHIVO_MARCACION = 215;
  public static readonly ENTIDAD_RECAUDADORA = 216;
  public static readonly TIPO_CAMBIO_HISTORIAL = 217;
  public static readonly GENERO = 218;
  public static readonly ESTADO_CIVIL = 219;
  public static readonly NIVEL_INSTRUCCION = 220;

  /**
   * Rol que cumple el concepto dentro del motor de cálculo (`CPNM.CPNMROLM`). 22 detalles:
   * 16 del motor y 6 de provisión.
   *
   * Es por este campo, y no por `CPNMALTR` ni por la terna tipo/cálculo/base, por donde el motor
   * localiza cada concepto. El índice único `UQ_CPNM_ROLM` impide que dos conceptos reclamen el
   * mismo rol. Admite nulo: un concepto ordinario —un bono, un descuento de la empresa— no tiene
   * rol en el motor, y ese nulo es un dato, no un campo sin llenar.
   */
  public static readonly ROL_MOTOR_CONCEPTO = 221;

  /** Tipo de salida oficial (`RHH.SLOF`), creado por el script 13. Fase 9. */
  public static readonly TIPO_SALIDA_OFICIAL = 223;

  /**
   * Campo del archivo bancario (`DFMB.DFMBCMPO`), creado por el script 14. Once valores.
   *
   * El tipo de formato de `FMBN` **no usa un rubro propio**: reutiliza el 209
   * (`FORMATO_ARCHIVO_MARCACION`), que describe cualquier archivo plano y no solo los del reloj.
   */
  public static readonly CAMPO_ARCHIVO_BANCARIO = 224;
}
