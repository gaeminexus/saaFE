import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CargaArchivoTxt } from '../model/carga-archivo-txt';
import { ServiciosCxp } from './ws-cxp';

/**
 * Filtros de GET /crtx/buscar (docs/cxp/API-CARGAS-TXT-BANDEJA-ELECTRONICA.md §2).
 * `idEmpresa` es el único obligatorio; el resto acota. `limite` por defecto 100 en el backend,
 * máximo 500.
 */
export interface BuscarCargasTxtParams {
  idEmpresa: number;
  desde?: string;
  hasta?: string;
  idPeriodo?: number;
  nombreArchivo?: string;
  estado?: number;
  limite?: number;
}

/**
 * Fila de GET /crtx/buscar — más recientes primero. `registrados`/`pendientes` pueden venir
 * `null` (el backend los omite si contarlos encarece la consulta): la pantalla no debe asumir
 * un valor cuando sea así.
 */
export interface ResumenCargaTxt {
  idCarga: number;
  fechaCarga: string;
  nombreArchivo: string;
  totalLeidos: number;
  nuevos: number;
  duplicados: number;
  novedades: number;
  estado: number;
  estadoTexto: string;
  usuario: string;
  periodo: { idPeriodo: number; nombre: string } | null;
  registrados: number | null;
  pendientes: number | null;
}

@Injectable({ providedIn: 'root' })
export class CargaArchivoTxtService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  /**
   * GET /crtx/buscar — reemplaza a `getByEmpresa` para la consulta de cargas: ese endpoint viejo
   * trae las 300 y pico sin filtro ni tope. 404 (WAR viejo, endpoint todavía no existe) se
   * propaga como error — nunca se convierte en lista vacía silenciosa.
   */
  buscar(filtros: BuscarCargasTxtParams): Observable<ResumenCargaTxt[] | null> {
    let params = new HttpParams().set('idEmpresa', filtros.idEmpresa);
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros.idPeriodo != null) params = params.set('idPeriodo', filtros.idPeriodo);
    if (filtros.nombreArchivo) params = params.set('nombreArchivo', filtros.nombreArchivo);
    if (filtros.estado != null) params = params.set('estado', filtros.estado);
    if (filtros.limite != null) params = params.set('limite', filtros.limite);
    return this.http.get<ResumenCargaTxt[]>(`${ServiciosCxp.RS_CRTX}/buscar`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  getAll(): Observable<CargaArchivoTxt[] | null> {
    return this.http.get<CargaArchivoTxt[]>(`${ServiciosCxp.RS_CRTX}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<CargaArchivoTxt | null> {
    return this.http.get<CargaArchivoTxt>(`${ServiciosCxp.RS_CRTX}/getId/${id}`).pipe(catchError(this.handleError));
  }

  getByEmpresa(idEmpresa: number): Observable<CargaArchivoTxt[] | null> {
    return this.http.get<CargaArchivoTxt[]>(`${ServiciosCxp.RS_CRTX}/getByEmpresa/${idEmpresa}`).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<CargaArchivoTxt[] | null> {
    return this.http.post<CargaArchivoTxt[]>(`${ServiciosCxp.RS_CRTX}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
