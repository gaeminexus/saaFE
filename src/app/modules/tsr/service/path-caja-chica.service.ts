import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error.util';
import { PathCajaChica } from '../model/path-caja-chica';
import { ServiciosTsr } from './ws-tsr';

@Injectable({ providedIn: 'root' })
export class PathCajaChicaService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  /** Registra el adjunto ya subido (ver FileService.uploadFileCustomPath) contra su movimiento. */
  add(datos: Partial<PathCajaChica>): Observable<PathCajaChica> {
    return this.http.post<PathCajaChica>(ServiciosTsr.RS_PTCH, datos, this.httpOptions);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${ServiciosTsr.RS_PTCH}/${id}`, this.httpOptions);
  }

  porMovimiento(idMovimiento: number): Observable<PathCajaChica[]> {
    return this.http.get<PathCajaChica[]>(`${ServiciosTsr.RS_PTCH}/porMovimiento/${idMovimiento}`);
  }

  static mensajeError(error: any): string {
    return mensajeDeError(error);
  }
}
