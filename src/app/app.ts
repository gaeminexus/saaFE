import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SessionTimeoutService } from './modules/dash/forms/session-timeout/session-timeout.service';
import { FooterComponent } from './shared/footer/footer.component';
import { HeaderComponent } from './shared/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    @if (!isLoginPage()) {
    <app-header [screenTitle]="getScreenTitle()"></app-header>
    }

    <router-outlet></router-outlet>

    @if (!isLoginPage()) {
    <app-footer></app-footer>
    }
  `,
})
export class App implements OnInit, OnDestroy {
  router = inject(Router);
  private sessionTimeout = inject(SessionTimeoutService);

  ngOnInit(): void {
    // Inicializar session timeout si el usuario está autenticado
    const isLoggedIn = localStorage.getItem('logged') === 'true';
    if (isLoggedIn) {
      this.sessionTimeout.initializeSessionTimeout();
    }
  }

  ngOnDestroy(): void {
    this.sessionTimeout.destroySessionTimeout();
  }

  isLoginPage() {
    return this.router.url === '/' || this.router.url === '/login';
  }

  getScreenTitle() {
    // Obtener el nombre de la empresa del localStorage
    const nombreEmpresa = localStorage.getItem('empresaName');

    // Si existe el nombre de la empresa, mostrarlo siempre
    if (nombreEmpresa) {
      return nombreEmpresa;
    }

    // Si no existe el nombre de empresa, usar los títulos por defecto
    const url = this.router.url;
    if (url.includes('menucreditos')) return 'Menú de Créditos';
    if (url.includes('menucontabilidad')) return 'Menú de Contabilidad';
    if (url.includes('menu')) return 'Menú Principal';
    if (url.includes('welcome')) return 'Bienvenido';
    if (url.includes('datos')) return 'Datos';
    return '';
  }
}
