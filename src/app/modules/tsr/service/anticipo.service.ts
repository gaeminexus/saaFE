import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { ServiciosTsr } from './ws-tsr';

export interface AnticipoRequest {
  idTitular: number;
  valor: number;
  idCuentaBancaria: number;
  idEmpresa: number;
  idUsuario: number;
  fechaAnticipo: string;   // 'YYYY-MM-DD'
  numeroDoc: string;
  observacion: string;
}

export interface AnticipoResponse {
  // El backend puede devolver cualquier estructura; se acepta como any
  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class AnticipoService {
  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  /** POST /antc/procesar — Anticipo de Cliente */
  procesarCliente(payload: AnticipoRequest): Observable<AnticipoResponse> {
    const url = `${ServiciosTsr.RS_ANTC}/procesar`;
    return this.http.post<AnticipoResponse>(url, payload, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST /antp/procesar — Anticipo de Proveedor */
  procesarProveedor(payload: AnticipoRequest): Observable<AnticipoResponse> {
    const url = `${ServiciosTsr.RS_ANTP}/procesar`;
    return this.http.post<AnticipoResponse>(url, payload, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    // Extraer mensaje de error del cuerpo si existe
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
