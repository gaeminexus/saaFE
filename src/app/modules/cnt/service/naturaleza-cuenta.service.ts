import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { NaturalezaCuenta } from '../model/naturaleza-cuenta';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root',
})
export class NaturalezaCuentaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<NaturalezaCuenta[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_NTRL}${wsGetById}`;
    return this.http.get<NaturalezaCuenta[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<NaturalezaCuenta | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_NTRL}${wsGetById}${id}`;
    return this.http.get<NaturalezaCuenta>(url).pipe(catchError(this.handleError));
  }

  getByEmpresa(idEmpresa: number): Observable<NaturalezaCuenta[] | null> {
    const wsGetById = '/getByEmpresa/';
    const url = `${ServiciosCnt.RS_NTRL}${wsGetById}${idEmpresa}`;
    return this.http.get<NaturalezaCuenta[]>(url).pipe(catchError(this.handleError));
  }

  validaTieneCuentas(idNaturaleza: number): Observable<number | null> {
    const wsvalidaTieneCuentas = '/validaTieneCuentas/';
    const url = `${ServiciosCnt.RS_NTRL}${wsvalidaTieneCuentas}${idNaturaleza}`;
    return this.http.get<number>(url).pipe(catchError(this.handleError));
  }

  /** POST: crear Naturaleza de Cuenta (con fallback de endpoints) */
  add(datos: any): Observable<NaturalezaCuenta | null> {
    // Transformar manejaCentroCosto de booleano a número si es necesario
    const datosTransformados = {
      ...datos,
      manejaCentroCosto: datos.manejaCentroCosto === true || datos.manejaCentroCosto === 1 ? 1 : 0,
    };

    const base = ServiciosCnt.RS_NTRL;
    // Intento principal: POST al recurso base (patrón observado en otros servicios)
    return this.http.post<NaturalezaCuenta>(base, datosTransformados, this.httpOptions).pipe(
      // Fallback alterno: POST /save si existe
      catchError(() =>
        this.http.post<NaturalezaCuenta>(`${base}/save`, datosTransformados, this.httpOptions)
      ),
      catchError(this.handleError)
    );
  }

  /** PUT: actualizar Naturaleza de Cuenta (con fallback de endpoints) */
  update(datos: any): Observable<NaturalezaCuenta | null> {
    // Transformar manejaCentroCosto de booleano a número si es necesario
    const datosTransformados = {
      ...datos,
      manejaCentroCosto: datos.manejaCentroCosto === true || datos.manejaCentroCosto === 1 ? 1 : 0,
    };

    const base = ServiciosCnt.RS_NTRL;
    // Intento principal: PUT al recurso base (patrón consistente con otros servicios)
    return this.http.put<NaturalezaCuenta>(base, datosTransformados, this.httpOptions).pipe(
      // Fallback 1: POST al recurso base (algunos backends usan POST para upsert)
      catchError((err) =>
        this.http.post<NaturalezaCuenta>(base, datosTransformados, this.httpOptions)
      ),
      // Fallback 2: POST /update (caso de implementación alternativa)
      catchError(() =>
        this.http.post<NaturalezaCuenta>(`${base}/update`, datosTransformados, this.httpOptions)
      ),
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<NaturalezaCuenta[] | null> {
    const wsGetById = '/selectByCriteria';
    const url = `${ServiciosCnt.RS_NTRL}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  inactivaNaturalezaCuenta(datos: any): Observable<string | null> {
    const wsGetById = '/inactivaNaturalezaCuenta';
    const url = `${ServiciosCnt.RS_NTRL}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<string | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_NTRL}${wsGetById}`;
    return this.http
      .delete<string>(url, { ...this.httpOptions, responseType: 'text' as 'json' })
      .pipe(catchError(this.handleError));
  }

  // tslint:disable-next-line: typedef
  private handleError(error: HttpErrorResponse): Observable<null> {
    // Si el backend devuelve 200, no es un error, dejar que siga el flujo normal
    // Solo manejar errores reales (4xx, 5xx)
    return throwError(() => error?.error ?? error);
  }
}
