/**
 * Reportes de conciliación bancaria — no tienen endpoint propio: se piden por
 * `POST /rest/rprt/generar` con `modulo: 'tsr'`, a través de `JasperReportesService`. Ver
 * `saaBE/docs/logica-negocio/tsr/DISENO-REPORTES-CONCILIACION-BANCARIA.md`.
 *
 * **Parámetros, confirmados el 2026-09-08:**
 * - `CONCILIACION_CUENTA` (una cuenta/período): `P_CNBC_CODIGO`, `P_PRDO_CODIGO`, `P_USUARIO`.
 * - `CONCILIACION_GENERAL` (todas las cuentas del período): `P_PJRQ_CODIGO` (empresa de la
 *   sesión), `P_PRDO_CODIGO`, `P_USUARIO`.
 *
 * `P_IMAGEN` se omite a propósito: el backend inyecta el logo cuando no viene.
 *
 * `guardarArchivo()` y `mensajeReporteFallido()` viven en `shared/services/descarga-reporte.ts`:
 * son genéricos, no tienen nada de tesorería. Acá sólo lo que es propio de este módulo: los
 * nombres de plantilla.
 */

/**
 * Nombres de las plantillas `.jrxml` publicadas en `rep/tsr/`.
 *
 * **Tienen que coincidir carácter por carácter con el archivo del servidor**: un nombre
 * equivocado no falla al compilar, devuelve un 404 en tiempo de ejecución. Mientras el backend no
 * haya subido los `.jasper` compilados, es esperable que el botón dé 404 (2026-09-08).
 */
export class ReportesTesoreria {
  public static readonly CONCILIACION_CUENTA = 'RPRT_CNCL_CNTA';
  public static readonly CONCILIACION_GENERAL = 'RPRT_CNCL_GNRL';
}
