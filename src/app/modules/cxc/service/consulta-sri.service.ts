import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface EstadoSriResponse {
  exito: boolean;
  ambiente: string;
  claveAcceso: string;
  estadoAutorizacion: string;
  tipoComprobante: string;
  rucEmisor: string;
  fechaAutorizacion: string;
  mensajes: any[];
}

export interface NegociableSriResponse {
  exito: boolean;
  ambiente: string;
  claveAcceso: string;
  estadoConfirmacion: string;
}

@Injectable({ providedIn: 'root' })
export class ConsultaSriService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/consultasri`;

  consultarEstado(clave: string, ambiente: number): Observable<EstadoSriResponse | null> {
    const params = new HttpParams().set('ambiente', ambiente.toString());
    return this.http
      .get<EstadoSriResponse>(`${this.base}/estado/${clave}`, { params })
      .pipe(catchError(() => of(null)));
  }

  consultarNegociable(clave: string, ambiente: number): Observable<NegociableSriResponse | null> {
    const params = new HttpParams().set('ambiente', ambiente.toString());
    return this.http
      .get<NegociableSriResponse>(`${this.base}/negociable/${clave}`, { params })
      .pipe(catchError(() => of(null)));
  }
}
