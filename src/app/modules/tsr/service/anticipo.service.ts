import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { ServiciosTsr } from './ws-tsr';

export interface AnticipoRequest {
  idTitular: number;
  valor: number;
  idCuentaBancaria: number;
  /** Cuenta bancaria del proveedor (CTBN) hacia donde se transfiere el anticipo. */
  idCuentaDestinoTitular?: number;
  idEmpresa: number;
  idUsuario: number;
  fechaAnticipo: string;
  numeroDoc: string;
  observacion: string;
}

export interface AnticipoResponse {
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class AnticipoService {
  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  procesarCliente(payload: AnticipoRequest): Observable<AnticipoResponse> {
    return this.http.post<AnticipoResponse>(`${ServiciosTsr.RS_ANTC}/procesar`, payload, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  procesarProveedor(payload: AnticipoRequest): Observable<AnticipoResponse> {
    return this.http.post<AnticipoResponse>(`${ServiciosTsr.RS_ANTP}/procesar`, payload, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteriaCliente(datos: any[]): Observable<AnticipoResponse[] | null> {
    return this.http.post<AnticipoResponse[]>(`${ServiciosTsr.RS_ANTC}/selectByCriteria/`, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteriaProveedor(datos: any[]): Observable<AnticipoResponse[] | null> {
    return this.http.post<AnticipoResponse[]>(`${ServiciosTsr.RS_ANTP}/selectByCriteria/`, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let mensaje = 'Error al procesar el anticipo';
    if (error.error) {
      if (typeof error.error === 'string') {
        mensaje = error.error;
      } else if (error.error.error) {
        mensaje = error.error.error;
      } else if (error.error.message) {
        mensaje = error.error.message;
      }
    }
    return throwError(() => new Error(mensaje));
  }
}

