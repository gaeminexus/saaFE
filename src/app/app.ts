import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { HeaderComponent } from './shared/header/header.component';
import { FooterComponent } from './shared/footer/footer.component';
import { LoadingSpinnerComponent } from './shared/basics/loading-spinner/loading-spinner.component';
import { SpinnerService } from './shared/basics/service/spinner.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, FooterComponent, LoadingSpinnerComponent],
  template: `
    <app-loading-spinner></app-loading-spinner>
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
  private spinnerService = inject(SpinnerService);

  constructor() {
    // Mostrar spinner durante la navegación (especialmente cuando hay resolvers)
    this.router.events.pipe(
      filter(event =>
        event instanceof NavigationStart ||
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      )
    ).subscribe(event => {
      if (event instanceof NavigationStart) {
        this.spinnerService.show();
      } else {
        // Pequeño delay para que se note la carga
        setTimeout(() => this.spinnerService.hide(), 300);
      }
    });
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
