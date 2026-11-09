import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
import {
  NivelAprobacion,
  ReglaAprobacion,
  ReglaAprobacionCompleta,
  SimulacionReglaAprobacion,
  UsuarioNivelAprobacion,
} from '../model/nivel-aprobacion';
import { ServiciosCrd } from './ws-crd';

/**
 * Configuración de niveles de aprobación: reglas (`rgap`), niveles (`nvap`) y usuarios por nivel (`unap`).
 * Las escrituras llevan `?usuario=` de la sesión (U-2). DELETE deja el registro INACTIVO, no borra. Los errores
 * (422 `{mensaje}`, 400) se dejan pasar tal cual: la pantalla los muestra con `mensajeDeError`.
 */
@Injectable({ providedIn: 'root' })
export class NivelAprobacionService {
  private http = inject(HttpClient);

  private params(): HttpParams {
    return new HttpParams().set('usuario', usuarioSesion());
  }

  // ---- reglas ----
  reglas(): Observable<ReglaAprobacion[]> {
    return this.http.get<ReglaAprobacion[]>(`${ServiciosCrd.RS_RGAP}/getAll`);
  }

  reglaCompleta(id: number): Observable<ReglaAprobacionCompleta> {
    return this.http.get<ReglaAprobacionCompleta>(`${ServiciosCrd.RS_RGAP}/completa/${id}`);
  }

  /** Qué regla aplicaría a un préstamo de ese tipo, monto y plazo. Sirve para probar la configuración. */
  simular(idTipo: number | null, monto: number | null, plazo: number | null, operacion: number | null = null): Observable<SimulacionReglaAprobacion> {
    let params = new HttpParams();
    if (idTipo != null) params = params.set('idTipo', idTipo);
    if (monto != null) params = params.set('monto', monto);
    if (plazo != null) params = params.set('plazo', plazo);
    if (operacion != null) params = params.set('operacion', operacion);
    return this.http.get<SimulacionReglaAprobacion>(`${ServiciosCrd.RS_RGAP}/simular`, { params });
  }

  addRegla(regla: ReglaAprobacion): Observable<ReglaAprobacion> {
    return this.http.post<ReglaAprobacion>(ServiciosCrd.RS_RGAP, regla, { params: this.params() });
  }

  updateRegla(regla: ReglaAprobacion): Observable<ReglaAprobacion> {
    return this.http.put<ReglaAprobacion>(ServiciosCrd.RS_RGAP, regla, { params: this.params() });
  }

  inactivarRegla(id: number): Observable<ReglaAprobacion> {
    return this.http.delete<ReglaAprobacion>(`${ServiciosCrd.RS_RGAP}/${id}`, { params: this.params() });
  }

  // ---- niveles ----
  nivelesDeRegla(idRegla: number): Observable<NivelAprobacion[]> {
    return this.http.get<NivelAprobacion[]>(`${ServiciosCrd.RS_NVAP}/porRegla/${idRegla}`);
  }

  addNivel(nivel: NivelAprobacion): Observable<NivelAprobacion> {
    return this.http.post<NivelAprobacion>(ServiciosCrd.RS_NVAP, nivel, { params: this.params() });
  }

  updateNivel(nivel: NivelAprobacion): Observable<NivelAprobacion> {
    return this.http.put<NivelAprobacion>(ServiciosCrd.RS_NVAP, nivel, { params: this.params() });
  }

  inactivarNivel(id: number): Observable<NivelAprobacion> {
    return this.http.delete<NivelAprobacion>(`${ServiciosCrd.RS_NVAP}/${id}`, { params: this.params() });
  }

  // ---- usuarios por nivel ----
  usuariosDeNivel(idNivel: number): Observable<UsuarioNivelAprobacion[]> {
    return this.http.get<UsuarioNivelAprobacion[]>(`${ServiciosCrd.RS_UNAP}/porNivel/${idNivel}`);
  }

  addUsuario(usuario: UsuarioNivelAprobacion): Observable<UsuarioNivelAprobacion> {
    return this.http.post<UsuarioNivelAprobacion>(ServiciosCrd.RS_UNAP, usuario, { params: this.params() });
  }

  inactivarUsuario(id: number): Observable<UsuarioNivelAprobacion> {
    return this.http.delete<UsuarioNivelAprobacion>(`${ServiciosCrd.RS_UNAP}/${id}`, { params: this.params() });
  }
}
