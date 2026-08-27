import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error.util';
import { CajaChica, CajaChicaRegistrarRequest } from '../model/caja-chica';
import { SaldoCajaChica } from '../model/saldo-caja-chica';
import { ServiciosTsr } from './ws-tsr';

@Injectable({ providedIn: 'root' })
export class CajaChicaService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<CajaChica[] | null> {
    return this.http.get<CajaChica[]>(`${ServiciosTsr.RS_CJCH}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<CajaChica | null> {
    return this.http.get<CajaChica>(`${ServiciosTsr.RS_CJCH}/getId/${id}`).pipe(catchError(this.handleError));
  }

  /** Registra una caja chica nueva; ver `saldoInicialMigrado` en el modelo para el caso de migración. */
  registrar(datos: CajaChicaRegistrarRequest): Observable<CajaChica> {
    return this.http.post<CajaChica>(`${ServiciosTsr.RS_CJCH}/registrar`, datos, this.httpOptions);
  }

  /** Edita los datos de la caja (nombre, tope, % de alerta, responsable, etc.) sin tocar el saldo. */
  update(datos: any): Observable<CajaChica | null> {
    return this.http.put<CajaChica>(ServiciosTsr.RS_CJCH, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  /** Cajas activas de la empresa (para los selectores de caja de gastos/reposición/cierre). */
  activas(idEmpresa: number): Observable<CajaChica[]> {
    return this.http.get<CajaChica[]>(`${ServiciosTsr.RS_CJCH}/activas/${idEmpresa}`);
  }

  saldo(idCaja: number): Observable<SaldoCajaChica> {
    return this.http.get<SaldoCajaChica>(`${ServiciosTsr.RS_CJCH}/saldo/${idCaja}`);
  }

  /** Saldo de todas las cajas de la empresa; es lo que alimenta el semáforo de alertas. */
  saldos(idEmpresa: number): Observable<SaldoCajaChica[]> {
    return this.http.get<SaldoCajaChica[]>(`${ServiciosTsr.RS_CJCH}/saldos/${idEmpresa}`);
  }

  static mensajeError(error: any): string {
    return mensajeDeError(error);
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error);
  }
}
