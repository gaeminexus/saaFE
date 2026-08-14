import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { EventoPrestamo } from '../model/pagos/operaciones-pago';
import { ServiciosCrd } from './ws-crd';

/**
 * Historial de operaciones de pago de un préstamo (EVPR). Solo lectura: los eventos los escriben
 * únicamente los procesos de pago de `OperacionesPagoPrestamoService`.
 *
 * Estos endpoints son CRUD estándar y devuelven la entidad SIN el sobre `{exito, resultado}`.
 */
@Injectable({ providedIn: 'root' })
export class EventoPrestamoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<EventoPrestamo[] | null> {
    const url = `${ServiciosCrd.RS_EVPR}/getAll`;
    return this.http.get<EventoPrestamo[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<EventoPrestamo | null> {
    const url = `${ServiciosCrd.RS_EVPR}/getId/${id}`;
    return this.http.get<EventoPrestamo>(url).pipe(catchError(this.handleError));
  }

  /**
   * Eventos del préstamo, del MÁS RECIENTE al más antiguo — justo el orden en el que hay que
   * ofrecer la anulación (regla LIFO: solo el primero vigente es anulable).
   */
  porPrestamo(idPrestamo: number): Observable<EventoPrestamo[] | null> {
    const url = `${ServiciosCrd.RS_EVPR}/porPrestamo/${idPrestamo}`;
    return this.http.get<EventoPrestamo[]>(url).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<EventoPrestamo[] | null> {
    const url = `${ServiciosCrd.RS_EVPR}/selectByCriteria/`;
    return this.http.post<EventoPrestamo[]>(url, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
