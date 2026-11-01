import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { SesionPerdidaService } from '../services/sesion-perdida.service';
import { MENSAJE_SESION_PERDIDA, hayUsuarioSesion } from '../services/usuario-sesion';

const METODOS_DE_ESCRITURA = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Un POST/PUT/PATCH/DELETE sin usuario de sesión NO sale: el backend cree el usuario que manda
 * la pantalla y, si llega vacío, graba "SISTEMA". Se cancela, se cierra la sesión y se manda a
 * /login. La pantalla de login (y '/') queda fuera: ahí todavía no hay usuario.
 */
export const sesionInterceptor: HttpInterceptorFn = (req, next) => {
  if (!METODOS_DE_ESCRITURA.includes(req.method)) {
    return next(req);
  }

  const router = inject(Router);
  const enLogin = /^\/(login)?([?#]|$)/.test(router.url);
  if (enLogin || hayUsuarioSesion()) {
    return next(req);
  }

  inject(SesionPerdidaService).manejar();
  return throwError(
    () =>
      new HttpErrorResponse({
        status: 0,
        url: req.url,
        error: { mensaje: MENSAJE_SESION_PERDIDA },
      }),
  );
};
