import { HttpErrorResponse, HttpHeaders, HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { BancoExterno } from '../../tsr/model/banco-externo.model';
import { AdjuntoCertificadoCnbp, CuentaBancariaParticipe } from '../model/cuenta-bancaria-participe';
import { Entidad } from '../model/entidad';
import { ServiciosCrd } from './ws-crd';

@Injectable({ providedIn: 'root' })
export class CuentaBancariaParticipeService {

  httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getByParent(idEntidad: number): Observable<CuentaBancariaParticipe[] | null> {
    return this.http.get<CuentaBancariaParticipe[]>(`${ServiciosCrd.RS_CNBP}/getByParent/${idEntidad}`).pipe(catchError(this.handleError));
  }

  /**
   * Búsqueda por criterios genéricos. La usa la pantalla de devolución de aportes para traer
   * solo las cuentas activas del partícipe (`entidad.codigo` + `estado = 1`), que es la cuenta a
   * la que se transfiere el dinero.
   */
  selectByCriteria(datos: DatosBusqueda[]): Observable<CuentaBancariaParticipe[] | null> {
    return this.http
      .post<CuentaBancariaParticipe[]>(`${ServiciosCrd.RS_CNBP}/selectByCriteria/`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * ⚠️ `POST /cnbp` quedó BLOQUEADO para creación del lado del backend: responde con un mensaje
   * que remite a `POST /cnbp/conCertificado` (verificado por el árbitro). Sigue existiendo solo
   * para no romper la firma; si algún llamador todavía lo usa para crear una cuenta, hay que
   * moverlo a `addConCertificado()`.
   */
  add(datos: any): Observable<CuentaBancariaParticipe | null> {
    return this.http.post<CuentaBancariaParticipe>(ServiciosCrd.RS_CNBP, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  /** `usuario` (opcional): sella la auditoría de ENTD (pedido 9). Solo el PUT lo acepta; el alta va por `addConCertificado()`. */
  update(datos: any, usuario?: string): Observable<CuentaBancariaParticipe | null> {
    const params = usuario ? new HttpParams().set('usuario', usuario) : new HttpParams();
    return this.http.put<CuentaBancariaParticipe>(ServiciosCrd.RS_CNBP, datos, { ...this.httpOptions, params }).pipe(catchError(this.handleError));
  }

  /**
   * Registra una cuenta bancaria CON su certificado bancario en PDF, en una sola llamada
   * multipart. No se puede registrar una cuenta sin este archivo (requisito de negocio); el
   * backend además bloqueó `POST /cnbp` para creación, así que este método es el único camino de
   * alta. `update()` sigue igual, sin certificado.
   *
   * Contrato de los `@FormParam` verificado por el árbitro contra
   * `ws/rest/crd/CuentaBancariaParticipeRest.java`:
   * - `archivo` (el `File`) + `archivoNombre` (`encodeURIComponent(archivo.name)`): el backend
   *   decodifica con `URLDecoder.decode(..., UTF_8)` (línea 181) — confirmado, había que mandarlo
   *   codificado.
   * - `idEntidad`, `idBancoExterno`, `tipoCuenta`, `numeroCuenta`, `usuarioRegistro`: los cinco
   *   campos reales. **`estado` NO existe como parámetro — no mandarlo, lo resuelve el backend.**
   */
  addConCertificado(
    datos: { entidad: Entidad; bancoExterno: BancoExterno; tipoCuenta: number; numeroCuenta: string },
    certificado: File,
    usuarioRegistro: string
  ): Observable<CuentaBancariaParticipe | null> {
    const formData = new FormData();
    formData.append('archivo', certificado);
    formData.append('archivoNombre', encodeURIComponent(certificado.name));
    formData.append('idEntidad', String(datos.entidad.codigo));
    formData.append('idBancoExterno', String(datos.bancoExterno.codigo));
    formData.append('tipoCuenta', String(datos.tipoCuenta));
    formData.append('numeroCuenta', datos.numeroCuenta);
    formData.append('usuarioRegistro', usuarioRegistro);

    // Sin Content-Type: el navegador pone el suyo con el boundary del multipart.
    return this.http
      .post<CuentaBancariaParticipe>(`${ServiciosCrd.RS_CNBP}/conCertificado`, formData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Metadatos del certificado bancario de una cuenta (`GET /cnbp/{id}/certificado`, verificado
   * contra `CuentaBancariaParticipeRest.java:220`). Es lo que decide si la pantalla muestra el
   * enlace "Ver certificado".
   *
   * **404 significa "esta cuenta no tiene certificado" y se traduce a `null` acá — no es un
   * error.** Solo se loguea (sin mostrarlo al usuario) cuando el fallo es otra cosa, para no
   * dejar una falla real de red disfrazada de "sin certificado".
   */
  obtenerCertificado(idCuentaBancariaParticipe: number): Observable<AdjuntoCertificadoCnbp | null> {
    return this.http
      .get<AdjuntoCertificadoCnbp>(`${ServiciosCrd.RS_CNBP}/${idCuentaBancariaParticipe}/certificado`)
      .pipe(
        catchError((e: HttpErrorResponse) => {
          if (e.status !== 404) {
            console.error('Error al consultar el certificado de la cuenta bancaria:', e);
          }
          return of(null);
        })
      );
  }

  /**
   * Descarga el PDF del certificado bancario (`GET /cnbp/{id}/certificado/descargar`, verificado
   * contra `CuentaBancariaParticipeRest.java:241`). Llamar solo cuando `obtenerCertificado()` ya
   * confirmó que la cuenta tiene certificado.
   */
  descargarCertificado(idCuentaBancariaParticipe: number): Observable<Blob> {
    return this.http.get(`${ServiciosCrd.RS_CNBP}/${idCuentaBancariaParticipe}/certificado/descargar`, {
      responseType: 'blob',
    });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${ServiciosCrd.RS_CNBP}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<null> {
    return of(null);
  }
}
