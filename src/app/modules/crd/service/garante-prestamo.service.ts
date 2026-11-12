import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
import { Adjunto } from '../model/adjunto';
import { GarantePrestamo } from '../model/garante-prestamo';
import { ServiciosCrd } from './ws-crd';

/**
 * Garante del préstamo (`grpr`). Todas las escrituras llevan `?usuario=` de la sesión (U-2). Los errores
 * (422 `{mensaje}`, 400 por usuario inválido) se dejan pasar tal cual: la pantalla los muestra con `mensajeDeError`.
 */
@Injectable({ providedIn: 'root' })
export class GarantePrestamoService {
  private http = inject(HttpClient);

  private params(): HttpParams {
    return new HttpParams().set('usuario', usuarioSesion());
  }

  /** Garante activo del préstamo, o `null` si no tiene (el backend responde 204). */
  porPrestamo(idPrestamo: number): Observable<GarantePrestamo | null> {
    return this.http
      .get<GarantePrestamo>(`${ServiciosCrd.RS_GRPR}/prestamo/${idPrestamo}`, { observe: 'response' })
      .pipe(map((r) => (r.status === 204 ? null : (r.body ?? null))));
  }

  add(garante: GarantePrestamo): Observable<GarantePrestamo> {
    return this.http.post<GarantePrestamo>(ServiciosCrd.RS_GRPR, garante, { params: this.params() });
  }

  update(garante: GarantePrestamo): Observable<GarantePrestamo> {
    return this.http.put<GarantePrestamo>(ServiciosCrd.RS_GRPR, garante, { params: this.params() });
  }

  /**
   * Alta en un préstamo ya otorgado (2, 8, 10, 11): `POST /grpr/conAutorizacion`, multipart, mismo patrón
   * que `POST /cnbp/conCertificado` (DISENO-PAGO-CON-APORTES-DEL-GARANTE §G4). La autorización firmada
   * es obligatoria. Los numéricos van como `String` y el nombre con `encodeURIComponent()`, como en
   * `CuentaBancariaParticipeService.addConCertificado`. Sin Content-Type: el navegador pone el boundary.
   */
  addConAutorizacion(idPrestamo: number, idEntidad: number, autorizacion: File): Observable<GarantePrestamo> {
    const formData = new FormData();
    formData.append('archivo', autorizacion);
    formData.append('archivoNombre', encodeURIComponent(autorizacion.name));
    formData.append('idPrestamo', String(idPrestamo));
    formData.append('idEntidad', String(idEntidad));
    formData.append('usuario', usuarioSesion());
    return this.http.post<GarantePrestamo>(`${ServiciosCrd.RS_GRPR}/conAutorizacion`, formData);
  }

  /** Adjunto de la autorización firmada del garante, o `null` si no tiene (el backend responde 204). */
  autorizacion(idGarante: number): Observable<Adjunto | null> {
    return this.http
      .get<Adjunto>(`${ServiciosCrd.RS_GRPR}/${idGarante}/autorizacion`, { observe: 'response' })
      .pipe(map((r) => (r.status === 204 ? null : (r.body ?? null))));
  }

  /** Anula (estado 0); no borra la fila. */
  anular(id: number): Observable<GarantePrestamo> {
    return this.http.delete<GarantePrestamo>(`${ServiciosCrd.RS_GRPR}/${id}`, { params: this.params() });
  }
}
