import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DestinoSobrante } from '../model/destino-sobrante';
import { ServiciosCrd } from './ws-crd';

/**
 * `/rest/dssb` — destino del sobrante por partícipe (docs/crd/API-DESTINO-SOBRANTE.md).
 * `usuario` va en el query con `encodeURIComponent`, y es el de `usuarioSesion()`, sin relleno.
 */
@Injectable({ providedIn: 'root' })
export class DestinoSobranteService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  /** Activos y anulados: para mostrar el vigente hay que filtrar `estado === 1`. */
  selectByCarga(idCarga: number): Observable<DestinoSobrante[] | null> {
    return this.http
      .get<DestinoSobrante[]>(`${ServiciosCrd.RS_DSSB}/selectByCarga/${idCarga}`)
      .pipe(catchError(this.handleError));
  }

  /** 201. Si el partícipe ya tenía uno activo en la carga, el anterior queda anulado y vale el nuevo. */
  add(destino: DestinoSobrante, usuario: string): Observable<DestinoSobrante | null> {
    return this.http
      .post<DestinoSobrante>(`${ServiciosCrd.RS_DSSB}?usuario=${encodeURIComponent(usuario)}`, destino, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** 200, mismo efecto que `add`. */
  update(destino: DestinoSobrante, usuario: string): Observable<DestinoSobrante | null> {
    return this.http
      .put<DestinoSobrante>(`${ServiciosCrd.RS_DSSB}?usuario=${encodeURIComponent(usuario)}`, destino, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** Solo si aún no se aplicó y la carga no está PROCESADA. */
  anular(id: number, usuario: string): Observable<DestinoSobrante | null> {
    return this.http
      .post<DestinoSobrante>(`${ServiciosCrd.RS_DSSB}/anular/${id}?usuario=${encodeURIComponent(usuario)}`, {}, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}
