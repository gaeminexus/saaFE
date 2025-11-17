import { HttpHeaders, HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, catchError, of, throwError } from "rxjs";
import { MayorizacionCC } from "../model/mayorizacion-cc";
import { ServiciosCnt } from "./ws-cnt";


@Injectable({
  providedIn: 'root'
})
export class MayorizacionCCService {

httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<MayorizacionCC[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_MYRC}${wsGetById}`;
    return this.http.get<MayorizacionCC[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<MayorizacionCC | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_MYRC}${wsGetById}${id}`;
    return this.http.get<MayorizacionCC>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<MayorizacionCC | null> {
    return this.http.post<MayorizacionCC>(ServiciosCnt.RS_MYRC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<MayorizacionCC | null> {
    return this.http.put<MayorizacionCC>(ServiciosCnt.RS_MYRC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<MayorizacionCC[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_MYRC}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<MayorizacionCC | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_MYRC}${wsGetById}`;
    return this.http.delete<MayorizacionCC>(url, this.httpOptions).pipe(
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
