import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { HeaderComponent } from './shared/header/header.component';
import { FooterComponent } from './shared/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <ng-container *ngIf="!isLoginPage()">
      <app-header [screenTitle]="getScreenTitle()"></app-header>
    </ng-container>
    <router-outlet></router-outlet>
    <ng-container *ngIf="!isLoginPage()">
      <app-footer></app-footer>
    </ng-container>
  `,
})
export class App {
  router = inject(Router);

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
