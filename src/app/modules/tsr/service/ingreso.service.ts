import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { MotivoRequest } from '../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import {
  AnularIngresoResponse,
  Ingreso,
  RegistrarIngresoRequest,
  RegistrarIngresoResponse,
} from '../model/ingreso';
import { ServiciosTsr } from './ws-tsr';

/**
 * Ingresos de tesorería sin documento físico (INGR). Se registran cuando el
 * dinero ya está en la cuenta: la misma llamada graba, contabiliza y genera el
 * movimiento bancario para la conciliación.
 */
@Injectable({ providedIn: 'root' })
export class IngresoService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  /** Registra el ingreso: graba + asiento + movimiento bancario en un paso. */
  procesar(datos: RegistrarIngresoRequest): Observable<RegistrarIngresoResponse> {
    return this.http.post<RegistrarIngresoResponse>(
      `${ServiciosTsr.RS_INGR}/procesar`, datos, this.httpOptions
    ).pipe(catchError(this.handleError));
  }

  /** Anula el ingreso: reversa el asiento y anula el movimiento bancario. */
  anular(idIngreso: number, datos: MotivoRequest): Observable<AnularIngresoResponse> {
    return this.http.post<AnularIngresoResponse>(
      `${ServiciosTsr.RS_INGR}/anular/${idIngreso}`, datos, this.httpOptions
    ).pipe(catchError(this.handleError));
  }

  /** Ingresos de la empresa; sin `estado` trae todos. */
  listar(idEmpresa: number, estado?: number): Observable<Ingreso[]> {
    let params = new HttpParams().set('idEmpresa', idEmpresa);
    if (estado != null) {
      params = params.set('estado', estado);
    }
    return this.http.get<Ingreso[]>(`${ServiciosTsr.RS_INGR}/listar`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  getAll(): Observable<Ingreso[]> {
    return this.http.get<Ingreso[]>(`${ServiciosTsr.RS_INGR}/getAll`).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: number): Observable<Ingreso> {
    return this.http.get<Ingreso>(`${ServiciosTsr.RS_INGR}/getId/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<Ingreso[]> {
    return this.http.post<Ingreso[]>(
      `${ServiciosTsr.RS_INGR}/selectByCriteria`, datos, this.httpOptions
    ).pipe(catchError(this.handleError));
  }

  /** El backend devuelve el motivo del fallo como texto plano en el body. */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let mensaje = 'No se pudo completar la operación.';
    if (typeof error.error === 'string' && error.error.trim()) {
      mensaje = error.error;
    } else if (error.error?.mensaje) {
      mensaje = error.error.mensaje;
    } else if (error.error?.message) {
      mensaje = error.error.message;
    }
    return throwError(() => new Error(mensaje));
  }
}
