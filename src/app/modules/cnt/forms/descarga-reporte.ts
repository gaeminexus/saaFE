/**
 * Reportes contables Jasper de balance — no tienen endpoint propio: se piden por
 * `POST /rest/rprt/generar` con `modulo: 'cnt'`, a través de `JasperReportesService`.
 *
 * Seis variantes según dos ejes independientes: **acumulado con fecha inicial / acumulado sin
 * fecha inicial (a fecha de corte) / por rango de fechas**, cada una con o sin columnas Debe y
 * Haber. Confirmado el 2026-09-08 leyendo los `.jrxml` reales en `rep/cnt/`:
 *
 * - `ACUM_CNFI`/`ACUM_CNFI_DBHB` declaran `P_FECHAINICIAL` **y** `P_FECHAFINAL`.
 * - `ACUM_SNFI`/`ACUM_SNFI_DBHB` declaran **sólo `P_FECHAFINAL`** — literalmente no aceptan
 *   `P_FECHAINICIAL`, no es sólo una convención de nombre.
 * - `RNGO_FIFF`/`RNGO_FIFF_DBHB` — por rango, declaran ambas fechas.
 *
 * `P_DTMTSCRP` es el `idEjecucion` que ya devuelve `generarBalance()` (`CNT.DTMT.DTMTSCRP`): no
 * hace falta pedirle nada nuevo al backend, el balance ya generado en pantalla es el dato.
 * `P_IMAGEN` se omite: el backend inyecta el logo cuando no viene.
 *
 * `guardarArchivo()`/`mensajeReporteFallido()` viven en `shared/services/descarga-reporte.ts`
 * (genéricos). Acá sólo lo que es propio de este módulo: los nombres de plantilla.
 */

/**
 * Nombres de las plantillas `.jrxml` publicadas en `rep/cnt/`.
 *
 * **Tienen que coincidir carácter por carácter con el archivo del servidor**: un nombre
 * equivocado no falla al compilar, devuelve un 404 en tiempo de ejecución.
 */
export class ReportesContables {
  public static readonly ACUM_CNFI = 'RPRTCNTB_ACUM_CNFI';
  public static readonly ACUM_CNFI_DBHB = 'RPRT_ACUM_CNFI_DBHB';
  public static readonly ACUM_SNFI = 'RPRTCNTB_ACUM_SNFI';
  public static readonly ACUM_SNFI_DBHB = 'RPRT_ACUM_SNFI_DBHB';
  public static readonly RNGO_FIFF = 'RPRTCNTB_RNGO_FIFF';
  public static readonly RNGO_FIFF_DBHB = 'RPRT_RNGO_FIFF_DBHB';
}
