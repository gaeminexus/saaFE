import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError, map } from 'rxjs';
import { EstadoTipoAsiento, TipoAsiento } from '../model/tipo-asiento';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class TipoAsientoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  // Obtener empresa desde localStorage
  private get idSucursal(): number {
    return parseInt(localStorage.getItem('idSucursal') || '280', 10);
  }

  constructor(
    private http: HttpClient
  ) { }

  /**
   * Obtiene todos los tipos de asientos
   */
  getAll(): Observable<TipoAsiento[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_PLNT}${wsGetById}`;
    return this.http.get<TipoAsiento[]>(url).pipe(
      map((items: TipoAsiento[]) =>
        (items || []).filter((p) => p?.empresa?.codigo === this.idSucursal)
      ),
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene tipos de asiento filtrados por sistema (0 = general, 1 = sistema)
   */
  getBySistema(sistema: number): Observable<TipoAsiento[]> {
    return this.getAll().pipe(
      map((items) => (items || []).filter((p) => p.sistema === sistema))
    );
  }

  /**
   * Obtiene tipos de asiento generales (sistema = 0)
   */
  getAllGenerales(): Observable<TipoAsiento[]> {
    return this.getBySistema(0);
  }

  /**
   * Obtiene tipos de asiento del sistema (sistema = 1)
   */
  getAllSistema(): Observable<TipoAsiento[]> {
    return this.getBySistema(1);
  }

  getById(id: string): Observable<TipoAsiento | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_PLNT}${wsGetById}${id}`;
    return this.http.get<TipoAsiento>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Crea un nuevo tipo de asiento
   */
  add(datos: any): Observable<TipoAsiento | null> {
    return this.http.post<TipoAsiento>(ServiciosCnt.RS_PLNT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Alias para compatibilidad
   */
  create(datos: any): Observable<TipoAsiento | null> {
    return this.add(datos);
  }

  /**
   * Actualiza un tipo de asiento existente
   */
  update(idOrDatos: any, datos?: any): Observable<TipoAsiento | null> {
    // Soporte para ambas firmas: update(datos) o update(id, datos)
    const payload = datos || idOrDatos;
    return this.http.put<TipoAsiento>(ServiciosCnt.RS_PLNT, payload, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Cambia el estado de un tipo de asiento
   */
  cambiarEstado(id: number, estado: EstadoTipoAsiento): Observable<boolean> {
    return this.update({ codigo: id, estado }).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  selectByCriteria(datos: any): Observable<TipoAsiento[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_PLNT}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Elimina un tipo de asiento
   */
  delete(idOrDatos: any): Observable<boolean> {
    const id = typeof idOrDatos === 'object' ? idOrDatos.codigo : idOrDatos;
    const url = `${ServiciosCnt.RS_PLNT}/${id}`;
    return this.http.delete(url, this.httpOptions).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  // tslint:disable-next-line: typedef
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
