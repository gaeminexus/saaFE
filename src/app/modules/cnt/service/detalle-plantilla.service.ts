import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetallePlantilla} from '../model/detalle-plantilla';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class DetallePlantillaService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<DetallePlantilla[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_DTPL}${wsGetById}`;
    return this.http.get<DetallePlantilla[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<DetallePlantilla| null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_DTPL}${wsGetById}${id}`;
    return this.http.get<DetallePlantilla>(url).pipe(
      catchError(this.handleError)
    );
  }

  getByParent(idParent: number): Observable<DetallePlantilla[] | null> {
    const wsGetById = '/getByParent/';
    const url = `${ServiciosCnt.RS_DTPL}${wsGetById}${idParent}`;
    return this.http.get<DetallePlantilla[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<DetallePlantilla| null> {
    return this.http.post<DetallePlantilla>(ServiciosCnt.RS_DTPL, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<DetallePlantilla| null> {
    return this.http.put<DetallePlantilla>(ServiciosCnt.RS_DTPL, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<DetallePlantilla[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_DTPL}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<DetallePlantilla| null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_DTPL}${wsGetById}`;
    return this.http.delete<DetallePlantilla>(url, this.httpOptions).pipe(
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
