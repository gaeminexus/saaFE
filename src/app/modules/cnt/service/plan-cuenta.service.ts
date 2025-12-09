import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError, map } from 'rxjs';
import { PlanCuenta } from '../model/plan-cuenta';
import { ServiciosCnt } from './ws-cnt';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';

@Injectable({
  providedIn: 'root'
})
export class PlanCuentaService {
  // Obtener empresa desde localStorage
  private get idSucursal(): number {
    return parseInt(localStorage.getItem('idSucursal') || '280', 10);
  }

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
        (items || []).filter(p => p?.empresa?.codigo === this.idSucursal)
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

  /** POST: add a new plan cuenta to the server */
  add(datos: any): Observable<PlanCuenta | null> {
    // Preparar datos para creación - NO enviar codigo si es 0
    const payload: any = {
      nombre: datos.nombre,
      cuentaContable: datos.cuentaContable,
      tipo: datos.tipo,
      nivel: datos.nivel,
      estado: datos.estado,
      idPadre: datos.idPadre,
      naturalezaCuenta: datos.naturalezaCuenta,
      empresa: { codigo: this.idSucursal },
      fechaUpdate: this.formatDateToLocalDate(new Date())
    };

    // Agregar fechaInactivo solo si el estado es inactivo (0)
    if (datos.estado === 0) {
      payload.fechaInactivo = this.formatDateToLocalDate(new Date());
    }

    // Solo incluir codigo si existe y no es 0
    if (datos.codigo && datos.codigo !== 0) {
      payload.codigo = datos.codigo;
    }

    return this.http.post<PlanCuenta>(ServiciosCnt.RS_PLNN, payload, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update an existing plan cuenta */
  update(datos: any): Observable<PlanCuenta | null> {
    // Preparar payload para actualización - DEBE incluir codigo
    const payload: any = {
      codigo: datos.codigo,
      nombre: datos.nombre,
      cuentaContable: datos.cuentaContable,
      tipo: datos.tipo,
      nivel: datos.nivel,
      estado: datos.estado,
      idPadre: datos.idPadre,
      naturalezaCuenta: datos.naturalezaCuenta,
      empresa: { codigo: this.idSucursal },
      fechaUpdate: this.formatDateToLocalDate(new Date())
    };

    // Agregar fechaInactivo solo si el estado es inactivo (0)
    if (datos.estado === 0) {
      payload.fechaInactivo = this.formatDateToLocalDate(new Date());
    }

    console.log('[PlanCuentaService.update] Payload enviado:', JSON.stringify(payload, null, 2));

    return this.http.put<PlanCuenta>(ServiciosCnt.RS_PLNN, payload, this.httpOptions).pipe(
      catchError(err => {
        console.error('[PlanCuentaService.update] Error:', err);
        console.error('[PlanCuentaService.update] Payload que causó error:', payload);
        return this.handleError(err);
      })
    );
  }

  /** POST: search by criteria using DatosBusqueda[] */
  selectByCriteria(criterios: DatosBusqueda[]): Observable<PlanCuenta[] | null> {
    const url = `${ServiciosCnt.RS_PLNN}/selectByCriteria`;
    
    return this.http.post<PlanCuenta[]>(url, criterios, this.httpOptions).pipe(
      map((items: PlanCuenta[]) =>
        (items || []).filter(p => p?.empresa?.codigo === this.idSucursal)
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

  /**
   * Convierte Date a formato YYYY-MM-DD para compatibilidad con LocalDate del backend
   */
  private formatDateToLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

}
