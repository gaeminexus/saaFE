import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
import { OrdenPagoNomina } from '../model/orden-pago-nomina';
import { ServiciosRhh } from './ws-rrh';

/**
 * Orden de pago de nómina (RHH.RDPG): CRUD más los tres procesos de la fase 6.
 *
 * `generar` construye la orden y su detalle desde el período; `archivoBancario` descarga el
 * fichero que se sube a la banca electrónica; `confirmar` registra la fecha en que el banco
 * acreditó de verdad.
 */
@Injectable({
  providedIn: 'root',
})
export class OrdenPagoNominaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<OrdenPagoNomina[] | null> {
    const url = `${ServiciosRhh.RS_RDPG}/getAll`;
    return this.http.get<OrdenPagoNomina[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<OrdenPagoNomina | null> {
    const url = `${ServiciosRhh.RS_RDPG}/getId/${id}`;
    return this.http.get<OrdenPagoNomina>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<OrdenPagoNomina | null> {
    return this.http
      .post<OrdenPagoNomina>(ServiciosRhh.RS_RDPG, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<OrdenPagoNomina | null> {
    return this.http
      .put<OrdenPagoNomina>(ServiciosRhh.RS_RDPG, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<OrdenPagoNomina[] | null> {
    const url = `${ServiciosRhh.RS_RDPG}/selectByCriteria/`;
    return this.http.post<OrdenPagoNomina[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<OrdenPagoNomina | null> {
    const url = `${ServiciosRhh.RS_RDPG}/${id}`;
    return this.http
      .delete<OrdenPagoNomina>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // ─── Procesos ──────────────────────────────────────────────────────────────

  /**
   * POST /rest/rdpg/generar — arma la orden y su detalle a partir del período.
   *
   * **Un colaborador sin cuenta bancaria activa detiene la orden entera**, y el backend devuelve
   * su nombre en el mensaje: es un error accionable, no un fallo genérico.
   *
   * `idUsuario` (contrato §5 de `docs/rrh/API-PAGO-BENEFICIOS-SOCIALES.md`): cuando la orden pasa
   * por la bandeja de tesorería, `registrarPagoDeOrigenExterno` lo usa como FK real
   * (`em.find(Usuario.class, idUsuario)`). `usuarioRegistro` se mantiene aparte: alimenta las
   * columnas de auditoría de texto, no reemplaza a `idUsuario`.
   */
  generar(idPeriodo: number, idCuentaBancaria: number, idUsuario: number): Observable<OrdenPagoNomina> {
    const url = `${ServiciosRhh.RS_RDPG}/generar`;
    const cuerpo = { idPeriodo, idCuentaBancaria, usuarioRegistro: usuarioSesion(), idUsuario };
    return this.http
      .post<OrdenPagoNomina>(url, cuerpo, this.httpOptions)
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  /**
   * GET /rest/rdpg/archivoBancario/{id} — el fichero para la banca electrónica.
   *
   * Se pide como `blob`: es binario y su formato lo define el `FMBN` activo de la empresa. Sin
   * un formato activo el backend responde explicando que falta crearlo.
   */
  archivoBancario(idOrden: number): Observable<Blob> {
    const url = `${ServiciosRhh.RS_RDPG}/archivoBancario/${idOrden}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  /**
   * POST /rest/rdpg/confirmar/{id} — registra la fecha real de acreditación.
   *
   * `idUsuario`: mismo motivo que en `generar()` — ver contrato §5.
   */
  confirmar(idOrden: number, fechaAcreditacion: string, idUsuario: number): Observable<OrdenPagoNomina> {
    const url = `${ServiciosRhh.RS_RDPG}/confirmar/${idOrden}`;
    const cuerpo = { fechaAcreditacion, usuarioRegistro: usuarioSesion(), idUsuario };
    return this.http
      .post<OrdenPagoNomina>(url, cuerpo, this.httpOptions)
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
