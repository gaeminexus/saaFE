import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { BioProfile } from '../model/bio-profile';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class BioProfileService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<BioProfile[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_BPRF}${wsGetById}`;
    return this.http.get<BioProfile[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<BioProfile | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_BPRF}${wsGetById}${id}`;
    return this.http.get<BioProfile>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<BioProfile | null> {
    return this.http.post<BioProfile>(ServiciosCrd.RS_BPRF, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<BioProfile | null> {
    return this.http.put<BioProfile>(ServiciosCrd.RS_BPRF, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<BioProfile[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_BPRF}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<BioProfile | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_BPRF}${wsEndpoint}`;
    return this.http.delete<BioProfile>(url, this.httpOptions).pipe(
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
