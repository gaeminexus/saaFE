import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { Turno } from '../model/turno';
import { ServiciosRhh } from './ws-rrh';

@Injectable({
  providedIn: 'root',
})
export class TurnoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Turno[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_TRNO}${wsGetById}`;
    return this.http.get<Turno[]>(url).pipe(
      catchError(this.handleError),
      map((rows) => this.mapFromBackendArray(rows)),
    );
  }

  getById(id: string): Observable<Turno | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_TRNO}${wsGetById}${id}`;
    return this.http.get<Turno>(url).pipe(
      catchError(this.handleError),
      map((row) => this.mapFromBackend(row)),
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<Turno | null> {
    const payload = this.mapToBackend(datos);
    return this.http.post<Turno>(ServiciosRhh.RS_TRNO, payload, this.httpOptions).pipe(
      catchError(this.handleError),
      map((row) => this.mapFromBackend(row)),
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Turno | null> {
    const payload = this.mapToBackend(datos);
    return this.http.put<Turno>(ServiciosRhh.RS_TRNO, payload, this.httpOptions).pipe(
      catchError(this.handleError),
      map((row) => this.mapFromBackend(row)),
    );
  }

  selectByCriteria(datos: any): Observable<Turno[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_TRNO}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError),
      map((rows) => this.mapFromBackendArray(rows)),
    );
  }

  /** DELETE */
  delete(id: any): Observable<Turno | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_TRNO}${wsEndpoint}`;
    return this.http.delete<Turno>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  private mapFromBackend(row: Turno | null): Turno | null {
    if (!row) return null;
    const backend = row as Turno & { minutosTolerancia?: number };
    return {
      ...backend,
      toleranciaMinutos: backend.toleranciaMinutos ?? backend.minutosTolerancia ?? 0,
      requiereMarcacionSalida: backend.requiereMarcacionSalida ?? false,
    };
  }

  private mapFromBackendArray(rows: Turno[] | null): Turno[] | null {
    if (!rows) return rows;
    if (!Array.isArray(rows)) return rows as unknown as Turno[];
    return rows.map((row) => this.mapFromBackend(row) as Turno);
  }

  private mapToBackend(datos: Partial<Turno>): Partial<Turno> & { minutosTolerancia?: number } {
    if (!datos) return datos;
    const payload: Partial<Turno> & { minutosTolerancia?: number } = { ...datos };
    if (payload.toleranciaMinutos !== undefined) {
      payload.minutosTolerancia = payload.toleranciaMinutos;
      delete payload.toleranciaMinutos;
    }
    if (payload.requiereMarcacionSalida !== undefined) {
      delete payload.requiereMarcacionSalida;
    }
    return payload;
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
