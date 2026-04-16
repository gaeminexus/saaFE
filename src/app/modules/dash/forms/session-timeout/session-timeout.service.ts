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
  private healthCheckTimer: any;
  private destroy$ = new Subject<void>();
  private isInitialized = false;
  private broadcastChannel: BroadcastChannel | null = null;
  private readonly runtimeTabId = Math.random().toString(36).slice(2);
  private warningDialogRef: any = null;
  private lastBroadcastActivityAt = 0;
  private readonly ACTIVITY_BROADCAST_THROTTLE_MS = 1000;

  private readonly activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  private readonly activityListener = () => {
    this.ngZone.run(() => {
      this.registerActivity(true);
    });
  };
  private readonly visibilityListener = () => {
    if (!document.hidden) {
      this.evaluateSessionState();
    }
  };
  private readonly focusListener = () => {
    this.evaluateSessionState();
  };
  private storageListener?: (e: StorageEvent) => void;

  private readonly SESSION_GROUP_KEY = 'saafeSessionGroupId';
  private readonly LAST_ACTIVITY_KEY = 'saafe_last_activity_ts';
  private readonly ACTIVITY_SIGNAL_KEY = 'saafe_activity_signal';
  private readonly SESSION_KEYS_TO_CLEAR = [
    'logged',
    'token',
    'username',
    'idSucursal',
    'empresa',
    'empresaName',
    'usuario',
    'userName',
    'idUsuario',
    'idEmpresa',
    'usuarioLog',
    'empresaLog',
  ];

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
    this.ensureSessionGroupId();
    this.setupCrossTabLogoutListener();
    this.setupCrossTabActivityStorageListener();
    this.ensureActivityTimestampInitialized();

    this.isInitialized = true;
    this.startSessionHealthCheck();
    this.startInactivityTimer();
    this.setupActivityListeners();
    this.setupVisibilityListeners();
    this.evaluateSessionState();
  }

  private ensureSessionGroupId(): string {
    const existing =
      sessionStorage.getItem(this.SESSION_GROUP_KEY) || localStorage.getItem(this.SESSION_GROUP_KEY);
    if (existing) {
      sessionStorage.setItem(this.SESSION_GROUP_KEY, existing);
      return existing;
    }

    const generated = this.generateId();
    sessionStorage.setItem(this.SESSION_GROUP_KEY, generated);
    localStorage.setItem(this.SESSION_GROUP_KEY, generated);
    return generated;
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private setupCrossTabLogoutListener(): void {
    const groupId = this.ensureSessionGroupId();
    if (!groupId) {
      return;
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    this.broadcastChannel = new BroadcastChannel(`saafe-auth-${groupId}`);
    this.broadcastChannel.onmessage = (event) => {
      const payload = event?.data;
      if (!payload) {
        return;
      }

      if (payload.type === 'LOGOUT') {
        if (payload.sourceTabId === this.runtimeTabId) {
          return;
        }

        this.performLocalLogout(false);
        return;
      }

      if (payload.type === 'ACTIVITY') {
        if (payload.sourceTabId === this.runtimeTabId) {
          return;
        }

        this.applyExternalActivity(Number(payload.timestamp) || Date.now());
      }
    };
  }

  private setupCrossTabActivityStorageListener(): void {
    this.storageListener = (e: StorageEvent) => {
      if (!e.key || !e.newValue) {
        return;
      }

      if (e.key === this.ACTIVITY_SIGNAL_KEY) {
        try {
          const signal = JSON.parse(e.newValue);
          if (!signal || signal.sourceTabId === this.runtimeTabId) {
            return;
          }

          this.applyExternalActivity(Number(signal.timestamp) || Date.now());
        } catch {
          // noop
        }
        return;
      }

      if (e.key === this.LAST_ACTIVITY_KEY) {
        this.evaluateSessionState();
      }
    };

    window.addEventListener('storage', this.storageListener);
  }

  private ensureActivityTimestampInitialized(): void {
    const current = Number(localStorage.getItem(this.LAST_ACTIVITY_KEY) || '0');
    if (!current || Number.isNaN(current)) {
      localStorage.setItem(this.LAST_ACTIVITY_KEY, Date.now().toString());
    }
  }

  private broadcastLogoutToGroup(): void {
    try {
      this.broadcastChannel?.postMessage({
        type: 'LOGOUT',
        sourceTabId: this.runtimeTabId,
      });
    } catch {
      // noop
    }

    // Mecanismo fallback: también usar localStorage para pestañas
    // que no hayan inicializado el canal BroadcastChannel
    try {
      const groupId = sessionStorage.getItem(this.SESSION_GROUP_KEY) ||
        localStorage.getItem(this.SESSION_GROUP_KEY);
      if (groupId) {
        localStorage.setItem(
          'saafe_logout_signal',
          JSON.stringify({ groupId, ts: Date.now(), sourceTabId: this.runtimeTabId })
        );
      }
    } catch {
      // noop
    }
  }

  /**
   * Carga la configuración de timeout desde el rubro 168
   */
  private loadTimeoutConfiguration(): void {
    if (!this.detalleRubroService.estanDatosCargados()) {
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

    // Validar que WARNING_TIME no sea mayor que INACTIVITY_TIME
    if (this.WARNING_TIME >= this.INACTIVITY_TIME) {
      this.INACTIVITY_TIME = this.DEFAULT_INACTIVITY_TIME;
      this.WARNING_TIME = this.DEFAULT_WARNING_TIME;
    }
  }

  /**
   * Inicia el temporizador de inactividad
   */
  private startInactivityTimer(): void {
    this.clearTimers();

    const warningThresholdMs = (this.INACTIVITY_TIME - this.WARNING_TIME) * 60 * 1000;
    const elapsedMs = this.getElapsedSinceLastActivity();
    const remainingUntilWarningMs = warningThresholdMs - elapsedMs;

    if (remainingUntilWarningMs <= 0) {
      this.showWarningDialog();
      return;
    }

    this.inactivityTimer = setTimeout(() => {
      this.showWarningDialog();
    }, remainingUntilWarningMs);
  }

  /**
   * Muestra el modal de advertencia con contador regresivo
   */
  private showWarningDialog(): void {
    const inactivityMs = this.INACTIVITY_TIME * 60 * 1000;
    const elapsedMs = this.getElapsedSinceLastActivity();
    const remainingToLogoutMs = inactivityMs - elapsedMs;

    if (remainingToLogoutMs <= 0) {
      this.endSession();
      return;
    }

    if (this.warningDialogRef) {
      return;
    }

    const dialogRef = this.dialog.open(SessionTimeoutWarningComponent, {
      disableClose: true,
      width: '400px',
      data: {
        remainingTime: Math.ceil(remainingToLogoutMs / 1000), // segundos
      },
    });
    this.warningDialogRef = dialogRef;

    // Cierra sesión automáticamente si no hay respuesta
    this.warningTimer = setTimeout(() => {
      dialogRef.close('timeout');
      this.endSession();
    }, remainingToLogoutMs);

    dialogRef.afterClosed().subscribe((result) => {
      this.warningDialogRef = null;
      if (result === 'logout') {
        this.endSession();
      } else if (result === 'continue') {
        // Usuario confirmó seguir activo
        this.registerActivity(true);
      }
    });
  }

  /**
   * Configura listeners de eventos para detectar actividad del usuario
   */
  private setupActivityListeners(): void {
    this.ngZone.runOutsideAngular(() => {
      this.activityEvents.forEach((event) => {
        document.addEventListener(
          event,
          this.activityListener,
          true // Usar captura para asegurar que se detecte toda actividad
        );
      });
    });
  }

  private setupVisibilityListeners(): void {
    document.addEventListener('visibilitychange', this.visibilityListener, true);
    window.addEventListener('focus', this.focusListener, true);
    window.addEventListener('pageshow', this.focusListener, true);
  }

  private startSessionHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    this.healthCheckTimer = setInterval(() => {
      this.evaluateSessionState();
    }, 5000);
  }

  private evaluateSessionState(): void {
    const isLoggedIn = sessionStorage.getItem('logged') === 'true';
    if (!isLoggedIn) {
      return;
    }

    const elapsedMs = this.getElapsedSinceLastActivity();
    const inactivityMs = this.INACTIVITY_TIME * 60 * 1000;
    const warningThresholdMs = (this.INACTIVITY_TIME - this.WARNING_TIME) * 60 * 1000;

    if (elapsedMs >= inactivityMs) {
      this.endSession();
      return;
    }

    if (elapsedMs >= warningThresholdMs) {
      this.showWarningDialog();
      return;
    }

    this.closeWarningDialogIfOpen();
    this.startInactivityTimer();
  }

  private getElapsedSinceLastActivity(): number {
    const now = Date.now();
    const lastActivityTs = Number(localStorage.getItem(this.LAST_ACTIVITY_KEY) || now.toString());

    if (!lastActivityTs || Number.isNaN(lastActivityTs)) {
      return 0;
    }

    return Math.max(0, now - lastActivityTs);
  }

  private registerActivity(broadcast: boolean): void {
    const now = Date.now();
    localStorage.setItem(this.LAST_ACTIVITY_KEY, now.toString());
    this.closeWarningDialogIfOpen();
    this.startInactivityTimer();

    if (broadcast) {
      this.broadcastActivityToGroup(now);
    }
  }

  private applyExternalActivity(timestamp: number): void {
    const currentTs = Number(localStorage.getItem(this.LAST_ACTIVITY_KEY) || '0');
    if (!currentTs || Number.isNaN(currentTs) || timestamp > currentTs) {
      localStorage.setItem(this.LAST_ACTIVITY_KEY, timestamp.toString());
    }

    this.closeWarningDialogIfOpen();
    this.startInactivityTimer();
  }

  private broadcastActivityToGroup(timestamp: number): void {
    const now = Date.now();
    if (now - this.lastBroadcastActivityAt < this.ACTIVITY_BROADCAST_THROTTLE_MS) {
      return;
    }
    this.lastBroadcastActivityAt = now;

    try {
      this.broadcastChannel?.postMessage({
        type: 'ACTIVITY',
        sourceTabId: this.runtimeTabId,
        timestamp,
      });
    } catch {
      // noop
    }

    try {
      localStorage.setItem(
        this.ACTIVITY_SIGNAL_KEY,
        JSON.stringify({
          sourceTabId: this.runtimeTabId,
          timestamp,
          ts: now,
        })
      );
    } catch {
      // noop
    }
  }

  private closeWarningDialogIfOpen(): void {
    if (this.warningDialogRef) {
      this.warningDialogRef.close();
      this.warningDialogRef = null;
    }

    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  /**
   * Reinicia el temporizador de inactividad
   */
  private resetInactivityTimer(): void {
    this.registerActivity(true);
  }

  /**
   * Termina la sesión y redirige al login
   */
  private endSession(): void {
    const isLoggedIn = sessionStorage.getItem('logged') === 'true';
    if (!isLoggedIn) {
      return;
    }

    this.broadcastLogoutToGroup();
    this.performLocalLogout(true);
  }

  logoutByUser(): void {
    this.broadcastLogoutToGroup();
    this.performLocalLogout(true);
  }

  /**
   * Versión pública para que el header pueda ejecutar logout local
   * al recibir la señal de otra pestaña vía localStorage 'storage' event.
   */
  performLocalLogoutForStorage(): void {
    this.performLocalLogout(true);
  }

  private performLocalLogout(redirectToLogin: boolean): void {
    this.clearTimers();

    this.SESSION_KEYS_TO_CLEAR.forEach((key) => sessionStorage.removeItem(key));
    localStorage.removeItem('logged');
    localStorage.removeItem(this.SESSION_GROUP_KEY);
    localStorage.removeItem(this.LAST_ACTIVITY_KEY);
    localStorage.removeItem(this.ACTIVITY_SIGNAL_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('idSucursal');
    // Limpiar la señal de logout para no re-disparar en otras ventanas no relacionadas
    localStorage.removeItem('saafe_logout_signal');

    if (redirectToLogin) {
      this.router.navigate(['/login']);
    }
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
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Destruye el servicio de timeout de sesión
   */
  destroySessionTimeout(): void {
    this.isInitialized = false;
    this.clearTimers();
    this.closeWarningDialogIfOpen();
    this.broadcastChannel?.close();
    this.broadcastChannel = null;
    this.activityEvents.forEach((event) => {
      document.removeEventListener(event, this.activityListener, true);
    });
    document.removeEventListener('visibilitychange', this.visibilityListener, true);
    window.removeEventListener('focus', this.focusListener, true);
    window.removeEventListener('pageshow', this.focusListener, true);
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = undefined;
    }
  }

  /**
   * Reinicia manualmente el contador (útil después de operaciones críticas)
   */
  resetTimer(): void {
    this.resetInactivityTimer();
  }
}
