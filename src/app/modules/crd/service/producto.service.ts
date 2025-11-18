import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Producto } from '../model/producto';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<Producto[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_PRDC}${wsGetById}`;
    return this.http.get<Producto[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Producto | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_PRDC}${wsGetById}${id}`;
    return this.http.get<Producto>(url).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Producto[] | null> {
    const base = ServiciosCrd.RS_PRDC;

    // Función helper para intentar múltiples endpoints secuencialmente
    const tryEndpoint = (endpoints: { url: string, method: 'GET' | 'POST' }[], index = 0): Observable<Producto[] | null> => {
      if (index >= endpoints.length) {
        console.warn('🚫 Todos los endpoints de productos fallaron, usando datos mock');
        return throwError(() => new Error('Todos los endpoints fallaron'));
      }

      const { url, method } = endpoints[index];
      console.log(`🔄 Intentando endpoint ${index + 1}/${endpoints.length}: ${method} ${url}`);

      const request = method === 'POST'
        ? this.http.post<Producto[]>(url, datos, this.httpOptions)
        : this.http.get<Producto[]>(url, this.httpOptions);

      return request.pipe(
        catchError((error) => {
          console.warn(`⚠️ Falló ${method} ${url}:`, error.status, error.statusText);
          return tryEndpoint(endpoints, index + 1);
        })
      );
    };

    // Lista de endpoints a probar en orden de prioridad (preferir GET para evitar 405)
    const endpoints = [
      { url: `${base}/getAll`, method: 'GET' as const },
      { url: `${base}`, method: 'GET' as const }, // Fallback GET genérico
      { url: `${base}/criteria`, method: 'POST' as const },
      { url: `${base}/selectByCriteria`, method: 'POST' as const },
      { url: `${base}/selectByCriteria/`, method: 'POST' as const }
    ];

    return tryEndpoint(endpoints).pipe(
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
