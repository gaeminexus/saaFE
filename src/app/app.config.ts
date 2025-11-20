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
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideMaterial } from './shared/providers/material.providers';
import { loadingInterceptor } from './shared/interceptors/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([loadingInterceptor])),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    ...provideMaterial()
  ]
};

