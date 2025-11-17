import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { NavItem } from '../../../shared/basics/menu/model/nav-item';
import { MenuListComponent } from '../../../shared/basics/menu/forms/menu-list/menu-list.component';

@Component({
  selector: 'app-menucreditos',
  standalone: true,
  imports: [
    CommonModule, RouterModule, RouterOutlet,
    MatSidenavModule, MatListModule,
    MatIconModule, MatTooltipModule, MatButtonModule, MenuListComponent
  ],
  templateUrl: './menucreditos.component.html',
  styleUrls: ['./menucreditos.component.scss']
})
export class MenucreditosComponent {

  navItems: NavItem[] = [
    {
      displayName: 'Parametrización',
      iconName: 'tune',
      route: '/menucreditos/parametrizacion'
    },
    {
      displayName: 'EXTERS',
      iconName: 'extension',
      route: '/menucreditos/extr'
    },
    {
      displayName: 'Entidad',
      iconName: 'business',
      route: '/menucreditos/entidad'
    },
    {
      displayName: 'Regresar',
      iconName: 'arrow_back',
      route: '/menu'
    }
  ];

  router = inject(Router);
  isCollapsed = signal<boolean>(JSON.parse(localStorage.getItem('cred_sidebar_collapsed') ?? 'false'));

  constructor() {
    effect(() => {
      localStorage.setItem('cred_sidebar_collapsed', JSON.stringify(this.isCollapsed()));
    });
  }

  toggle() {
    this.isCollapsed.update(v => !v);
  }
  isCollapsedFn() { return this.isCollapsed(); }
}
