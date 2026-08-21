import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { ConceptoFijoEmpleado } from '../model/concepto-fijo-empleado';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.CPXM. */
@Injectable({
  providedIn: 'root',
})
export class ConceptoFijoEmpleadoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<ConceptoFijoEmpleado[] | null> {
    const url = `${ServiciosRhh.RS_CPXM}/getAll`;
    return this.http.get<ConceptoFijoEmpleado[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<ConceptoFijoEmpleado | null> {
    const url = `${ServiciosRhh.RS_CPXM}/getId/${id}`;
    return this.http.get<ConceptoFijoEmpleado>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<ConceptoFijoEmpleado | null> {
    return this.http
      .post<ConceptoFijoEmpleado>(ServiciosRhh.RS_CPXM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<ConceptoFijoEmpleado | null> {
    return this.http
      .put<ConceptoFijoEmpleado>(ServiciosRhh.RS_CPXM, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<ConceptoFijoEmpleado[] | null> {
    const url = `${ServiciosRhh.RS_CPXM}/selectByCriteria/`;
    return this.http.post<ConceptoFijoEmpleado[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<ConceptoFijoEmpleado | null> {
    const url = `${ServiciosRhh.RS_CPXM}/${id}`;
    return this.http.delete<ConceptoFijoEmpleado>(url, this.httpOptions).pipe(catchError(this.handleError));
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
