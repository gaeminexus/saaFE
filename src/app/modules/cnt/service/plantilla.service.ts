import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { DetallePlantilla } from '../model/detalle-plantilla-general';
import { Plantilla } from '../model/plantilla-general';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root',
})
export class PlantillaService {
  private static readonly EMPRESA_CODIGO = 280;

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Plantilla[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_PLNS}${wsGetById}`;
    return this.http.get<Plantilla[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<Plantilla | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_PLNS}${wsGetById}${id}`;
    return this.http.get<Plantilla>(url).pipe(catchError(this.handleError));
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<Plantilla | null> {
    return this.http
      .post<Plantilla>(ServiciosCnt.RS_PLNS, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<Plantilla | null> {
    return this.http
      .put<Plantilla>(ServiciosCnt.RS_PLNS, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<Plantilla[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_PLNS}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  /** DELETE: elimina una plantilla */
  delete(codigo: number): Observable<boolean> {
    const wsDelete = '/' + codigo;
    const url = `${ServiciosCnt.RS_PLNS}${wsDelete}`;
    return this.http.delete<Plantilla>(url, this.httpOptions).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * Obtiene detalles de una plantilla
   */
  getDetallesByPlantillaCodigo(plantillaCodigo: number): Observable<DetallePlantilla[]> {
    const wsGetDetalles = '/getByParent/';
    const url = `${ServiciosCnt.RS_DTPL}${wsGetDetalles}${plantillaCodigo}`;
    return this.http.get<DetallePlantilla[]>(url).pipe(catchError(() => of([])));
  }

  /**
   * Obtiene plantilla completa con detalles
   */
  getPlantillaCompleta(
    codigo: number
  ): Observable<{ plantilla: Plantilla; detalles: DetallePlantilla[] } | null> {
    return new Observable((observer) => {
      this.getById(codigo.toString()).subscribe((plantilla) => {
        if (plantilla) {
          this.getDetallesByPlantillaCodigo(codigo).subscribe((detalles) => {
            observer.next({ plantilla, detalles });
            observer.complete();
          });
        } else {
          observer.next(null);
          observer.complete();
        }
      });
    });
  }

  // tslint:disable-next-line: typedef
  private handleError(error: HttpErrorResponse): Observable<null> {
    console.error('🔥 [PlantillaService] HttpErrorResponse completo:', error);
    console.error('🔥 Status:', error.status);
    console.error('🔥 Status Text:', error.statusText);
    console.error('🔥 Error body:', error.error);
    console.error('🔥 Headers:', error.headers);
    console.error('🔥 URL:', error.url);

    if (+error.status === 200) {
      return of(null);
    } else {
      // Retornar el error completo para debugging, no solo error.error
      return throwError(() => error);
    }
  }
}
