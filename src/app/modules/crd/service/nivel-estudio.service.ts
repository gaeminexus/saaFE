import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { NivelEstudio } from '../model/nivel-estudio';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class NivelEstudioService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<NivelEstudio[] | null> {
    const url = `${ServiciosCrd.RS_NVLS}/getAll`;
    return this.http.get<NivelEstudio[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<NivelEstudio | null> {
    const url = `${ServiciosCrd.RS_NVLS}/getId/${id}`;
    return this.http.get<NivelEstudio>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<NivelEstudio | null> {
    return this.http.post<NivelEstudio>(ServiciosCrd.RS_NVLS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<NivelEstudio | null> {
    return this.http.put<NivelEstudio>(ServiciosCrd.RS_NVLS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<NivelEstudio[] | null> {
    const url = `${ServiciosCrd.RS_NVLS}/selectByCriteria/`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(datos: any): Observable<NivelEstudio | null> {
    const url = `${ServiciosCrd.RS_NVLS}/${datos}`;
    return this.http.delete<NivelEstudio>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) return of(null);
    return throwError(() => error.error);
  }
}
