import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { ServiciosCrd } from './ws-crd';
import {
  ClasificacionBanda,
  ConfiguracionBandaDetalle,
  CuentaBandaDisponible,
  ProductoBandas,
  SolicitudCierreVigencia,
  SolicitudConfiguracionBanda,
} from '../model/bandas/bandas-cartera.model';

/**
 * Servicio HTTP de la parametrización de bandas de cartera por producto.
 *
 * Contrato: docs/crd/API-BANDAS-PRODUCTO.md. No inventa rutas: cada método
 * corresponde a un endpoint documentado ahí.
 *
 * Manejo de errores: el mensaje de negocio es apto para mostrar al usuario, así que estos
 * métodos propagan (throwError) ese texto ya extraído.
 *
 * DISCREPANCIA CON EL CONTRATO (verificada con curl el 2026-08-25):
 * el contrato §0.2 dice que el error 500 llega como TEXTO PLANO "Error ...: mensaje".
 * La respuesta REAL es 500 con `Content-Type: application/json` y cuerpo
 * `{"mensaje":"Error al ...: <mensaje>"}`. `extraerMensajeError` cubre AMBAS formas
 * (JSON `{mensaje}` y texto plano), para no romperse si el backend alinea el contrato.
 */
@Injectable({
  providedIn: 'root',
})
export class BandasCarteraService {
  private readonly baseCbpr = ServiciosCrd.RS_CBPR;
  private readonly baseBndp = ServiciosCrd.RS_BNDP;

  constructor(private http: HttpClient) {}

  /** GET /rest/cbpr/listado — listado completo (una fila por producto de crédito). §2.1 */
  getListado(idEmpresa: number, fecha?: string): Observable<ProductoBandas[]> {
    let params = new HttpParams().set('idEmpresa', idEmpresa);
    if (fecha) {
      params = params.set('fecha', fecha);
    }
    return this.http
      .get<ProductoBandas[]>(`${this.baseCbpr}/listado`, { params })
      .pipe(catchError(this.handleError));
  }

  /** GET /rest/cbpr/vigente — configuración vigente de un producto + tipo de cartera. §2.2 */
  getVigente(
    idProducto: number,
    idEmpresa: number,
    tipoCartera: number,
    fecha?: string,
  ): Observable<ConfiguracionBandaDetalle> {
    let params = new HttpParams()
      .set('idProducto', idProducto)
      .set('idEmpresa', idEmpresa)
      .set('tipoCartera', tipoCartera);
    if (fecha) {
      params = params.set('fecha', fecha);
    }
    return this.http
      .get<ConfiguracionBandaDetalle>(`${this.baseCbpr}/vigente`, { params })
      .pipe(catchError(this.handleError));
  }

  /** GET /rest/cbpr/historial — todas las configuraciones (vigentes y cerradas) de una terna. §2.3 */
  getHistorial(
    idProducto: number,
    idEmpresa: number,
    tipoCartera: number,
  ): Observable<ConfiguracionBandaDetalle[]> {
    const params = new HttpParams()
      .set('idProducto', idProducto)
      .set('idEmpresa', idEmpresa)
      .set('tipoCartera', tipoCartera);
    return this.http
      .get<ConfiguracionBandaDetalle[]>(`${this.baseCbpr}/historial`, { params })
      .pipe(catchError(this.handleError));
  }

  /** POST /rest/cbpr/guardarConfiguracion — graba cabecera + bandas en una transacción. §2.4 */
  guardarConfiguracion(
    solicitud: SolicitudConfiguracionBanda,
  ): Observable<ConfiguracionBandaDetalle> {
    return this.http
      .post<ConfiguracionBandaDetalle>(`${this.baseCbpr}/guardarConfiguracion`, solicitud)
      .pipe(catchError(this.handleError));
  }

