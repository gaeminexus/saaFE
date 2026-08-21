import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { ConceptoNomina } from '../model/concepto-nomina';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.CPNM. */
@Injectable({
  providedIn: 'root',
})
export class ConceptoNominaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<ConceptoNomina[] | null> {
    const url = `${ServiciosRhh.RS_CPNM}/getAll`;
    return this.http.get<ConceptoNomina[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<ConceptoNomina | null> {
    const url = `${ServiciosRhh.RS_CPNM}/getId/${id}`;
    return this.http.get<ConceptoNomina>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<ConceptoNomina | null> {
    return this.http
      .post<ConceptoNomina>(ServiciosRhh.RS_CPNM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<ConceptoNomina | null> {
    return this.http
      .put<ConceptoNomina>(ServiciosRhh.RS_CPNM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<ConceptoNomina[] | null> {
    const url = `${ServiciosRhh.RS_CPNM}/selectByCriteria/`;
    return this.http.post<ConceptoNomina[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<ConceptoNomina | null> {
    const url = `${ServiciosRhh.RS_CPNM}/${id}`;
    return this.http.delete<ConceptoNomina>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  // Manejo de errores HTTP (respetando patrón de of(null) con status 200)
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
