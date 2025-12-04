// Variables globales de configuración
export const AppConfig = {
  companyName: 'GAEMI NEXUS',
  companyClient: 'Asoprep',
  systemName: 'S.A.A',
  companyUrl: 'https://www.gaeminexus.com',
  systemUsers: ['admin', 'soporte', 'usuario'],
  theme: {
    primaryColor: '#667eea',
    accentColor: '#764ba2',
    warnColor: '#e74c3c',
    footerYear: new Date().getFullYear()
  }
};
import { ApplicationConfig, APP_INITIALIZER, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideMaterial } from './shared/providers/material.providers';
import { loadingInterceptor } from './shared/interceptors/loading.interceptor';
import { AppStateService } from './shared/services/app-state.service';

/**
 * Factory function para inicializar AppStateService antes del bootstrap
 * Esto garantiza que los datos de sesión se restauren desde localStorage
 * ANTES de que cualquier componente intente acceder a ellos
 */
export function initializeApp(appStateService: AppStateService) {
  return (): Promise<void> => {
    // AppStateService ya ejecuta restaurarDesdeSesion() en su constructor
    // Solo necesitamos forzar su construcción mediante inyección
    return Promise.resolve();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([loadingInterceptor])),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    ...provideMaterial(),

    // Inicializar AppStateService ANTES del bootstrap de la aplicación
    // Esto permite restaurar datos de sesión desde localStorage automáticamente
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AppStateService],
      multi: true
    }
  ]
};

