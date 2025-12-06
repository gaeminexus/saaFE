import { Injectable, NgZone, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { SessionTimeoutWarningComponent } from './session-timeout-warning.component';

/**
 * Servicio de gestión de sesión por inactividad
 *
 * Características:
 * - Monitorea inactividad del usuario
 * - Muestra advertencia antes de cerrar sesión
 * - Se reinicia con cualquier actividad (click, tecla, scroll, etc.)
 * - Modal personalizado con contador regresivo
 * - Configuración dinámica desde base de datos (Rubro 168)
 *
 * Configuración del Rubro 168 (Timeout de Sesión):
 * - Código Alterno 1: Tiempo total de inactividad (en minutos)
 * - Código Alterno 2: Tiempo de advertencia antes del cierre (en minutos)
 *
 * Uso:
 * ```
 * constructor(private sessionTimeout: SessionTimeoutService) {}
 *
 * ngOnInit() {
 *   if (isLoggedIn) {
 *     this.sessionTimeout.initializeSessionTimeout();
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class SessionTimeoutService {
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private ngZone = inject(NgZone);
  private detalleRubroService = inject(DetalleRubroService);

  // 🔑 Configuración del rubro para timeout de sesión
  private readonly RUBRO_TIMEOUT_SESION = 168;
  private readonly CODIGO_ALTERNO_INACTIVITY = 1; // Tiempo total inactividad
  private readonly CODIGO_ALTERNO_WARNING = 2; // Tiempo de advertencia

  // Valores por defecto (fallback si no existe configuración en BD)
  private readonly DEFAULT_INACTIVITY_TIME = 15; // 15 minutos
  private readonly DEFAULT_WARNING_TIME = 2; // 2 minutos

  // Valores dinámicos cargados desde BD
  private INACTIVITY_TIME!: number;
  private WARNING_TIME!: number;

  private inactivityTimer: any;
  private warningTimer: any;
  private destroy$ = new Subject<void>();
  private isInitialized = false;

  /**
   * Inicializa el monitoreo de sesión por inactividad
   * Carga configuración desde base de datos (Rubro 168)
   */
  initializeSessionTimeout(): void {
    if (this.isInitialized) {
      return; // Ya está inicializado
    }

    // Cargar configuración desde base de datos
    this.loadTimeoutConfiguration();

    this.isInitialized = true;
    this.startInactivityTimer();
    this.setupActivityListeners();

    console.log(
      `✅ Session timeout inicializado - Inactividad: ${this.INACTIVITY_TIME} min, Advertencia: ${this.WARNING_TIME} min`
    );
  }

  /**
   * Carga la configuración de timeout desde el rubro 168
   */
  private loadTimeoutConfiguration(): void {
    if (!this.detalleRubroService.estanDatosCargados()) {
      console.warn('⚠️ DetalleRubroService no tiene datos cargados. Usando valores por defecto.');
      this.INACTIVITY_TIME = this.DEFAULT_INACTIVITY_TIME;
      this.WARNING_TIME = this.DEFAULT_WARNING_TIME;
      return;
    }

    // Obtener tiempo de inactividad desde rubro 168, código alterno 1
    const inactivityFromDB = this.detalleRubroService.getNumeroByParentAndAlterno(
      this.RUBRO_TIMEOUT_SESION,
      this.CODIGO_ALTERNO_INACTIVITY
    );

    // Obtener tiempo de advertencia desde rubro 168, código alterno 2
    const warningFromDB = this.detalleRubroService.getNumeroByParentAndAlterno(
      this.RUBRO_TIMEOUT_SESION,
      this.CODIGO_ALTERNO_WARNING
    );

    // Usar valores de BD si existen, sino usar defaults
    this.INACTIVITY_TIME = inactivityFromDB > 0 ? inactivityFromDB : this.DEFAULT_INACTIVITY_TIME;
    this.WARNING_TIME = warningFromDB > 0 ? warningFromDB : this.DEFAULT_WARNING_TIME;

    console.log(
      `📊 Configuración de timeout cargada desde BD (Rubro ${this.RUBRO_TIMEOUT_SESION}):`,
      { inactivityTime: this.INACTIVITY_TIME, warningTime: this.WARNING_TIME }
    );

    // Validar que WARNING_TIME no sea mayor que INACTIVITY_TIME
    if (this.WARNING_TIME >= this.INACTIVITY_TIME) {
      console.error(
        `❌ Configuración inválida: WARNING_TIME (${this.WARNING_TIME}) >= INACTIVITY_TIME (${this.INACTIVITY_TIME}). Usando defaults.`
      );
      this.INACTIVITY_TIME = this.DEFAULT_INACTIVITY_TIME;
      this.WARNING_TIME = this.DEFAULT_WARNING_TIME;
    }
  }

  /**
   * Inicia el temporizador de inactividad
   */
  private startInactivityTimer(): void {
    this.clearTimers();

    this.inactivityTimer = setTimeout(() => {
      console.warn('⏰ Tiempo de inactividad alcanzado - mostrando advertencia');
      this.showWarningDialog();
    }, (this.INACTIVITY_TIME - this.WARNING_TIME) * 60 * 1000);
  }

  /**
   * Muestra el modal de advertencia con contador regresivo
   */
  private showWarningDialog(): void {
    const dialogRef = this.dialog.open(SessionTimeoutWarningComponent, {
      disableClose: true,
      width: '400px',
      data: {
        remainingTime: this.WARNING_TIME * 60, // segundos
      },
    });

    // Cierra sesión automáticamente si no hay respuesta
    this.warningTimer = setTimeout(() => {
      dialogRef.close('timeout');
      this.endSession();
    }, this.WARNING_TIME * 60 * 1000);

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'logout') {
        this.endSession();
      } else if (result === 'continue') {
        // Usuario confirmó seguir activo
        console.log('👤 Sesión continuada - reiniciando contador de inactividad');
        this.startInactivityTimer();
      }
    });
  }

  /**
   * Configura listeners de eventos para detectar actividad del usuario
   */
  private setupActivityListeners(): void {
    this.ngZone.runOutsideAngular(() => {
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

      events.forEach((event) => {
        document.addEventListener(
          event,
          () => {
            this.ngZone.run(() => {
              this.resetInactivityTimer();
            });
          },
          true // Usar captura para asegurar que se detecte toda actividad
        );
      });
    });
  }

  /**
   * Reinicia el temporizador de inactividad
   */
  private resetInactivityTimer(): void {
    this.clearTimers();
    this.startInactivityTimer();
  }

  /**
   * Termina la sesión y redirige al login
   */
  private endSession(): void {
    console.log('🔓 Cerrando sesión por inactividad');

    this.clearTimers();
    this.destroy$.next();
    this.destroy$.complete();

    // Limpiar sesión
    localStorage.clear();
    sessionStorage.clear();

    // Redirigir a login
    this.router.navigate(['/login']);
  }

  /**
   * Limpia todos los temporizadores activos
   */
  private clearTimers(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  /**
   * Destruye el servicio de timeout de sesión
   */
  destroySessionTimeout(): void {
    this.isInitialized = false;
    this.endSession();
  }

  /**
   * Reinicia manualmente el contador (útil después de operaciones críticas)
   */
  resetTimer(): void {
    this.resetInactivityTimer();
  }
}
