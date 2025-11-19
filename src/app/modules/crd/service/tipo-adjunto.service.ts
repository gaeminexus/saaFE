import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCrd } from './ws-crd';
import { TipoAdjunto } from '../model/tipo-adjunto';

@Injectable({
  providedIn: 'root'
})
export class TipoAdjuntoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<TipoAdjunto[] | null> {
    const url = `${ServiciosCrd.RS_TPDJ}/getAll`;
    return this.http.get<TipoAdjunto[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<TipoAdjunto | null> {
    const url = `${ServiciosCrd.RS_TPDJ}/getId/${id}`;
    return this.http.get<TipoAdjunto>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<TipoAdjunto | null> {
    return this.http.post<TipoAdjunto>(ServiciosCrd.RS_TPDJ, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<TipoAdjunto | null> {
    return this.http.put<TipoAdjunto>(ServiciosCrd.RS_TPDJ, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<TipoAdjunto[] | null> {
    const url = `${ServiciosCrd.RS_TPDJ}/selectByCriteria/`;
    return this.http.post<TipoAdjunto[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: any): Observable<TipoAdjunto | null> {
    const url = `${ServiciosCrd.RS_TPDJ}/${id}`;
    return this.http.delete<TipoAdjunto>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) return of(null);
    return throwError(() => error.error);
  }
}
