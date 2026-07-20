import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CargaArchivoTxt } from '../model/carga-archivo-txt';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class CargaArchivoTxtService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<CargaArchivoTxt[] | null> {
    return this.http.get<CargaArchivoTxt[]>(`${ServiciosCxp.RS_CRTX}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<CargaArchivoTxt | null> {
    return this.http.get<CargaArchivoTxt>(`${ServiciosCxp.RS_CRTX}/getId/${id}`).pipe(catchError(this.handleError));
  }

  getByEmpresa(idEmpresa: number): Observable<CargaArchivoTxt[] | null> {
    return this.http.get<CargaArchivoTxt[]>(`${ServiciosCxp.RS_CRTX}/getByEmpresa/${idEmpresa}`).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<CargaArchivoTxt[] | null> {
    return this.http.post<CargaArchivoTxt[]>(`${ServiciosCxp.RS_CRTX}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}
