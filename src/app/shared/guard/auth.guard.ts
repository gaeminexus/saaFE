import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

/**
 * Guard de autenticación
 * Verifica si el usuario está logueado antes de permitir acceso a rutas protegidas
 * Si no está autenticado, redirige al login
 */
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const isLogged = localStorage.getItem('logged') === 'true';

  if (!isLogged) {
    console.warn('AuthGuard: Acceso denegado. Usuario no autenticado.');
    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }

  return true;
};
