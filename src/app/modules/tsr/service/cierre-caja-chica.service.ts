import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error.util';
import {
  AnularCierreRequest,
  CierreCajaChica,
  ConfirmarCierreRequest,
  PrepararCierreRequest,
  PrepararCierreResponse,
} from '../model/cierre-caja-chica';
import { MovimientoCajaChica } from '../model/movimiento-caja-chica';
import { ServiciosTsr } from './ws-tsr';
import { idUsuarioSesionObligatorio } from '../../../shared/services/usuario-sesion';

@Injectable({ providedIn: 'root' })
export class CierreCajaChicaService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  /** Arma el borrador del cierre (período, saldo inicial, totales, movimientos) sin confirmarlo. */
  preparar(datos: PrepararCierreRequest): Observable<PrepararCierreResponse> {
    return this.http.post<PrepararCierreResponse>(`${ServiciosTsr.RS_CRCH}/preparar`, { ...datos, idUsuario: idUsuarioSesionObligatorio() }, this.httpOptions);
  }

  confirmar(id: number, datos: ConfirmarCierreRequest): Observable<CierreCajaChica> {
    return this.http.post<CierreCajaChica>(`${ServiciosTsr.RS_CRCH}/confirmar/${id}`, { ...datos, idUsuario: idUsuarioSesionObligatorio() }, this.httpOptions);
  }

  anular(id: number, datos: AnularCierreRequest): Observable<any> {
    return this.http.post(`${ServiciosTsr.RS_CRCH}/anular/${id}`, { ...datos, idUsuario: idUsuarioSesionObligatorio() }, this.httpOptions);
  }

  listar(idCaja: number): Observable<CierreCajaChica[]> {
    return this.http.get<CierreCajaChica[]>(`${ServiciosTsr.RS_CRCH}/listar/${idCaja}`);
  }

  movimientos(idCierre: number): Observable<MovimientoCajaChica[]> {
    return this.http.get<MovimientoCajaChica[]>(`${ServiciosTsr.RS_CRCH}/movimientos/${idCierre}`);
  }

  static mensajeError(error: any): string {
    return mensajeDeError(error);
  }
}
