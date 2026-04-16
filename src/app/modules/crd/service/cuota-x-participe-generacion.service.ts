import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CuotaXParticipeGeneracion } from '../model/cuota-x-participe-generacion';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root',
})
export class CuotaXParticipeGeneracionService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<CuotaXParticipeGeneracion[] | null> {
    const url = `${ServiciosCrd.RS_CXPG}/getAll`;
    return this.http.get<CuotaXParticipeGeneracion[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<CuotaXParticipeGeneracion | null> {
    const url = `${ServiciosCrd.RS_CXPG}/getId/${id}`;
    return this.http.get<CuotaXParticipeGeneracion>(url).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<CuotaXParticipeGeneracion[] | null> {
    const url = `${ServiciosCrd.RS_CXPG}/selectByCriteria/`;
    return this.http
      .post<CuotaXParticipeGeneracion[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  getByParticipe(codigoParticipe: number): Observable<CuotaXParticipeGeneracion[] | null> {
    const url = `${ServiciosCrd.RS_CXPG}/getByParticipe/${codigoParticipe}`;
    return this.http.get<CuotaXParticipeGeneracion[]>(url).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}
