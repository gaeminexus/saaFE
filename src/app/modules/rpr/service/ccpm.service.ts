import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { Ccpm } from '../model/ccpm';
import { ServiciosRpr } from './ws-rpr';

@Injectable({
  providedIn: 'root',
})
export class CcpmService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Ccpm[] | null> {
    const url = `${ServiciosRpr.RS_CCPM}/getAll`;
    return this.http.get<Ccpm[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<Ccpm | null> {
    const url = `${ServiciosRpr.RS_CCPM}/getId/${id}`;
    return this.http.get<Ccpm>(url).pipe(catchError(this.handleError));
  }

  add(datos: Ccpm): Observable<Ccpm | null> {
    return this.http
      .post<Ccpm>(ServiciosRpr.RS_CCPM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Ccpm): Observable<Ccpm | null> {
    return this.http
      .put<Ccpm>(ServiciosRpr.RS_CCPM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<Ccpm | null> {
    const url = `${ServiciosRpr.RS_CCPM}/${id}`;
    return this.http
      .delete<Ccpm>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<Ccpm[] | null> {
    const url = `${ServiciosRpr.RS_CCPM}/selectByCriteria`;
    return this.http
      .post<Ccpm[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}
