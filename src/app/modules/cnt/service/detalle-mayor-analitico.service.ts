import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleMayorAnalitico} from '../model/detalle-mayor-analitico';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class DetalleMayorAnaliticoService {


  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<DetalleMayorAnalitico[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_DTMA}${wsGetById}`;
    return this.http.get<DetalleMayorAnalitico[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<DetalleMayorAnalitico| null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_DTMA}${wsGetById}${id}`;
    return this.http.get<DetalleMayorAnalitico>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<DetalleMayorAnalitico| null> {
    return this.http.post<DetalleMayorAnalitico>(ServiciosCnt.RS_DTMA, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<DetalleMayorAnalitico| null> {
    return this.http.put<DetalleMayorAnalitico>(ServiciosCnt.RS_DTMA, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<DetalleMayorAnalitico[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_DTMA}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<DetalleMayorAnalitico| null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_DTMA}${wsGetById}`;
    return this.http.delete<DetalleMayorAnalitico>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  // tslint:disable-next-line: typedef
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }

}
