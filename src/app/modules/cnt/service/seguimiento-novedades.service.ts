import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
import { mensajeDeError } from '../../../shared/utils/mensaje-error.util';
import {
  AccionNovedad,
  CuentasPorRegularizar,
  Decision,
  DetalleNovedad,
  FilaBandejaNovedad,
  FilaRequerimiento,
  ReporteActa,
  ResumenMesNovedades,
} from '../model/seguimiento-novedades';
import { ServiciosCnt } from './ws-cnt';

/** Filtros de la bandeja (todos opcionales salvo la empresa). */
export interface FiltrosNovedades {
  anio?: number | null;
  mes?: number | null;
  modulo?: string | null;
  tipo?: string | null;
  estado?: number | null;
  area?: string | null;
  texto?: string | null;
  incluirReemplazadas?: boolean;
}

/**
 * C25 — Seguimiento de novedades. Contrato: saaBE docs/logica-negocio/cnt/C25-SEGUIMIENTO-NOVEDADES.md.
 *
 * Toda escritura manda el usuario de la sesión (`usuarioSesion()` lanza si se perdió: la operación no sigue). Los
 * errores de negocio llegan como 400 con el mensaje del backend y se propagan como texto para mostrarlos tal cual.
 */
@Injectable({ providedIn: 'root' })
export class SeguimientoNovedadesService {
  private http = inject(HttpClient);
  private readonly nvdd = ServiciosCnt.RS_NVDD;
  private readonly rqnv = ServiciosCnt.RS_RQNV;
  private readonly rsnv = ServiciosCnt.RS_RSNV;
  private readonly vnnv = ServiciosCnt.RS_VNNV;
  private readonly adnv = ServiciosCnt.RS_ADNV;
  private readonly dcsn = ServiciosCnt.RS_DCSN;

  // ============================ Consulta (F2) ============================

  bandeja(idEmpresa: number, f: FiltrosNovedades): Observable<FilaBandejaNovedad[]> {
    return this.http.get<FilaBandejaNovedad[]>(`${this.nvdd}/bandeja`, { params: this.filtros(idEmpresa, f) }).pipe(catchError(this.aTexto));
  }

  vistaRequerimientos(idEmpresa: number, f: FiltrosNovedades): Observable<FilaRequerimiento[]> {
    return this.http
      .get<FilaRequerimiento[]>(`${this.nvdd}/vistaRequerimientos`, { params: this.filtros(idEmpresa, f) })
      .pipe(catchError(this.aTexto));
  }

  detalle(idNovedad: number): Observable<DetalleNovedad> {
    return this.http.get<DetalleNovedad>(`${this.nvdd}/${idNovedad}/detalle`).pipe(catchError(this.aTexto));
  }

  resumenMes(idEmpresa: number, anio: number, mes: number): Observable<ResumenMesNovedades> {
    return this.http
      .get<ResumenMesNovedades>(`${this.nvdd}/resumenMes`, { params: this.mes(idEmpresa, anio, mes) })
      .pipe(catchError(this.aTexto));
  }

  cuentasPorRegularizar(idEmpresa: number, anio: number, mes: number): Observable<CuentasPorRegularizar> {
    return this.http
      .get<CuentasPorRegularizar>(`${this.nvdd}/cuentasPorRegularizar`, { params: this.mes(idEmpresa, anio, mes) })
      .pipe(catchError(this.aTexto));
  }

  reporteActa(idEmpresa: number, anio: number, mes: number): Observable<ReporteActa> {
    return this.http.get<ReporteActa>(`${this.nvdd}/reporteActa`, { params: this.mes(idEmpresa, anio, mes) }).pipe(catchError(this.aTexto));
  }

  pendientePorArea(idEmpresa: number, anio: number, mes: number, area?: string | null): Observable<{ texto: string; porArea: any }> {
    let p = this.mes(idEmpresa, anio, mes);
    if (area) p = p.set('area', area);
    return this.http.get<{ texto: string; porArea: any }>(`${this.nvdd}/pendientePorArea`, { params: p }).pipe(catchError(this.aTexto));
  }

  decisiones(): Observable<Decision[]> {
    return this.http.get<Decision[]>(`${this.dcsn}/getAll`).pipe(catchError(this.aTexto));
  }

  textoExpediente(idDecision: number): Observable<{ texto: string }> {
    return this.http.get<{ texto: string }>(`${this.dcsn}/${idDecision}/textoExpediente`).pipe(catchError(this.aTexto));
  }

  // ============================ Carga (F1) ============================

  cargarLote(idEmpresa: number, lote: any, simular: boolean): Observable<any> {
    const params = new HttpParams().set('idEmpresa', idEmpresa).set('usuario', usuarioSesion()).set('simular', simular);
    return this.http.post<any>(`${this.nvdd}/cargaLote`, lote, { params }).pipe(catchError(this.aTexto));
  }

