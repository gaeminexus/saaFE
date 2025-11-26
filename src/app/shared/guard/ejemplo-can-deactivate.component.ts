import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from './can-deactivate.guard';

/**
 * EJEMPLO de cómo implementar el guard canDeactivate en un componente
 *
 * Los componentes que quieran usar el guard de desactivación deben:
 * 1. Implementar la interfaz CanComponentDeactivate
 * 2. Implementar el método canDeactivate()
 * 3. Tener la ruta configurada con canDeactivate: [canDeactivateGuard]
 */
@Component({
  selector: 'app-ejemplo-can-deactivate',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div>
      <h2>Ejemplo de CanDeactivate</h2>
      <p>Este componente preguntará si deseas salir cuando haya cambios sin guardar</p>

      <input [(ngModel)]="dato" placeholder="Escribe algo...">
      <button (click)="guardar()">Guardar</button>
    </div>
  `
})
export class EjemploCanDeactivateComponent implements CanComponentDeactivate {
  dato = '';
  private cambiosGuardados = true;  // Detectar cambios
  ngOnInit() {
    // Marcar como no guardado cuando hay cambios
  }

  guardar() {
    // Guardar datos
    this.cambiosGuardados = true;
  }

  /**
   * Método requerido por CanComponentDeactivate
   * Retorna:
   * - true: permite salir sin preguntar
   * - false: no permite salir
   * - Observable/Promise<boolean>: para validaciones asíncronas
   */
  canDeactivate(): boolean | Observable<boolean> | Promise<boolean> {
    // Si los cambios están guardados, permitir salir
    if (this.cambiosGuardados) {
      return true;
    }

    // Si hay cambios sin guardar, preguntar al usuario
    return confirm('Tienes cambios sin guardar. ¿Estás seguro de que deseas salir?');
  }
}
