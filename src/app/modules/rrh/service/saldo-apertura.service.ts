import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { empresaSesionCodigo } from '../../../shared/services/empresa-sesion';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
import { SaldoApertura } from '../model/saldo-apertura';
import { ServiciosRhh } from './ws-rrh';

/**
 * Saldos de apertura de la migración (RHH.SLAP), con los cuatro procesos del contrato:
 * cargar el archivo, validar el corte, aplicarlo y revertirlo.
 *
 * No hay endpoint de previsualización: `cargar` persiste las filas con `aplicado = 'N'`, así que
 * la previsualización del asistente es sencillamente consultar lo cargado antes de aplicar.
 *
 * **Los cuatro llevan `idEmpresa`**, porque `SLAP` es multiempresa como toda tabla del módulo:
 * sin él el corte se aplicaría sobre el conjunto equivocado. `usuarioRegistro` va en los tres
 * POST, como clave del cuerpo en `aplicar` y `revertir` y como parte del multipart en `cargar`.
 */
@Injectable({
  providedIn: 'root',
})
export class SaldoAperturaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  selectByCriteria(datos: DatosBusqueda[]): Observable<SaldoApertura[] | null> {
    const url = `${ServiciosRhh.RS_SLAP}/selectByCriteria/`;
    return this.http.post<SaldoApertura[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<SaldoApertura | null> {
    const url = `${ServiciosRhh.RS_SLAP}/${id}`;
    return this.http.delete<SaldoApertura>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  /**
   * POST /rest/slap/cargar — multipart con `archivo`, `idEmpresa`, `fechaCorte` y
   * `usuarioRegistro`. Devuelve el número de saldos cargados.
   */
  cargar(archivo: File, fechaCorte: string): Observable<number> {
    const url = `${ServiciosRhh.RS_SLAP}/cargar`;

    const formData = new FormData();
    formData.append('archivo', archivo, archivo.name);
    formData.append('idEmpresa', String(empresaSesionCodigo() ?? ''));
    formData.append('fechaCorte', fechaCorte);
    formData.append('usuarioRegistro', usuarioSesion());

    // Sin httpOptions: el navegador debe poner el Content-Type con su boundary
    return this.http
      .post<number>(url, formData)
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  /**
   * GET /rest/slap/validar?idEmpresa=&fechaCorte= — devuelve la lista de inconsistencias;
   * vacía = OK.
   */
  validar(fechaCorte: string): Observable<string[]> {
    const url = `${ServiciosRhh.RS_SLAP}/validar`;
    const params = new HttpParams()
      .set('idEmpresa', String(empresaSesionCodigo() ?? ''))
      .set('fechaCorte', fechaCorte);
    return this.http
      .get<string[]>(url, { params })
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  /** POST /rest/slap/aplicar — materializa el corte. Devuelve el número de saldos aplicados. */
  aplicar(fechaCorte: string): Observable<number> {
    return this.corte('/aplicar', fechaCorte);
  }

  /** POST /rest/slap/revertir — deshace el corte. Devuelve el número de saldos revertidos. */
  revertir(fechaCorte: string): Observable<number> {
    return this.corte('/revertir', fechaCorte);
  }

  /** Aplicar y revertir comparten cuerpo: `{idEmpresa, fechaCorte, usuarioRegistro}`. */
  private corte(ruta: string, fechaCorte: string): Observable<number> {
    const url = `${ServiciosRhh.RS_SLAP}${ruta}`;
    const cuerpo = {
      idEmpresa: empresaSesionCodigo(),
      fechaCorte,
      usuarioRegistro: usuarioSesion(),
    };

    return this.http
      .post<number>(url, cuerpo, this.httpOptions)
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  // Manejo de errores HTTP (respetando patrón de of(null) con status 200)
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
