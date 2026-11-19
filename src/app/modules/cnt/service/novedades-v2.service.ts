import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
import { mensajeDeError } from '../../../shared/utils/mensaje-error.util';
import {
  AccionV2,
  CandidatosHechoV2,
  HechoEntradaV2,
  OrigenCandidatoV2,
  CuentaContableV2,
  CuotaV2,
  DecisionV2,
  DetalleNovedadV2,
  FilaNovedadV2,
  ParticipeV2,
  PrestamoV2,
  ResultadoAccionV2,
  ResumenV2,
} from '../model/novedades-v2';
import { ServiciosCnt } from './ws-cnt';

export interface FiltrosV2 {
  anio?: number | null;
  mes?: number | null;
  grupo?: string | null;
  area?: string | null;
  estado?: string | null;
  texto?: string | null;
}

/**
 * C34 — Seguimiento de Novedades v2 (REST /nvdd2). Toda escritura manda el usuario de la sesión; los errores de
 * negocio llegan como texto para mostrarlos tal cual (ya vienen escritos para el usuario final).
 */
@Injectable({ providedIn: 'root' })
export class NovedadesV2Service {
  private http = inject(HttpClient);
  private readonly url = ServiciosCnt.RS_NVDD2;

  resumen(idEmpresa: number, anio?: number | null, mes?: number | null): Observable<ResumenV2> {
    return this.http.get<ResumenV2>(`${this.url}/resumen`, { params: this.params({ idEmpresa, anio, mes }) }).pipe(catchError(this.aTexto));
  }

  bandeja(idEmpresa: number, f: FiltrosV2): Observable<FilaNovedadV2[]> {
    return this.http.get<FilaNovedadV2[]>(`${this.url}/bandeja`, { params: this.params({ idEmpresa, ...f }) }).pipe(catchError(this.aTexto));
  }

  fila(idNovedad: number): Observable<FilaNovedadV2> {
    return this.http.get<FilaNovedadV2>(`${this.url}/${idNovedad}/fila`).pipe(catchError(this.aTexto));
  }

  detalle(idNovedad: number): Observable<DetalleNovedadV2> {
    return this.http.get<DetalleNovedadV2>(`${this.url}/${idNovedad}/detalle`).pipe(catchError(this.aTexto));
  }

  buscarDecisiones(idEmpresa: number, idNovedad: number | null, texto: string): Observable<DecisionV2[]> {
    return this.http
      .get<DecisionV2[]>(`${this.url}/buscar/decisiones`, { params: this.params({ idEmpresa, idNovedad, texto }) })
      .pipe(catchError(this.aTexto));
  }

  buscarCuentas(idEmpresa: number, texto: string): Observable<CuentaContableV2[]> {
    return this.http.get<CuentaContableV2[]>(`${this.url}/buscar/cuentas`, { params: this.params({ idEmpresa, texto }) }).pipe(catchError(this.aTexto));
  }

  buscarPrestamos(texto: string): Observable<PrestamoV2[]> {
    return this.http.get<PrestamoV2[]>(`${this.url}/buscar/prestamos`, { params: this.params({ texto }) }).pipe(catchError(this.aTexto));
  }

  buscarParticipes(texto: string): Observable<ParticipeV2[]> {
    return this.http.get<ParticipeV2[]>(`${this.url}/buscar/participes`, { params: this.params({ texto }) }).pipe(catchError(this.aTexto));
  }

  cuotas(idPrestamo: number): Observable<CuotaV2[]> {
    return this.http.get<CuotaV2[]>(`${this.url}/prestamo/${idPrestamo}/cuotas`).pipe(catchError(this.aTexto));
  }

  justificar(a: AccionV2): Observable<ResultadoAccionV2> {
    return this.http.post<ResultadoAccionV2>(`${this.url}/justificar`, this.conUsuario(a)).pipe(catchError(this.aTexto));
  }

