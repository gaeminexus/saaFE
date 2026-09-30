/**
 * Los cuatro reportes de nómina —rol individual, rol consolidado, provisiones y resumen de
 * aportes— no tienen endpoint propio: se piden todos por `POST /rest/rprt/generar` con
 * `modulo: 'rhh'`, a través de `JasperReportesService`.
 *
 * **Parámetros, confirmados el 2026-08-19:** los tres reportes de período llevan
 * `P_PRDN_CODIGO` y `P_USUARIO`; el rol individual lleva `P_RLPG_CODIGO` y `P_USUARIO`.
 * `P_IMAGEN` se omite a propósito: el backend inyecta el logo cuando no viene.
 *
 * `guardarArchivo()` y `mensajeReporteFallido()` se movieron a
 * `shared/services/descarga-reporte.ts`: son genéricos, no tienen nada de RRHH, y CRD también
 * los necesita para sus reportes Jasper de simulación. Acá solo queda lo que es propio de este
 * módulo: los nombres de plantilla.
 */

/**
 * Nombres de las plantillas `.jrxml` publicadas en `rep/rhh/`.
 *
 * Siguen el patrón canónico de la casa —`RPRT_` más dos bloques de cuatro, como
 * `RPRT_CMPB_PGCT`—, no el nombre descriptivo largo. **Tienen que coincidir carácter por
 * carácter con el archivo del servidor**: un nombre equivocado no falla al compilar, devuelve un
 * 404 en tiempo de ejecución. Confirmados contra los entregados el 2026-08-19.
 */
export class ReportesNomina {
  public static readonly ROL_INDIVIDUAL = 'RPRT_ROLL_INDV';
  public static readonly ROL_CONSOLIDADO = 'RPRT_ROLL_CNSL';
  public static readonly PROVISIONES = 'RPRT_PRVS_PRDO';
  public static readonly RESUMEN_APORTES = 'RPRT_APRT_RSMN';

  /**
   * Los tres agregados el 2026-09-03, verificados contra `saaBE/src/main/resources/rep/rhh/`
   * (los `.jrxml` reales, no de memoria — un nombre equivocado no falla al compilar, da 404 en
   * tiempo de ejecución).
   *
   * `ACTA_FINIQUITO` pide `P_LQDC_CODIGO`; `FORMULARIO_107` pide `P_MPLD_CODIGO` + `P_ANIO`;
   * `CONTROL_IESS` pide `P_PRDN_CODIGO` — el mismo parámetro de período que `ROL_CONSOLIDADO`,
   * `PROVISIONES` y `RESUMEN_APORTES`, pese al nombre.
   */
  public static readonly ACTA_FINIQUITO = 'RPRT_ACTA_FNQT';
  public static readonly FORMULARIO_107 = 'RPRT_F107_INDV';
  public static readonly CONTROL_IESS = 'RPRT_IESS_CNTR';

  /**
   * Acta de finiquito de un ex-colaborador de la administración anterior — copia del layout de
   * `ACTA_FINIQUITO` pero contra `RHH.LQEX`/`RHH.DLEX`, no `RHH.LQDC` (docs/rrh/
   * API-LIQUIDACION-EXCOLABORADORES.md §7). Pide `P_LQEX_CODIGO` + `P_USUARIO`, no `P_LQDC_CODIGO`.
   * El `.jrxml` lo entrega el backend en paralelo — no confirmado en `rep/rhh/` todavía
   * (2026-09-30): si el nombre no coincide carácter por carácter, da 404 en tiempo de ejecución,
   * no al compilar.
   */
  public static readonly ACTA_FINIQUITO_EXCOLABORADOR = 'RPRT_ACTA_FNQT_EXCL';
}
