import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
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

  /** Anula (estado 0); no borra la fila. */
  anular(id: number): Observable<GarantePrestamo> {
    return this.http.delete<GarantePrestamo>(`${ServiciosCrd.RS_GRPR}/${id}`, { params: this.params() });
  }
}
