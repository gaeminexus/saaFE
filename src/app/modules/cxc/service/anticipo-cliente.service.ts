import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { AnticipoCliente, ConfirmarAnticipoClienteRequest } from '../model/anticipo-cliente';
import { ServiciosCxc } from './ws-cxc';

@Injectable({
  providedIn: 'root',
})
export class AnticipoClienteService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<AnticipoCliente[] | null> {
    return this.http
      .get<AnticipoCliente[]>(`${ServiciosCxc.RS_ANTC}/getAll`)
      .pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<AnticipoCliente | null> {
    return this.http
      .get<AnticipoCliente>(`${ServiciosCxc.RS_ANTC}/getId/${id}`)
      .pipe(catchError(this.handleError));
  }

  add(datos: Partial<AnticipoCliente>): Observable<AnticipoCliente | null> {
    return this.http
      .post<AnticipoCliente>(ServiciosCxc.RS_ANTC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Partial<AnticipoCliente>): Observable<AnticipoCliente | null> {
    return this.http
      .put<AnticipoCliente>(ServiciosCxc.RS_ANTC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: unknown): Observable<AnticipoCliente[] | null> {
    return this.http
      .post<AnticipoCliente[]>(`${ServiciosCxc.RS_ANTC}/selectByCriteria/`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<AnticipoCliente | null> {
    return this.http
      .delete<AnticipoCliente>(`${ServiciosCxc.RS_ANTC}/${id}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  confirmar(datos: ConfirmarAnticipoClienteRequest): Observable<any | null> {
    return this.http
      .post<any>(`${ServiciosCxc.RS_ANTC}/confirmar`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}
