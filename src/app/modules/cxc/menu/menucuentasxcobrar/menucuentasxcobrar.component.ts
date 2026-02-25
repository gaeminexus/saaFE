import { Component } from '@angular/core';
import { SideMenuCustomComponent } from '../../../../shared/basics/menu/forms/side-menu-custom/side-menu-custom.component';
import { NavItem } from '../../../../shared/basics/menu/model/nav-item';

@Component({
  selector: 'app-menucuentasxcobrar',
  standalone: true,
  imports: [SideMenuCustomComponent],
  templateUrl: './menucuentasxcobrar.component.html',
  styleUrls: ['./menucuentasxcobrar.component.scss'],
})
export class MenucuentasxcobrarComponent {
  navItems: NavItem[] = [
    {
      displayName: 'Parametrización',
      iconName: 'tune',
      route: '/menucuentasxcobrar/parametrizacion',
      children: [
        {
          displayName: 'Grupos de Productos',
          iconName: 'category',
          route: '/menucuentasxcobrar/grupo-productos',
        },
      ],
    },
    {
      displayName: 'Procesos',
      iconName: 'settings',
      route: '/menucuentasxcobrar/procesos',
      children: [],
    },
    {
      displayName: 'Reportes',
      iconName: 'assessment',
      route: '/menucuentasxcobrar/reportes',
      children: [],
    },
  ];
}