  /** POST /rest/cbpr/cerrarVigencia — cierra la vigente y abre una nueva desde la fecha dada. §2.5 */
  cerrarVigencia(solicitud: SolicitudCierreVigencia): Observable<ConfiguracionBandaDetalle> {
    return this.http
      .post<ConfiguracionBandaDetalle>(`${this.baseCbpr}/cerrarVigencia`, solicitud)
      .pipe(catchError(this.handleError));
  }

  /** GET /rest/cbpr/cuentas — buscador de cuenta contable (solo activas y de movimiento). §4.3 */
  buscarCuentas(idEmpresa: number, filtro?: string): Observable<CuentaBandaDisponible[]> {
    let params = new HttpParams().set('idEmpresa', idEmpresa);
    if (filtro) {
      params = params.set('filtro', filtro);
    }
    return this.http
      .get<CuentaBandaDisponible[]>(`${this.baseCbpr}/cuentas`, { params })
      .pipe(catchError(this.handleError));
  }

  /** GET /rest/cbpr/clasificar — verificación: días → banda → cuenta. §3 */
  clasificar(
    idProducto: number,
    idEmpresa: number,
    tipoCartera: number,
    dias: number,
    fecha?: string,
  ): Observable<ClasificacionBanda> {
    let params = new HttpParams()
      .set('idProducto', idProducto)
      .set('idEmpresa', idEmpresa)
      .set('tipoCartera', tipoCartera)
      .set('dias', dias);
    if (fecha) {
      params = params.set('fecha', fecha);
    }
    return this.http
      .get<ClasificacionBanda>(`${this.baseCbpr}/clasificar`, { params })
      .pipe(catchError(this.handleError));
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    return throwError(() => this.extraerMensajeError(error));
  };

  /**
   * Extrae el mensaje de negocio del error, apto para mostrarlo al usuario,
   * cubriendo las formas posibles del cuerpo:
   *  1. Objeto JSON `{ "mensaje": "..." }` — la forma REAL del backend, ya parseada por Angular.
   *  2. String de texto plano — la forma documentada en el contrato (o JSON que llega como texto).
   *  3. Envoltura `{ error, text }` que arma Angular cuando el content-type dice json pero
   *     el cuerpo no parsea; el crudo queda en `.text` (y puede ser a su vez un JSON `{mensaje}`).
   */
  private extraerMensajeError(error: HttpErrorResponse): string {
    const cuerpo: unknown = error?.error;

    // 1. Objeto { mensaje } ya parseado.
    const desdeObjeto = this.leerCampoMensaje(cuerpo);
    if (desdeObjeto) {
      return desdeObjeto;
    }

    // 2. Texto plano (contrato §0.2) o un JSON que llegó como string.
    if (typeof cuerpo === 'string' && cuerpo.trim()) {
      const desdeTexto = this.leerCampoMensaje(this.intentarJson(cuerpo));
      return (desdeTexto ?? cuerpo).trim();
    }

    // 3. Envoltura { text: "<crudo>" }.
    if (
      cuerpo &&
      typeof cuerpo === 'object' &&
      typeof (cuerpo as { text?: unknown }).text === 'string'
    ) {
      const texto = (cuerpo as { text: string }).text;
      const desdeTexto = this.leerCampoMensaje(this.intentarJson(texto));
      if (desdeTexto) {
        return desdeTexto;
      }
      if (texto.trim()) {
        return texto.trim();
      }
    }

    if (error?.message) {
      return error.message;
    }
    return 'Ocurrió un error al comunicarse con el servidor.';
  }

  /** Devuelve `valor.mensaje` si es un string no vacío; si no, null. */
  private leerCampoMensaje(valor: unknown): string | null {
    if (valor && typeof valor === 'object') {
      const mensaje = (valor as { mensaje?: unknown }).mensaje;
      if (typeof mensaje === 'string' && mensaje.trim()) {
        return mensaje.trim();
      }
    }
    return null;
  }

  private intentarJson(texto: string): unknown {
    try {
      return JSON.parse(texto);
    } catch {
      return null;
    }
  }
}
