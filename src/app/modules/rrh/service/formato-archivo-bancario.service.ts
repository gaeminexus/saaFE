import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { FormatoArchivoBancario } from '../model/formato-archivo-bancario';
import { ServiciosRhh } from './ws-rrh';

/** CRUD de RHH.FMBN, el formato del archivo de pago que exige el banco. */
@Injectable({
  providedIn: 'root',
})
export class FormatoArchivoBancarioService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<FormatoArchivoBancario[] | null> {
    const url = `${ServiciosRhh.RS_FMBN}/getAll`;
    return this.http.get<FormatoArchivoBancario[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<FormatoArchivoBancario | null> {
    const url = `${ServiciosRhh.RS_FMBN}/getId/${id}`;
    return this.http.get<FormatoArchivoBancario>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<FormatoArchivoBancario | null> {
    return this.http
      .post<FormatoArchivoBancario>(ServiciosRhh.RS_FMBN, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<FormatoArchivoBancario | null> {
    return this.http
      .put<FormatoArchivoBancario>(ServiciosRhh.RS_FMBN, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<FormatoArchivoBancario[] | null> {
    const url = `${ServiciosRhh.RS_FMBN}/selectByCriteria/`;
    return this.http.post<FormatoArchivoBancario[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<FormatoArchivoBancario | null> {
    const url = `${ServiciosRhh.RS_FMBN}/${id}`;
    return this.http.delete<FormatoArchivoBancario>(url, this.httpOptions).pipe(catchError(this.handleError));
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
