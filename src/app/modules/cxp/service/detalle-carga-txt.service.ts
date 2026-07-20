import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleCargaTxt } from '../model/detalle-carga-txt';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class DetalleCargaTxtService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<DetalleCargaTxt[] | null> {
    return this.http.get<DetalleCargaTxt[]>(`${ServiciosCxp.RS_DCTX}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<DetalleCargaTxt | null> {
    return this.http.get<DetalleCargaTxt>(`${ServiciosCxp.RS_DCTX}/getId/${id}`).pipe(catchError(this.handleError));
  }

  getByCarga(idCarga: number): Observable<DetalleCargaTxt[] | null> {
    return this.http.get<DetalleCargaTxt[]>(`${ServiciosCxp.RS_DCTX}/getByCarga/${idCarga}`).pipe(catchError(this.handleError));
  }

  getByDocumento(idDocumentoCxp: number): Observable<DetalleCargaTxt[] | null> {
    return this.http.get<DetalleCargaTxt[]>(`${ServiciosCxp.RS_DCTX}/getByDocumento/${idDocumentoCxp}`).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<DetalleCargaTxt[] | null> {
    return this.http.post<DetalleCargaTxt[]>(`${ServiciosCxp.RS_DCTX}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
