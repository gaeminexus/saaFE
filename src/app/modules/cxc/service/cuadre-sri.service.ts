import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error.util';
import { Cuadre103Response, Cuadre104Response } from '../model/cuadre-sri';
import { ServiciosCxc } from './ws-cxc';

/** Cuadre de apoyo a los formularios 103/104 — ver docs/logica-negocio/sri/LEVANTAMIENTO-ATS-103-104.md §10.6 en saaBE. */
@Injectable({ providedIn: 'root' })
export class CuadreSriService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  cuadre104(idFacturador: number, anio: number, mes: number): Observable<Cuadre104Response> {
    const params = new HttpParams().set('anio', anio).set('mes', mes);
    return this.http.get<Cuadre104Response>(`${ServiciosCxc.RS_CUADRESRI}/104/${idFacturador}`, { params }).pipe(
      catchError(this.handleError),
    );
  }

  cuadre103(idFacturador: number, anio: number, mes: number): Observable<Cuadre103Response> {
    const params = new HttpParams().set('anio', anio).set('mes', mes);
    return this.http.get<Cuadre103Response>(`${ServiciosCxc.RS_CUADRESRI}/103/${idFacturador}`, { params }).pipe(
      catchError(this.handleError),
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => new Error(mensajeDeError(error, 'No se pudo calcular el cuadre')));
  }
}
