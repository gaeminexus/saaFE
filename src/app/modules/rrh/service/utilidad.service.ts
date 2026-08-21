import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { empresaSesionCodigo } from '../../../shared/services/empresa-sesion';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
import { DetalleUtilidad, Utilidad } from '../model/utilidad';
import { ServiciosRhh } from './ws-rrh';

/**
 * Reparto de utilidades (`RHH.UTLD` y `RHH.DTUT`).
 *
 * `calcular` está construido completo aunque ASOPREP no reparta: el backend rechaza la operación
 * mientras `CFNM.CFNMAPUT` esté en `'N'`, y ese rechazo llega a la pantalla como mensaje, no como
 * un botón que no hace nada.
 */
@Injectable({ providedIn: 'root' })
export class UtilidadService {
  private readonly httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Utilidad[] | null> {
    return this.http
      .get<Utilidad[]>(`${ServiciosRhh.RS_UTLD}/getAll`)
      .pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<Utilidad | null> {
    return this.http
      .get<Utilidad>(`${ServiciosRhh.RS_UTLD}/getId/${id}`)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<Utilidad[] | null> {
    return this.http
      .post<Utilidad[]>(`${ServiciosRhh.RS_UTLD}/selectByCriteria`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** `POST /rest/utld/calcular` — reparte la utilidad contable del ejercicio. */
  calcular(anio: number, utilidadContable: number): Observable<Utilidad> {
    const cuerpo = {
      idEmpresa: empresaSesionCodigo(),
      anio,
      utilidadContable,
      usuarioRegistro: usuarioSesion(),
    };

    return this.http
      .post<Utilidad>(`${ServiciosRhh.RS_UTLD}/calcular`, cuerpo, this.httpOptions)
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  /** Reparto por colaborador del ejercicio. */
  detalle(datos: any): Observable<DetalleUtilidad[] | null> {
    return this.http
      .post<DetalleUtilidad[]>(`${ServiciosRhh.RS_DTUT}/selectByCriteria`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) return of(null);
    return throwError(() => error.error || error);
  }
}
