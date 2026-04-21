import { Component } from '@angular/core';
import { SideMenuCustomComponent } from '../../../shared/basics/menu/forms/side-menu-custom/side-menu-custom.component';
import { NavItem } from '../../../shared/basics/menu/model/nav-item';

@Component({
  selector: 'app-menucreditos',
  standalone: true,
  imports: [SideMenuCustomComponent],
  templateUrl: './menucreditos.component.html',
  styleUrls: ['./menucreditos.component.scss'],
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
          route: '/menucreditos/extr',
        },
        {
          displayName: 'Aportes Por Revisar',
          iconName: 'indeterminate_question_box',
          route: '/menucreditos/aportes-revisar',
        },
        {
          displayName: 'Participes Inicial',
          iconName: 'person_text',
          route: '/menucreditos/participe-inicial',
        },
      ],
    },
    {
      displayName: 'Parametrización',
      iconName: 'tune',
      route: '/menucreditos/parametrizacion',
      children: [
        {
          displayName: 'Tipos',
          iconName: 'dataset',
          route: '/menucreditos/tiposCrd',
        },
        {
          displayName: 'Estados',
          iconName: 'event_list',
          route: '/menucreditos/estadosCrd',
        },
        {
          displayName: 'Listados',
          iconName: 'list_alt',
          route: '/menucreditos/listadosCrd',
        },
      ],
    },
    {
      displayName: 'Participes',
      iconName: 'person',
      route: '/menucreditos/parametrizacion',
      children: [
        {
          displayName: 'Administrar',
          iconName: 'domain',
          route: '/menucreditos/participe-info',
        },
        {
          displayName: 'Consulta',
          iconName: 'group_search',
          route: '/menucreditos/entidad-consulta',
        },
        {
          displayName: 'Listado General',
          iconName: 'list',
          route: '/menucreditos/navegacion-cascada',
        },
        {
          displayName: 'Dash',
          iconName: 'person_play',
          route: '/menucreditos/participe-dash',
        },
        {
          displayName: 'Jubilados',
          iconName: 'elderly',
          route: '/menucreditos/jubilados',
        },
      ],
    },
    {
      displayName: 'Contratos',
      iconName: 'library_books',
      route: '/menucreditos/parametrizacion',
      children: [
        {
          displayName: 'Ingreso',
          iconName: 'contract',
          route: '/menucreditos/contrato-edit',
        },
        {
          displayName: 'Administrar',
          iconName: 'developer_guide',
          route: '/menucreditos/contrato-consulta',
        },
        {
          displayName: 'Dash',
          iconName: 'widget_width',
          route: '/menucreditos/contrato-dash',
        },
      ],
    },
    {
      displayName: 'Prestamos',
      iconName: 'account_balance',
      route: '/menucreditos/parametrizacion',
      children: [
        {
          displayName: 'Ingreso',
          iconName: 'credit_score',
          route: '/menucreditos/prestamo-edit',
        },
        {
          displayName: 'Consulta',
          iconName: 'app_registration',
          route: '/menucreditos/prestamo-consulta',
        },
        {
          displayName: 'Dash',
          iconName: 'money_bag',
          route: '/menucreditos/prestamo-dash',
        },
        {
          displayName: 'Consulta Cuotas',
          iconName: 'manage_search',
          route: '/menucreditos/cuota-consulta',
        },
        {
          displayName: 'Repote Valores Insolutos',
          iconName: 'request_quote',
          route: '/menucreditos/repote-valores-insolutos',
        },
      ],
    },
    {
      displayName: 'Cobros',
      iconName: 'currency_exchange',
      route: '/menucreditos/parametrizacion',
      children: [
        {
          displayName: 'Archivos Descuentos',
          iconName: 'system_update_alt',
          // route: '/menucreditos/navegacion-cascada'
        },
        {
          displayName: 'Archivos Petro',
          iconName: 'cards_stack',
          route: '/menucreditos/parametrizacion',
          children: [
            {
              displayName: 'Carga',
              iconName: 'folder_open',
              route: '/menucreditos/parametrizacion',
              children: [
                {
                  displayName: 'Carga Aportes',
                  iconName: 'drive_folder_upload',
                  route: '/menucreditos/archivos-petro/carga/carga-aportes-back',
                },
                {
                  displayName: 'Consulta Carga',
                  iconName: 'manage_search',
                  route: '/menucreditos/archivos-petro/carga/consulta',
                },
              ],
            },
            {
              displayName: 'Generar',
              iconName: 'post_add',
              route: '/menucreditos/parametrizacion',
              children: [
                {
                  displayName: 'Generar Archivo',
                  iconName: 'publish',
                  route: '/menucreditos/archivos-petro/generar/proceso',
                },
                {
                  displayName: 'Consulta Generación',
                  iconName: 'description',
                  route: '/menucreditos/archivos-petro/generar/consulta',
                },
              ],
            },
          ],
        },
        {
          displayName: 'Pago Cuota',
          iconName: 'payment',
          route: '/menucreditos/pago-cuotas',
        },
        {
          displayName: 'Cruce Valores',
          iconName: 'repeat_on',
          route: '/menucreditos/cruce-valores',
        },
        {
          displayName: 'Dash',
          iconName: 'finance',
          // route: '/menucreditos/participe-dash'
        },
      ],
    },
  ];
}