  anularJustificacion(id: number, motivo: string): Observable<ResultadoAccionV2> {
    return this.http.post<ResultadoAccionV2>(`${this.url}/justificaciones/${id}/anular`, this.conUsuario({ motivo })).pipe(catchError(this.aTexto));
  }

  responder(idPedido: number, a: AccionV2): Observable<ResultadoAccionV2> {
    return this.http.post<ResultadoAccionV2>(`${this.url}/pedidos/${idPedido}/responder`, this.conUsuario(a)).pipe(catchError(this.aTexto));
  }

  anularRespuesta(id: number, motivo: string): Observable<ResultadoAccionV2> {
    return this.http.post<ResultadoAccionV2>(`${this.url}/respuestas/${id}/anular`, this.conUsuario({ motivo })).pipe(catchError(this.aTexto));
  }

  cerrar(idNovedad: number, comentario: string | null): Observable<ResultadoAccionV2> {
    return this.http.post<ResultadoAccionV2>(`${this.url}/${idNovedad}/cerrar`, this.conUsuario({ motivo: comentario })).pipe(catchError(this.aTexto));
  }

  darPorConocidas(ids: number[], comentario: string | null): Observable<ResultadoAccionV2> {
    return this.http
      .post<ResultadoAccionV2>(`${this.url}/informativas/conocidas`, this.conUsuario({ ids, motivo: comentario }))
      .pipe(catchError(this.aTexto));
  }

  reabrir(idNovedad: number, motivo: string): Observable<ResultadoAccionV2> {
    return this.http.post<ResultadoAccionV2>(`${this.url}/${idNovedad}/reabrir`, this.conUsuario({ motivo })).pipe(catchError(this.aTexto));
  }

  exportar(idEmpresa: number, anio: number | null, mes: number | null, formato: 'asoprep' | 'reproceso'): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/exportar`, { params: this.params({ idEmpresa, anio, mes, formato }) }).pipe(catchError(this.aTexto));
  }

  // ---- C34d: hechos de crédito

  origenes(idEmpresa: number, f: { fuente: string; idPrestamo?: number | null; idEntidad?: number | null; texto?: string | null; desde?: string | null; hasta?: string | null; valor?: number | null; fecha?: string | null }): Observable<OrigenCandidatoV2[]> {
    return this.http.get<OrigenCandidatoV2[]>(`${this.url}/origenes`, { params: this.params({ idEmpresa, ...f }) }).pipe(catchError(this.aTexto));
  }

  candidatosHecho(idEmpresa: number, idPrestamo: number): Observable<CandidatosHechoV2> {
    return this.http.get<CandidatosHechoV2>(`${this.url}/hechos/candidatos`, { params: this.params({ idEmpresa, idPrestamo }) }).pipe(catchError(this.aTexto));
  }

  registrarHecho(h: HechoEntradaV2): Observable<ResultadoAccionV2 & { idHecho: number }> {
    return this.http.post<ResultadoAccionV2 & { idHecho: number }>(`${this.url}/hechos`, { ...h, usuario: usuarioSesion() }).pipe(catchError(this.aTexto));
  }

  anularHecho(idHecho: number, motivo: string): Observable<ResultadoAccionV2> {
    return this.http.post<ResultadoAccionV2>(`${this.url}/hechos/${idHecho}/anular`, { motivo, usuario: usuarioSesion() }).pipe(catchError(this.aTexto));
  }

  exportarHechos(idEmpresa: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.url}/exportar/hechos`, { params: this.params({ idEmpresa }) }).pipe(catchError(this.aTexto));
  }

  private conUsuario(a: AccionV2): AccionV2 & { usuario: string } {
    return { ...a, usuario: usuarioSesion() };
  }

  private params(o: Record<string, any>): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(o)) {
      if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
    }
    return p;
  }

  private aTexto = (error: HttpErrorResponse): Observable<never> =>
    throwError(() => mensajeDeError(error, 'Error al comunicarse con el servidor.'));
}
