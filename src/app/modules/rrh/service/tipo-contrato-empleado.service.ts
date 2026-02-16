import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TipoContratoEmpleado } from '../model/tipo-contrato-empleado';
import { ServiciosRhh } from './ws-rrh';

@Injectable({
  providedIn: 'root',
})
export class TipoContratoEmpleadoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<TipoContratoEmpleado[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_TPCE}${wsGetById}`;
    console.log('🔍 [TipoContratoEmpleadoService] getAll');
    console.log('   📍 RS_TPCE:', ServiciosRhh.RS_TPCE);
    console.log('   🔗 URL completa:', url);
    console.log('   📊 Headers:', this.httpOptions.headers);
    return this.http.get<TipoContratoEmpleado[]>(url, this.httpOptions).pipe(
      catchError((error) => {
        console.error('❌ getAll ERROR:', error);
        console.error('   Status:', error.status);
        console.error('   Message:', error.message);
        return this.handleError(error);
      }),
    );
  }

  getById(id: string): Observable<TipoContratoEmpleado | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_TPCE}${wsGetById}${id}`;
    console.log('[TipoContratoEmpleadoService] getById url', url, { id });
    return this.http.get<TipoContratoEmpleado>(url).pipe(catchError(this.handleError));
  }

  /** POST: add new record */
  add(datos: any): Observable<TipoContratoEmpleado | null> {
    console.log('➕ [TipoContratoEmpleadoService] add');
    console.log('   🔗 URL:', ServiciosRhh.RS_TPCE);
    console.log('   📦 Payload:', JSON.stringify(datos, null, 2));
    console.log('   📊 Headers:', this.httpOptions.headers);
    return this.http.post<TipoContratoEmpleado>(ServiciosRhh.RS_TPCE, datos, this.httpOptions).pipe(
      catchError((error) => {
        console.error('❌ add ERROR:', error);
        console.error('   Status:', error.status, error.statusText);
        console.error('   URL que falló:', ServiciosRhh.RS_TPCE);
        console.error('   Payload enviado:', datos);
        return this.handleError(error);
      }),
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TipoContratoEmpleado | null> {
    console.log('[TipoContratoEmpleadoService] update url', ServiciosRhh.RS_TPCE);
    console.log('[TipoContratoEmpleadoService] update payload', datos);
    return this.http
      .put<TipoContratoEmpleado>(ServiciosRhh.RS_TPCE, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos?: any): Observable<TipoContratoEmpleado[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_TPCE}${wsEndpoint}`;
    const payload = Array.isArray(datos) ? datos : [];
    console.log('🔍 [TipoContratoEmpleadoService] selectByCriteria');
    console.log('   🔗 URL:', url);
    console.log('   📦 Criterios:', JSON.stringify(payload, null, 2));
    return this.http.post<TipoContratoEmpleado[]>(url, payload, this.httpOptions).pipe(
      catchError((error) => {
        console.error('❌ selectByCriteria ERROR:', error);
        console.error('   Status:', error.status, error.statusText);
        console.error('   URL que falló:', url);
        return this.handleError(error);
      }),
    );
  }

  /** DELETE */
  delete(id: any): Observable<TipoContratoEmpleado | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_TPCE}${wsEndpoint}`;
    console.log('[TipoContratoEmpleadoService] delete url', url, { id });
    return this.http
      .delete<TipoContratoEmpleado>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
