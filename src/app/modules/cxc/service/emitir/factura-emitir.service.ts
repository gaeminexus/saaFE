import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { FacturaEmitir } from '../../model/factura-emitir';
import { FormaPagoFactura } from '../../model/forma-pago-factura';
import { ServiciosCxc } from '../ws-cxc';

interface ReintentarAutorizacionRequest {
  idFactura: number;
}

interface ReenviarEmailRequest {
  idFactura: number;
  destinatarios: string;
}

interface GuardarFormaPagoFacturaRequest {
  idFactura: number;
  formaPagosFactura: FormaPagoFactura[];
}

@Injectable({
  providedIn: 'root',
})
export class FacturaEmitirService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<FacturaEmitir[] | null> {
    return this.http
      .get<FacturaEmitir[]>(`${ServiciosCxc.RS_FCTR}/getAll`)
      .pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<FacturaEmitir | null> {
    return this.http
      .get<FacturaEmitir>(`${ServiciosCxc.RS_FCTR}/getId/${id}`)
      .pipe(catchError(this.handleError));
  }

  add(datos: Partial<FacturaEmitir>): Observable<FacturaEmitir | null> {
    return this.http
      .post<FacturaEmitir>(ServiciosCxc.RS_FCTR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  grabarFactura(datos: Partial<FacturaEmitir>): Observable<FacturaEmitir | null> {
    return this.http
      .post<FacturaEmitir>(`${ServiciosCxc.RS_FCTR}/grabarFactura`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  procesarCompleta(datos: { factura: Partial<FacturaEmitir> }): Observable<FacturaEmitir | null> {
    return this.http
      .post<FacturaEmitir>(`${ServiciosCxc.RS_FCTR}/procesarCompleta`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Partial<FacturaEmitir>): Observable<FacturaEmitir | null> {
    return this.http
      .put<FacturaEmitir>(ServiciosCxc.RS_FCTR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<FacturaEmitir[] | null> {
    return this.http
      .post<FacturaEmitir[]>(`${ServiciosCxc.RS_FCTR}/selectByCriteria/`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<FacturaEmitir | null> {
    return this.http
      .delete<FacturaEmitir>(`${ServiciosCxc.RS_FCTR}/${id}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  reintentarAutorizacion(datos: ReintentarAutorizacionRequest): Observable<any | null> {
    return this.http
      .post<any>(`${ServiciosCxc.RS_FCTR}/reintentarAutorizacion`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  reenviarEmail(datos: ReenviarEmailRequest): Observable<any | null> {
    return this.http
      .post<any>(`${ServiciosCxc.RS_FCTR}/reenviarEmail`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  guardarFormaPagoFactura(datos: GuardarFormaPagoFacturaRequest): Observable<any | null> {
    return this.http
      .post<any>(`${ServiciosCxc.RS_FCTR}/guardarFormaPagoFactura`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}
