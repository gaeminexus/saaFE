import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideMenuCustomComponent } from '../../../../shared/basics/menu/forms/side-menu-custom/side-menu-custom.component';
import { NavItem } from '../../../../shared/basics/menu/model/nav-item';

@Component({
  selector: 'app-menucuentaxpagar',
  standalone: true,
  imports: [SideMenuCustomComponent, RouterOutlet],
  templateUrl: './menucuentasxpagar.component.html',
  styleUrls: ['./menucuentasxpagar.component.scss'],
})
export class MenucuentaxpagarComponent {
  navItems: NavItem[] = [
    {
      displayName: 'Parametrización',
      iconName: 'tune',
      route: '/menucuentaxpagar/parametrizacion',
      children: [
        {
          displayName: 'Grupos de Productos',
          iconName: 'category',
          route: '/menucuentaxpagar/parametrizacion/grupos-productos',
        },
        /*{
          displayName: 'Productos',
          iconName: 'inventory_2',
          route: '/menucuentaxpagar/parametrizacion/productos',
        },
        {
          displayName: 'Proveedores',
          iconName: 'store',
          route: '/menucuentaxpagar/parametrizacion/proveedores',
        },*/
      ],
    },
    {
      displayName: 'Procesos',
      iconName: 'settings',
      route: '/menucuentaxpagar/procesos',
      children: [
        {
          displayName: 'Bandeja Electrónica',
          iconName: 'inbox',
          route: '/menucuentaxpagar/procesos/bandeja-electronica',
        },
        {
          displayName: 'Gestión de Documentos',
          iconName: 'folder_open',
          route: '/menucuentaxpagar/procesos/gestion-documentos',
        },
        {
          displayName: 'Consulta Documentos',
          iconName: 'receipt_long',
          route: '/menucuentaxpagar/procesos/consulta-documentos',
        },
        {
          displayName: 'Proposición de Pago',
          iconName: 'payment',
          route: '/menucuentaxpagar/procesos/proposicion-pago',
        },
      ],
    },
    {
      displayName: 'Consultas',
      iconName: 'search',
      route: '/menucuentaxpagar/consultas',
      children: [
        {
          displayName: 'Consulta de CxP',
          iconName: 'list_alt',
          route: '/menucuentaxpagar/consultas/cxp',
        },
      ],
    },
    {
      displayName: 'Reportes',
      iconName: 'assessment',
      route: '/menucuentaxpagar/reportes',
      children: [
        {
          displayName: 'Dashboard',
          iconName: 'dashboard',
          route: '/menucuentaxpagar/reportes/dashboard',
        },
      ],
    },
    {
      displayName: 'Negociaciones',
      iconName: 'handshake',
      route: '/menucuentaxpagar/negociaciones',
      children: [
        {
          displayName: 'Administrar Negociaciones',
          iconName: 'list_alt',
          route: '/menucuentaxpagar/negociaciones',
        },
      ],
    },
  ];
}
