import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError, map } from 'rxjs';
import { DetallePlantilla} from '../model/detalle-plantilla';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class DetallePlantillaService {
  private static readonly EMPRESA_CODIGO = 280;

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<DetallePlantilla[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_DTPL}${wsGetById}`;
    return this.http.get<DetallePlantilla[]>(url).pipe(
      map((items: DetallePlantilla[]) =>
        (items || []).filter(d => d?.plantilla?.empresa?.codigo === DetallePlantillaService.EMPRESA_CODIGO)
      ),
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<DetallePlantilla| null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_DTPL}${wsGetById}${id}`;
    return this.http.get<DetallePlantilla>(url).pipe(
      catchError(this.handleError)
    );
  }

  getByParent(idParent: number): Observable<DetallePlantilla[] | null> {
    const wsGetById = '/getByParent/';
    const url = `${ServiciosCnt.RS_DTPL}${wsGetById}${idParent}`;
    return this.http.get<DetallePlantilla[]>(url).pipe(
      map((items: DetallePlantilla[]) =>
        (items || []).filter(d => d?.plantilla?.empresa?.codigo === DetallePlantillaService.EMPRESA_CODIGO)
      ),
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<DetallePlantilla| null> {
    // Asegurar empresa 280 en la plantilla padre
    const datosConEmpresa = {
      ...datos,
      plantilla: {
        ...datos.plantilla,
        empresa: { codigo: DetallePlantillaService.EMPRESA_CODIGO }
      }
    };
    console.log('📤 [DetallePlantillaService.add] Enviando POST:', {
      url: ServiciosCnt.RS_DTPL,
      payload: datosConEmpresa
    });
    return this.http.post<DetallePlantilla>(ServiciosCnt.RS_DTPL, datosConEmpresa, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<DetallePlantilla| null> {
    // Asegurar empresa 280 en la plantilla padre
    const datosConEmpresa = {
      ...datos,
      plantilla: {
        ...datos.plantilla,
        empresa: { codigo: DetallePlantillaService.EMPRESA_CODIGO }
      }
    };
    console.log('📤 [DetallePlantillaService.update] Enviando PUT:', {
      url: ServiciosCnt.RS_DTPL,
      payload: datosConEmpresa
    });
    return this.http.put<DetallePlantilla>(ServiciosCnt.RS_DTPL, datosConEmpresa, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<DetallePlantilla[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_DTPL}${wsGetById}`;
    // Forzar filtro de empresa en el request
    const criteriosConEmpresa = {
      ...datos,
      plantilla: {
        ...datos.plantilla,
        empresa: { codigo: DetallePlantillaService.EMPRESA_CODIGO }
      }
    };
    return this.http.post<any>(url, criteriosConEmpresa, this.httpOptions).pipe(
      map((items: DetallePlantilla[]) =>
        (items || []).filter(d => d?.plantilla?.empresa?.codigo === DetallePlantillaService.EMPRESA_CODIGO)
      ),
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<DetallePlantilla| null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_DTPL}${wsGetById}`;
    return this.http.delete<DetallePlantilla>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  // tslint:disable-next-line: typedef
  private handleError(error: HttpErrorResponse): Observable<null> {
    console.error('=== ERROR EN DETALLE PLANTILLA SERVICE ===');
    console.error('Status:', error.status);
    console.error('StatusText:', error.statusText);
    console.error('URL:', error.url);
    console.error('Body:', error.error);

    if (+error.status === 200) {
      return of(null);
    } else {
      // Pasar todo el error HttpErrorResponse en lugar de solo error.error
      return throwError(() => error);
    }
  }




}
