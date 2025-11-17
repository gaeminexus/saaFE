import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Exter } from '../model/exter';
import { ServiciosCrd } from './ws-crd';

// Interfaz para respuestas paginadas del servidor
interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class ExterService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Exter[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_EXTR}${wsGetById}`;
    return this.http.get<Exter[]>(url).pipe(
      catchError((err: HttpErrorResponse) => {
        console.warn('Error en getAll(), intentando fallbacks...', err);
        // Fallback sin /saa-backend
        const altBase = ServiciosCrd.RS_EXTR.replace('/saa-backend', '');
        const altUrl = `${altBase}${wsGetById}`;
        return this.http.get<Exter[]>(altUrl).pipe(
          catchError(() => {
            console.error('Todos los endpoints fallaron para getAll()');
            return of([]);
          })
        );
      })
    );
  }

  getById(id: string): Observable<Exter | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_EXTR}${wsGetById}${id}`;
    return this.http.get<Exter>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** Paginado: obtiene una página de registros según número de página y tamaño */
  getPage(page: number, size: number, criteria: any = {}): Observable<Exter[] | PagedResponse<Exter> | null> {
    // TEMPORAL: Usar getAll() hasta que backend soporte paginación real
    console.log(`Solicitando página ${page} con tamaño ${size}`, criteria);

    // Por ahora, usar getAll y paginar en frontend como fallback seguro
    return this.getAll().pipe(
      catchError(err => {
        console.error('Error en getPage fallback:', err);
        return of([]);
      })
    );
  }

  /** POST: add a new registro to the server */
  add(datos: any): Observable<Exter | null> {
    return this.http.post<Exter>(ServiciosCrd.RS_EXTR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update an existing registro */
  update(datos: any): Observable<Exter | null> {
    return this.http.put<Exter>(ServiciosCrd.RS_EXTR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Exter[] | null> {
    const endpoint = '/criteria';
    const base = ServiciosCrd.RS_EXTR;
    const url = `${base}${endpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          // Intento alterno sin "/saa-backend"
          if (base.includes('/saa-backend')) {
            const altBase = base.replace('/saa-backend', '');
            const altUrl = `${altBase}${endpoint}`;
            return this.http.post<any>(altUrl, datos, this.httpOptions);
          }
        }
        return throwError(() => err);
      })
    );
  }

  /** DELETE: remove registro by id */
  delete(datos: any): Observable<Exter | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCrd.RS_EXTR}${wsGetById}`;
    return this.http.delete<Exter>(url, this.httpOptions).pipe(
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