  cargarDecisiones(idEmpresa: number, lote: any, simular: boolean): Observable<any> {
    const params = new HttpParams().set('idEmpresa', idEmpresa).set('usuario', usuarioSesion()).set('simular', simular);
    return this.http.post<any>(`${this.nvdd}/cargaDecisiones`, lote, { params }).pipe(catchError(this.aTexto));
  }

  // ============================ Acciones (F3) ============================

  enviar(idEmpresa: number, anio: number | null, mes: number | null, accion: AccionNovedad): Observable<any> {
    let params = new HttpParams().set('idEmpresa', idEmpresa);
    if (anio) params = params.set('anio', anio);
    if (mes) params = params.set('mes', mes);
    return this.http.post<any>(`${this.nvdd}/enviar`, this.conUsuario(accion), { params }).pipe(catchError(this.aTexto));
  }

  cerrarInformativas(idEmpresa: number, anio: number, mes: number, accion: AccionNovedad): Observable<any> {
    return this.http
      .post<any>(`${this.nvdd}/cerrarInformativas`, this.conUsuario(accion), { params: this.mes(idEmpresa, anio, mes) })
      .pipe(catchError(this.aTexto));
  }

  /** cerrar | reabrir | anular | nuevaVersion | ajuste | vincular */
  accionNovedad(idNovedad: number, accion: 'cerrar' | 'reabrir' | 'anular' | 'nuevaVersion' | 'ajuste' | 'vincular', cuerpo: AccionNovedad): Observable<any> {
    return this.http.post<any>(`${this.nvdd}/${idNovedad}/${accion}`, this.conUsuario(cuerpo)).pipe(catchError(this.aTexto));
  }

  /** responder | noExiste | noAplica | aplicar */
  accionRequerimiento(idRequerimiento: number, accion: 'responder' | 'noExiste' | 'noAplica' | 'aplicar', cuerpo: AccionNovedad): Observable<any> {
    return this.http.post<any>(`${this.rqnv}/${idRequerimiento}/${accion}`, this.conUsuario(cuerpo)).pipe(catchError(this.aTexto));
  }

  /** aceptar | observar */
  revisarRespuesta(idRespuesta: number, accion: 'aceptar' | 'observar', cuerpo: AccionNovedad): Observable<any> {
    return this.http.post<any>(`${this.rsnv}/${idRespuesta}/${accion}`, this.conUsuario(cuerpo)).pipe(catchError(this.aTexto));
  }

  registrarDecision(idEmpresa: number, cuerpo: AccionNovedad): Observable<{ mensaje: string; numero: string; textoExpediente: string; decision: Decision }> {
    return this.http
      .post<any>(`${this.dcsn}/registrar`, this.conUsuario(cuerpo), { params: new HttpParams().set('idEmpresa', idEmpresa) })
      .pipe(catchError(this.aTexto));
  }

  marcarDecisionCopiada(idDecision: number): Observable<Decision> {
    return this.http.post<Decision>(`${this.dcsn}/${idDecision}/copiada`, this.conUsuario({})).pipe(catchError(this.aTexto));
  }

  desvincular(idVinculo: number, motivo: string): Observable<any> {
    return this.http.post<any>(`${this.vnnv}/${idVinculo}/anular`, this.conUsuario({ motivo })).pipe(catchError(this.aTexto));
  }

  registrarAdjunto(cuerpo: AccionNovedad): Observable<any> {
    return this.http.post<any>(`${this.adnv}`, this.conUsuario(cuerpo)).pipe(catchError(this.aTexto));
  }

  marcarAdjuntoCopiado(idAdjunto: number): Observable<any> {
    return this.http.post<any>(`${this.adnv}/${idAdjunto}/copiadoExpediente`, this.conUsuario({})).pipe(catchError(this.aTexto));
  }

  // ============================ Utilidades ============================

  private conUsuario(cuerpo: AccionNovedad): AccionNovedad & { usuario: string } {
    return { ...cuerpo, usuario: usuarioSesion() };
  }

  private mes(idEmpresa: number, anio: number, mes: number): HttpParams {
    return new HttpParams().set('idEmpresa', idEmpresa).set('anio', anio).set('mes', mes);
  }

  private filtros(idEmpresa: number, f: FiltrosNovedades): HttpParams {
    let p = new HttpParams().set('idEmpresa', idEmpresa);
    if (f.anio) p = p.set('anio', f.anio);
    if (f.mes) p = p.set('mes', f.mes);
    if (f.modulo) p = p.set('modulo', f.modulo);
    if (f.tipo) p = p.set('tipo', f.tipo);
    if (f.estado) p = p.set('estado', f.estado);
    if (f.area) p = p.set('area', f.area);
    if (f.texto) p = p.set('texto', f.texto);
    if (f.incluirReemplazadas) p = p.set('incluirReemplazadas', true);
    return p;
  }

  private aTexto = (error: HttpErrorResponse): Observable<never> =>
    throwError(() => mensajeDeError(error, 'Error al comunicarse con el servidor.'));
}
