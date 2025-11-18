import { Component, inject, signal, effect } from '@angular/core';
import { RouterModule, Router, RouterOutlet } from '@angular/router';

import { MaterialFormModule } from '../../../shared/modules/material-form.module';
import { NavItem } from '../../../shared/basics/menu/model/nav-item';
import { MenuListComponent } from '../../../shared/basics/menu/forms/menu-list/menu-list.component';

@Component({
  selector: 'app-menucreditos',
  standalone: true,
  imports: [
    RouterModule,
    RouterOutlet,
    MaterialFormModule,
    MenuListComponent
  ],
  templateUrl: './menucreditos.component.html',
  styleUrls: ['./menucreditos.component.scss']
})
export class MenucreditosComponent {

  navItems: NavItem[] = [
    {
      displayName: 'Historicos',
      iconName: 'database_search',
      route: '/menucreditos/parametrizacion',
      children: [
        {
          displayName: 'DELTA21',
          iconName: 'hard_drive_2',
          route: '/menucreditos/extr'
        },
      ]
    },
    {
      displayName: 'Parametrización',
      iconName: 'tune',
      route: '/menucreditos/parametrizacion',
      children: [
        {
          displayName: 'Tipos',
          iconName: 'dataset',
          route: '/menucreditos/extr'
        },
        {
          displayName: 'Estados',
          iconName: 'event_list',
          route: '/menucreditos/extr'
        },
      ]
    },
    {
      displayName: 'Participes',
      iconName: 'person',
      route: '/menucreditos/parametrizacion',
      children: [
        {
          displayName: 'Administrar',
          iconName: 'domain',
          route: '/menucreditos/participe-info'
        },
        {
          displayName: 'Listado General',
          iconName: 'list',
          route: '/menucreditos/navegacion-cascada'
        },
        {
          displayName: 'Dash',
          iconName: 'person_play',
          route: '/menucreditos/participe-dash'
        },
      ]
    },
    {
      displayName: 'Gestión Archivos',
      iconName: 'library_books',
      route: '/menucreditos/parametrizacion',
      children: [
        {
          displayName: 'Cargar Aportes',
          iconName: 'drive_folder_upload',
          route: '/menucreditos/carga-aportes'
        },
        {
          displayName: 'Generar Descuentos',
          iconName: 'system_update_alt',
          route: '/menucreditos/navegacion-cascada'
        },
        {
          displayName: 'Dash',
          iconName: 'person_play',
          route: '/menucreditos/participe-dash'
        },
      ]
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
