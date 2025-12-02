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
 * SOLO funciona si el componente implementa CanComponentDeactivate
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

  // Si no implementa la interfaz, permitir navegación sin preguntar
  // Solo los componentes que realmente lo necesiten deben implementar CanComponentDeactivate
  return true;
};
