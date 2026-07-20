import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DocumentoCxp } from '../model/documento-cxp';
import { DetalleCargaTxt } from '../model/detalle-carga-txt';
import { environment } from '../../../../environments/environment';

const PROCESS_URL = `${environment.apiUrl}/carga-documentos`;

export interface ResumenCarga {
  cabecera: any;
  lineas: DetalleCargaTxt[];
}

export interface GrupoProducto {
  id: number;
  nombre: string;
}

export interface ProductoNuevo {
  nombre: string;
  codigo: string;
  codigoAux: string;
  precioUnitario: number;
  idGrupo?: number;
}

@Injectable({ providedIn: 'root' })
export class CargaDocumentosService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  /** FASE 1 — Lee el TXT y crea/actualiza registros en DCXP */
  cargarTxt(payload: {
    contenidoTxt: string;
    nombreArchivo: string;
    idEmpresa: number;
    idUsuario: number;
  }): Observable<any> {
    return this.http.post<any>(`${PROCESS_URL}/cargarTxt`, payload, this.httpOptions).pipe(catchError(this.handleError));
  }

  /** Consulta resumen de una carga (cabecera + lineas con DocumentoCxp embebido) */
  getResumen(idCargaTxt: number): Observable<ResumenCarga | null> {
    return this.http.get<ResumenCarga>(`${PROCESS_URL}/resumen/${idCargaTxt}`).pipe(catchError(this.handleError));
  }

  /** Consulta un DocumentoCxp específico */
  getDocumento(idDocumentoCxp: number): Observable<DocumentoCxp | null> {
    return this.http.get<DocumentoCxp>(`${PROCESS_URL}/documento/${idDocumentoCxp}`).pipe(catchError(this.handleError));
  }

  /** Consulta novedades pendientes de una empresa — retorna DocumentoCxp[] con estadoDocumento=5 */
  getNovedades(idEmpresa: number): Observable<DocumentoCxp[] | null> {
    return this.http.get<DocumentoCxp[]>(`${PROCESS_URL}/novedades/${idEmpresa}`).pipe(catchError(this.handleError));
  }

  /** Consulta grupos de productos disponibles */
  getGruposProducto(): Observable<GrupoProducto[] | null> {
    return this.http.get<GrupoProducto[]>(`${PROCESS_URL}/gruposProducto`).pipe(catchError(this.handleError));
  }

  /** FASE 2 — Sube el XML de un documento (idDocumentoCxp = ID de DCXP) */
  cargarXml(idDocumentoCxp: number, payload: {
    contenidoXml: string;
    idUsuario: number;
  }): Observable<DocumentoCxp | null> {
    return this.http.post<DocumentoCxp>(`${PROCESS_URL}/cargarXml/${idDocumentoCxp}`, payload, this.httpOptions).pipe(catchError(this.handleError));
  }

  /** FASE 3 — Registra el documento en las tablas CXP */
  registrarBD(idDocumentoCxp: number, payload: {
    idEmpresa: number;
    idUsuario: number;
  }): Observable<any> {
    return this.http.post<any>(`${PROCESS_URL}/registrarBD/${idDocumentoCxp}`, payload, this.httpOptions).pipe(catchError(this.handleError));
  }

  /** FASE 3b — Crea productos faltantes y registra en BD */
  crearProductosYRegistrar(idDocumentoCxp: number, payload: {
    idEmpresa: number;
    idUsuario: number;
    productosConGrupo: ProductoNuevo[];
  }): Observable<any> {
    return this.http.post<any>(`${PROCESS_URL}/crearProductosYRegistrar/${idDocumentoCxp}`, payload, this.httpOptions).pipe(catchError(this.handleError));
  }

  /** FASE 4 — Resuelve una novedad (MANTENER o REEMPLAZAR) */
  resolverNovedad(idDocumentoCxp: number, payload: {
    accion: 'MANTENER' | 'REEMPLAZAR';
    contenidoXml?: string;
    idUsuario: number;
  }): Observable<any> {
    return this.http.post<any>(`${PROCESS_URL}/resolverNovedad/${idDocumentoCxp}`, payload, this.httpOptions).pipe(catchError(this.handleError));
  }

  /** FASE 5 — Revierte un documento ya registrado en BD */
  revertir(idDocumentoCxp: number, idUsuario: number): Observable<any> {
    return this.http.post<any>(`${PROCESS_URL}/revertir/${idDocumentoCxp}`, { idUsuario }, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
