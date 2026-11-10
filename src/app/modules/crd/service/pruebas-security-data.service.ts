import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { ServiciosCrd } from './ws-crd';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
import { mensajeDeError } from '../../../shared/utils/mensaje-error.util';

/**
 * Forma común de la respuesta de cada paso de la consola de pruebas de Security Data
 * (docs/logica-negocio/crd/DISENO-PANTALLA-PRUEBAS-SECURITY-DATA.md §3). `peticion` y `respuesta` llegan
 * ya enmascarados por el backend (token, clave, código dactilar, enlace de firma, base64 largo).
 */
export interface RespuestaPaso {
  paso: string;
  metodo: string;
  ruta: string;
  peticion: unknown;
  httpStatus: number;
  duracionMs: number;
  respuesta: unknown;
  /** PDF de los pasos 7 y 8, aparte del JSON (que lo trae como «[PDF base64, N bytes]»). Nombre por confirmar. */
  pdfBase64?: string | null;
  pdfNombre?: string | null;
  /** Solo en «autenticar»: {exito, tipo, tokenEnmascarado, expira}. */
  resumen?: unknown;
}

/** Lo que ve la pantalla: o la respuesta del paso, o el fallo del propio backend (403, 400, caído...). */
export interface ResultadoEjecucion {
  ok: boolean;
  /** HTTP del backend del SAA (no el de Security Data, que va dentro de `datos.httpStatus`). */
  estadoHttp: number;
  datos?: RespuestaPaso;
  mensaje?: string;
  error?: string;
}

/**
 * Consola de pruebas de Security Data. El navegador nunca habla con Security Data: todo pasa por
 * `sdpr/{paso}` en el backend, que usa las credenciales de WildFly. Un POST por paso, cuerpo JSON
 * (o multipart en los pasos con archivos). Apagada salvo la propiedad `saa.firma.securitydata.pruebas`:
 * sin ella todos los pasos responden 403 `PRUEBAS_DESHABILITADAS`.
 *
 * Nunca propaga el error de HTTP: se emite `ResultadoEjecucion` y se ramifica por `ok`.
 */
@Injectable({ providedIn: 'root' })
export class PruebasSecurityDataService {
  private http = inject(HttpClient);

  /** «Llenar desde socio»: no llama al proveedor; `encontrado: false` si la cédula no existe. */
  socio(cedula: string): Observable<DatosSocio> {
    const params = new HttpParams().set('usuario', usuarioSesion());
    return this.http.get<DatosSocio>(`${ServiciosCrd.RS_SDPR}/socio/${encodeURIComponent(cedula)}`, { params }).pipe(
      catchError((error: HttpErrorResponse) => of({ encontrado: false, error: mensajeDeError(error, 'No se pudo buscar al socio') } as DatosSocio))
    );
  }

  /** «Calcular para el contrato»: posiciones reales de firma en el PDF de ese contrato (2 del socio, 1 del representante). */
  posicionesContrato(idContrato: number): Observable<PosicionesContrato | { error: string }> {
    const params = new HttpParams().set('idContrato', idContrato).set('usuario', usuarioSesion());
    return this.http.post<PosicionesContrato>(`${ServiciosCrd.RS_SDPR}/posiciones-contrato`, null, { params }).pipe(
      catchError((error: HttpErrorResponse) => of({ error: mensajeDeError(error, 'No se pudieron calcular las posiciones') }))
    );
  }

  /** `configuracion` no trae la forma común: se envuelve para mostrarla igual que los demás pasos. */
  private normalizar(paso: string, datos: any): RespuestaPaso {
    if (datos && typeof datos === 'object' && 'httpStatus' in datos) return datos as RespuestaPaso;
    return { paso, metodo: 'LOCAL', ruta: paso, peticion: null, httpStatus: 200, duracionMs: 0, respuesta: datos } as unknown as RespuestaPaso;
  }

  /**
   * @param paso segmento de la ruta (`sdpr/{paso}`).
   * @param cuerpo datos del formulario; en multipart viaja como parte JSON `datos`.
   * @param archivos solo en multipart: parte `archivo` (uno o varios PDF).
   * @param multipart los pasos 3 y 5 van siempre en multipart, aunque no suban archivo (p. ej. «usar el contrato N»).
   */
  ejecutar(paso: string, cuerpo: Record<string, unknown>, archivos: File[] = [], multipart = false): Observable<ResultadoEjecucion> {
    const params = new HttpParams().set('usuario', usuarioSesion());
    const url = `${ServiciosCrd.RS_SDPR}/${paso}`;

    let peticion: Observable<RespuestaPaso>;
    if (multipart || archivos.length > 0) {
      const form = new FormData();
      form.append('datos', new Blob([JSON.stringify(cuerpo)], { type: 'application/json' }));
      archivos.forEach((a) => form.append('archivo', a, a.name));
      peticion = this.http.post<RespuestaPaso>(url, form, { params });
    } else {
      peticion = this.http.post<RespuestaPaso>(url, cuerpo, { params });
    }

    return peticion.pipe(
      map((datos) => ({ ok: true, estadoHttp: 200, datos: this.normalizar(paso, datos) } as ResultadoEjecucion)),
      catchError((error: HttpErrorResponse) => {
        const cuerpoError = error?.error;
        // Un paso que Security Data rechazó puede volver con la forma común aunque no sea 2xx.
        if (cuerpoError && typeof cuerpoError === 'object' && 'httpStatus' in cuerpoError) {
          return of({ ok: true, estadoHttp: error.status, datos: cuerpoError as RespuestaPaso } as ResultadoEjecucion);
        }
        return of({
          ok: false,
          estadoHttp: error?.status ?? 0,
          error: typeof cuerpoError === 'object' ? cuerpoError?.error : undefined,
          mensaje: mensajeDeError(error, 'No se pudo ejecutar el paso'),
        } as ResultadoEjecucion);
      })
    );
  }
}

export interface DatosSocio {
  encontrado: boolean;
  nombre?: string;
  correo?: string;
  celular?: string;
  error?: string;
}

/** Una posición de firma tal como la calcula el backend (puntos PDF, origen abajo a la izquierda, página desde 1). */
export interface PosicionFirma {
  numPage: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PosicionesContrato {
  participe: PosicionFirma[];
  representante: PosicionFirma[];
}
