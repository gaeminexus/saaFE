import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { CatalogoSustento, FacturaSustentoPendiente, SustentoFactura } from '../model/sustento-tributario';
import { ServiciosCxp } from './ws-cxp';

/** Sustento tributario (Tabla 5 del ATS) de la factura de compra — FacturaCompraRest, ya desplegado. */
@Injectable({ providedIn: 'root' })
export class SustentoTributarioService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  /** Catálogo vigente (Tabla 5, PGS.TSRI) — código → descripción. No hardcodear, siempre en vivo. */
  catalogo(): Observable<CatalogoSustento> {
    return this.http.get<CatalogoSustento>(`${ServiciosCxp.RS_FCTC}/sustentoCatalogo`).pipe(
      catchError(this.handleError),
    );
  }

  pendientes(idEmpresa: number): Observable<FacturaSustentoPendiente[]> {
    const params = new HttpParams().set('idEmpresa', idEmpresa);
    return this.http.get<FacturaSustentoPendiente[]>(`${ServiciosCxp.RS_FCTC}/sustentoPendiente`, { params }).pipe(
      catchError(this.handleError),
    );
  }

  getSustento(idFactura: number): Observable<SustentoFactura> {
    return this.http.get<SustentoFactura>(`${ServiciosCxp.RS_FCTC}/sustento/${idFactura}`).pipe(
      catchError(this.handleError),
    );
  }

  /** PUT /fctc/sustento/{id}?sustento=XX — el valor va en el query param, no en el body. */
  corregir(idFactura: number, sustento: string): Observable<unknown> {
    const params = new HttpParams().set('sustento', sustento);
    return this.http.put(`${ServiciosCxp.RS_FCTC}/sustento/${idFactura}`, null, { ...this.httpOptions, params }).pipe(
      catchError(this.handleError),
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error);
  }
}
