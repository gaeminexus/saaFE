import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError, tap, switchMap, map } from 'rxjs';
import { PlanCuenta } from '../model/plan-cuenta';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class PlanCuentaService {
  private static readonly EMPRESA_CODIGO = 280;

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<PlanCuenta[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_PLNN}${wsGetById}`;
    return this.http.get<PlanCuenta[]>(url).pipe(
      map((items: PlanCuenta[]) =>
        (items || []).filter(p => p?.empresa?.codigo === PlanCuentaService.EMPRESA_CODIGO)
      ),
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<PlanCuenta | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_PLNN}${wsGetById}${id}`;
    return this.http.get<PlanCuenta>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<PlanCuenta | null> {
    // Asegurar empresa 280 en el plan de cuenta
    const datosConEmpresa = {
      ...datos,
      empresa: { codigo: PlanCuentaService.EMPRESA_CODIGO }
    };

    // 📌 DEBUG: Registro antes de enviar creación
    console.log('[PlanCuentaService.add] Enviando POST /plnn', {
      url: ServiciosCnt.RS_PLNN,
      payload: datosConEmpresa
    });
    const base = ServiciosCnt.RS_PLNN;
    const attempts = [
      () => this.http.post<PlanCuenta>(base, datosConEmpresa, this.httpOptions),
      () => this.http.post<PlanCuenta>(base + '/add', datosConEmpresa, this.httpOptions),
      () => this.http.post<PlanCuenta>(base + '/create', datosConEmpresa, this.httpOptions),
      () => this.http.post<PlanCuenta>(base + '/save', datosConEmpresa, this.httpOptions)
    ];

    let idx = 0;
    const tryNext = (): Observable<PlanCuenta> => {
      const fn = attempts[idx];
      return fn().pipe(
        tap(resp => console.log(`[PlanCuentaService.add] Éxito endpoint intento ${idx+1}`, resp)),
        catchError(err => {
          console.warn(`[PlanCuentaService.add] Falló intento ${idx+1}`, err);
          idx++;
            if (idx < attempts.length) {
              return tryNext();
            }
            console.error('[PlanCuentaService.add] Todos los intentos de creación fallaron');
            return throwError(() => err);
        })
      );
    };

    return tryNext().pipe(
      catchError(err => this.handleError(err))
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<PlanCuenta | null> {
    // Asegurar empresa 280 en el plan de cuenta
    const datosConEmpresa = {
      ...datos,
      empresa: { codigo: PlanCuentaService.EMPRESA_CODIGO }
    };

    // 📌 DEBUG: Registro antes de enviar actualización
    console.log('[PlanCuentaService.update] Enviando PUT /plnn', {
      url: ServiciosCnt.RS_PLNN,
      payload: datosConEmpresa
    });
    return this.http.put<PlanCuenta>(ServiciosCnt.RS_PLNN, datosConEmpresa, this.httpOptions).pipe(
      // tap(resp => console.log('[PlanCuentaService.update] Respuesta OK', resp)),
      catchError(err => {
        console.error('[PlanCuentaService.update] Error en PUT', err);
        return this.handleError(err);
      })
    );
  }

  selectByCriteria(datos: any): Observable<PlanCuenta[] | null> {
    const base = ServiciosCnt.RS_PLNN;
    const try1 = `${base}/selectByCriteria`;
    const try2 = `${base}/selectByCriteria/`;
    const try3 = `${base}/criteria`;
    const try4 = `${base}/getAll`;

    // Forzar filtro de empresa en el request
    const criteriosConEmpresa = { ...datos, empresa: { codigo: PlanCuentaService.EMPRESA_CODIGO } };

    return this.http.post<PlanCuenta[]>(try1, criteriosConEmpresa, this.httpOptions).pipe(
      // Fallbacks de ruta/método comunes en este backend
      catchError(() => this.http.post<PlanCuenta[]>(try2, criteriosConEmpresa, this.httpOptions)),
      catchError(() => this.http.post<PlanCuenta[]>(try3, criteriosConEmpresa, this.httpOptions)),
      catchError(() => this.http.get<PlanCuenta[]>(try4, this.httpOptions)),
      map((items: PlanCuenta[]) =>
        (items || []).filter(p => p?.empresa?.codigo === PlanCuentaService.EMPRESA_CODIGO)
      ),
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<PlanCuenta | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_PLNN}${wsGetById}`;
    return this.http.delete<PlanCuenta>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  // tslint:disable-next-line: typedef
  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }

}
