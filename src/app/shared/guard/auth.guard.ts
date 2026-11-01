import { inject } from '@angular/core';
import { Router, CanActivateChildFn, CanActivateFn } from '@angular/router';
import { SesionPerdidaService } from '../services/sesion-perdida.service';
import { hayUsuarioSesion } from '../services/usuario-sesion';

/**
 * Sesión válida = `logged` Y usuario. Antes bastaba `logged`: una pestaña a la que le habían
 * borrado el usuario seguía navegando y grababa con un usuario de relleno.
 */
function verificarSesion(url: string): boolean {
  const router = inject(Router);
  const logged = sessionStorage.getItem('logged') === 'true';

  if (logged && hayUsuarioSesion()) {
    return true;
  }

  if (logged) {
    // Había sesión pero se perdió el usuario: se cierra del todo y se avisa.
    console.warn('AuthGuard: sesión sin usuario. Se cierra la sesión.');
    inject(SesionPerdidaService).manejar();
    return false;
  }

  console.warn('AuthGuard: Acceso denegado. Usuario no autenticado.');
  router.navigate(['/login'], {
    queryParams: { returnUrl: url }
  });
  return false;
}

/**
 * Guard de autenticación
 * Verifica si el usuario está logueado (y tiene usuario) antes de permitir acceso a rutas protegidas
 * Si no está autenticado, redirige al login
 */
export const authGuard: CanActivateFn = (route, state) => verificarSesion(state.url);

/** Mismo criterio para los hijos de un menú padre. */
export const authChildGuard: CanActivateChildFn = (route, state) => verificarSesion(state.url);
