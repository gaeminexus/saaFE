import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error.util';
import {
  AnularMovimientoCajaChicaRequest,
  GastoCajaChicaRequest,
  MovimientoCajaChica,
  MovimientoCajaChicaFiltro,
  ReposicionCajaChicaRequest,
  ReposicionCajaChicaResponse,
} from '../model/movimiento-caja-chica';
import { ServiciosTsr } from './ws-tsr';

@Injectable({ providedIn: 'root' })
export class MovimientoCajaChicaService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  gasto(datos: GastoCajaChicaRequest): Observable<MovimientoCajaChica> {
    return this.http.post<MovimientoCajaChica>(`${ServiciosTsr.RS_MVCH}/gasto`, datos, this.httpOptions);
  }

  /** Repone una caja que ya tuvo apertura (con saldo o movimientos previos). */
  reposicion(datos: ReposicionCajaChicaRequest): Observable<ReposicionCajaChicaResponse> {
    return this.http.post<ReposicionCajaChicaResponse>(`${ServiciosTsr.RS_MVCH}/reposicion`, datos, this.httpOptions);
  }

  /** Primer fondeo de una caja recién creada (saldo 0, sin movimientos). Mismo payload que `reposicion`. */
  apertura(datos: ReposicionCajaChicaRequest): Observable<ReposicionCajaChicaResponse> {
    return this.http.post<ReposicionCajaChicaResponse>(`${ServiciosTsr.RS_MVCH}/apertura`, datos, this.httpOptions);
  }

  anular(id: number, datos: AnularMovimientoCajaChicaRequest): Observable<any> {
    return this.http.post(`${ServiciosTsr.RS_MVCH}/anular/${id}`, datos, this.httpOptions);
  }

  listar(filtro: MovimientoCajaChicaFiltro): Observable<MovimientoCajaChica[]> {
    let params = new HttpParams().set('idCaja', filtro.idCaja);
    if (filtro.desde) params = params.set('desde', filtro.desde);
    if (filtro.hasta) params = params.set('hasta', filtro.hasta);
    if (filtro.tipo != null) params = params.set('tipo', filtro.tipo);
    if (filtro.estado != null) params = params.set('estado', filtro.estado);
    return this.http.get<MovimientoCajaChica[]>(`${ServiciosTsr.RS_MVCH}/listar`, { params });
  }

  static mensajeError(error: any): string {
    return mensajeDeError(error);
  }
}
