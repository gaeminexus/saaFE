import { Component } from '@angular/core';
import { SideMenuCustomComponent } from '../../../../shared/basics/menu/forms/side-menu-custom/side-menu-custom.component';
import { NavItem } from '../../../../shared/basics/menu/model/nav-item';

@Component({
  selector: 'app-menucuentaxpagar',
  standalone: true,
  imports: [SideMenuCustomComponent],
  templateUrl: './menucuentasxpagar.component.html',
  styleUrls: ['./menucuentasxpagar.component.scss'],
})
export class MenucuentaxpagarComponent {
  navItems: NavItem[] = [
    {
      displayName: 'Parametrización',
      iconName: 'tune',
      route: '/menucuentasxpagar/parametrizacion',
      children: [
        {
          displayName: 'Productos Grid',
          iconName: 'grid_on',
          route: '/productos-grid',
        },
        {
          displayName: 'Productos Árbol',
          iconName: 'account_tree',
          route: '/productos-arbol',
        },
      ],
    },
    {
      displayName: 'Procesos',
      iconName: 'settings',
      route: '/menucuentasxpagar/procesos',
      children: [],
    },
    {
      displayName: 'Reportes',
      iconName: 'assessment',
      route: '/menucuentasxpagar/reportes',
      children: [],
    },
  ];
}
