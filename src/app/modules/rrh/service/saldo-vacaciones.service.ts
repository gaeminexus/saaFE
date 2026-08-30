import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosRhh } from './ws-rrh';
import {
  AcreditarVacacionesRequest,
  RevertirAcreditacionVacacionesRequest,
  SaldoVacaciones,
} from '../model/saldo-vacaciones';

@Injectable({
  providedIn: 'root',
})
export class SaldoVacacionesService {


 httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<SaldoVacaciones[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_SLDV}${wsGetById}`;
    return this.http.get<SaldoVacaciones[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<SaldoVacaciones | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_SLDV}${wsGetById}${id}`;
    return this.http.get<SaldoVacaciones>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Total de días disponibles del empleado sumando todos los años no caducados
   * (SaldoVacacionesDaoServiceImpl.selectDisponibles, consumo FIFO por año). No filtrar
   * por año de la solicitud: el saldo se acumula y se consume del más antiguo primero.
   */
  disponible(idEmpleado: number): Observable<number> {
    const url = `${ServiciosRhh.RS_SLDV}/disponible/${idEmpleado}`;
    return this.http.get<number>(url).pipe(
      catchError(() => of(0))
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<SaldoVacaciones | null> {
    return this.http.post<SaldoVacaciones>(ServiciosRhh.RS_SLDV, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<SaldoVacaciones | null> {
    return this.http.put<SaldoVacaciones>(ServiciosRhh.RS_SLDV, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<SaldoVacaciones[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_SLDV}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Proceso anual: acredita el período de vacaciones a los empleados que
   * cumplieron un año de servicio hasta `fechaCorte`. Responde con el número
   * de empleados acreditados (200) o texto plano de error (500) — el error
   * se deja pasar sin transformar (no `handleError`, que devuelve `null` y
   * no encaja con `Observable<number>`) para que el componente lea el texto
   * real con `mensajeDeError`.
   */
  acreditar(datos: AcreditarVacacionesRequest): Observable<number> {
    const url = `${ServiciosRhh.RS_SLDV}/acreditar`;
    return this.http.post<number>(url, datos, this.httpOptions);
  }

  /**
   * Contraparte de {@link acreditar} — POST /sldv/revertirAcreditacion. Borra los saldos de
   * `(idEmpresa, anio)`; responde con el número de saldos borrados (200) o texto plano de error
   * (500, todo o nada) — igual que `acreditar`, sin `handleError` para que el componente lea el
   * texto real con `mensajeDeError`.
   */
  revertirAcreditacion(datos: RevertirAcreditacionVacacionesRequest): Observable<number> {
    const url = `${ServiciosRhh.RS_SLDV}/revertirAcreditacion`;
    return this.http.post<number>(url, datos, this.httpOptions);
  }

  /** DELETE */
  delete(id: any): Observable<SaldoVacaciones | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_SLDV}${wsEndpoint}`;
    return this.http.delete<SaldoVacaciones>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }

}


