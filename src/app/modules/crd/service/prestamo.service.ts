import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Prestamo } from '../model/prestamo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root',
})
export class PrestamoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Prestamo[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_PRST}${wsGetById}`;
    return this.http.get<Prestamo[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<Prestamo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_PRST}${wsGetById}${id}`;
    return this.http.get<Prestamo>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<Prestamo | null> {
    return this.http
      .post<Prestamo>(ServiciosCrd.RS_PRST, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<Prestamo | null> {
    return this.http
      .put<Prestamo>(ServiciosCrd.RS_PRST, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<Prestamo[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_PRST}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(datos: any): Observable<Prestamo | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCrd.RS_PRST}${wsGetById}`;
    return this.http.delete<Prestamo>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  cargarTablaExcel(idPrestamo: number, archivo: File): Observable<Prestamo | null> {
    const formData = new FormData();
    formData.append('fileData', archivo, archivo.name);
    const url = `${ServiciosCrd.RS_PRST}/cargarTablaExcel/${idPrestamo}`;
    // Sin Content-Type para que el browser lo establezca automáticamente con boundary
    return this.http.post<Prestamo>(url, formData).pipe(catchError(this.handleError));
  }

  generarTablaAmortizacion(id: number, tieneCuotaCero: boolean = false): Observable<Prestamo | null> {
    const cuotaCero = tieneCuotaCero ? 1 : 0;
    const body = {
      idPrestamo: id,
      codigoPrestamo: id,
      prestamo: id,
      id,
      tieneCuotaCero,
    };

    const urlPrstCamelPath = `${ServiciosCrd.RS_PRST}/generarTablaAmortizacion/${id}/${cuotaCero}`;
    const urlPrstSnakePath = `${ServiciosCrd.RS_PRST}/generar_tabla_amortizacion/${id}/${cuotaCero}`;
    const urlPrstSnakeBody = `${ServiciosCrd.RS_PRST}/generar_tabla_amortizacion`;
    const urlPrstCamelBody = `${ServiciosCrd.RS_PRST}/generarTablaAmortizacion`;
    const urlDtprSnakePath = `${ServiciosCrd.RS_DTPR}/generar_tabla_amortizacion/${id}/${cuotaCero}`;
    const urlDtprSnakeBody = `${ServiciosCrd.RS_DTPR}/generar_tabla_amortizacion`;

    return this.http.post<Prestamo>(urlPrstCamelPath, null, this.httpOptions).pipe(
      catchError(() => this.http.post<Prestamo>(urlPrstSnakePath, null, this.httpOptions)),
      catchError(() => this.http.post<Prestamo>(urlPrstSnakeBody, body, this.httpOptions)),
      catchError(() => this.http.post<Prestamo>(urlPrstCamelBody, body, this.httpOptions)),
      catchError(() => this.http.post<Prestamo>(urlDtprSnakePath, null, this.httpOptions)),
      catchError(() => this.http.post<Prestamo>(urlDtprSnakeBody, body, this.httpOptions)),
      catchError(this.handleError),
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
