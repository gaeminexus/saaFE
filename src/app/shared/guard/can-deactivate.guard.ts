import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

/**
 * Interfaz que deben implementar los componentes que quieran
 * usar el guard de deactivación
 */
export interface CanComponentDeactivate {
  canDeactivate: () => Observable<boolean> | Promise<boolean> | boolean;
}

/**
 * Guard de desactivación
 * Pregunta al usuario si realmente desea abandonar la página
 * cuando hay cambios sin guardar o al hacer refresh
 */
export const canDeactivateGuard: CanDeactivateFn<CanComponentDeactivate> = (
  component,
  currentRoute,
  currentState,
  nextState
) => {
  // Si el componente implementa el método canDeactivate, usarlo
  if (component && typeof component.canDeactivate === 'function') {
    return component.canDeactivate();
  }

  // Por defecto, preguntar si quiere abandonar la página
  return confirm('¿Está seguro de que desea abandonar esta página? Los cambios no guardados se perderán.');
};
