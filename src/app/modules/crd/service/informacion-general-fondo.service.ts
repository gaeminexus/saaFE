import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { InformacionGeneralFondo } from '../model/informacion-general-fondo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root',
})
export class InformacionGeneralFondoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<InformacionGeneralFondo[] | null> {
    const url = `${ServiciosCrd.RS_IGFN}/getAll`;
    return this.http.get<InformacionGeneralFondo[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<InformacionGeneralFondo | null> {
    const url = `${ServiciosCrd.RS_IGFN}/getId/${id}`;
    return this.http.get<InformacionGeneralFondo>(url).pipe(catchError(this.handleError));
  }

  add(datos: InformacionGeneralFondo): Observable<InformacionGeneralFondo | null> {
    return this.http
      .post<InformacionGeneralFondo>(ServiciosCrd.RS_IGFN, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: InformacionGeneralFondo): Observable<InformacionGeneralFondo | null> {
    return this.http
      .put<InformacionGeneralFondo>(ServiciosCrd.RS_IGFN, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<InformacionGeneralFondo | null> {
    const url = `${ServiciosCrd.RS_IGFN}/${id}`;
    return this.http
      .delete<InformacionGeneralFondo>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<InformacionGeneralFondo[] | null> {
    const url = `${ServiciosCrd.RS_IGFN}/selectByCriteria`;
    return this.http
      .post<InformacionGeneralFondo[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}
