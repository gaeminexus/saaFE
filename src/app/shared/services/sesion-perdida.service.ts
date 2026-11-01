import { Injectable, NgZone, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SessionTimeoutService } from '../../modules/dash/forms/session-timeout/session-timeout.service';
import { AppStateService } from './app-state.service';
import { EVENTO_SESION_PERDIDA, MENSAJE_SESION_PERDIDA, hayUsuarioSesion } from './usuario-sesion';

/**
 * Cierra la sesión cuando el usuario se pierde (borrado en DevTools, logout de otra pestaña que
 * limpia el localStorage compartido, sesión restaurada sin usuario…): avisa, limpia todo y manda
 * a /login. Nunca se sigue con un usuario inventado.
 *
 * Escucha: el evento de `usuarioSesion()` sin usuario, `storage` (otra pestaña cambió el
 * almacenamiento) y `visibilitychange` (al volver a la pestaña se revisa).
 */
@Injectable({ providedIn: 'root' })
export class SesionPerdidaService {
  private readonly sessionTimeout = inject(SessionTimeoutService);
  private readonly appState = inject(AppStateService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly ngZone = inject(NgZone);
  private manejando = false;

  constructor() {
    window.addEventListener(EVENTO_SESION_PERDIDA, () => this.manejar());
    window.addEventListener('storage', () => this.verificar());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.verificar();
      }
    });
  }

  /** Si la app cree que hay sesión (`logged`) pero ya no hay usuario, la cierra. */
  verificar(): void {
    if (sessionStorage.getItem('logged') === 'true' && !hayUsuarioSesion()) {
      this.manejar();
    }
  }

  manejar(): void {
    if (this.manejando) return;
    this.manejando = true;
    this.ngZone.run(() => {
      this.sessionTimeout.logoutByUser();
      this.appState.limpiarDatos();
      this.snackBar.open(MENSAJE_SESION_PERDIDA, 'Cerrar', { duration: 6000 });
    });
    // Se rearma en el próximo ciclo: un login posterior debe poder volver a cerrarse.
    setTimeout(() => (this.manejando = false), 1000);
  }
}
