import { Component } from '@angular/core';
import { SideMenuCustomComponent } from '../../../../shared/basics/menu/forms/side-menu-custom/side-menu-custom.component';
import { NavItem } from '../../../../shared/basics/menu/model/nav-item';

@Component({
  selector: 'app-menucontabilidad',
  standalone: true,
  imports: [SideMenuCustomComponent],
  templateUrl: './menucontabilidad.component.html',
  styleUrls: ['./menucontabilidad.component.scss'],
})
export class MenuContabilidadComponent {
  navItems: NavItem[] = [
    {
      displayName: 'Parametrización',
      iconName: 'tune',
      idPermiso: 811,
      children: [
        {
          displayName: 'Naturaleza de Cuentas',
          iconName: 'category',
          idPermiso: 830,
          route: '/menucontabilidad/naturaleza-cuentas',
        },
        {
          displayName: 'Plan de Cuentas',
          iconName: 'account_tree',
          idPermiso: 830,
          children: [
            {
              displayName: 'Plan Arbol',
              iconName: 'account_tree',
              idPermiso: 830,
              route: '/menucontabilidad/plan-cuentas',
            },
            {
              displayName: 'Plan Grid',
              iconName: 'view_list',
              idPermiso: 830,
              route: '/menucontabilidad/plan-grid',
            },
          ],
        },
        {
          displayName: 'Centro de Costos',
          iconName: 'business_center',
          idPermiso: 830,
          children: [
            {
              displayName: 'Centro Costos Árbol',
              iconName: 'account_tree',
              idPermiso: 830,
              route: '/menucontabilidad/centro-costos/arbol',
            },
            {
              displayName: 'Centro Costos Grid',
              iconName: 'view_list',
              idPermiso: 830,
              route: '/menucontabilidad/centro-costos/grid',
            },
          ],
        },
        {
          displayName: 'Tipos de Asientos',
          iconName: 'receipt_long',
          idPermiso: 830,
          children: [
            {
              displayName: 'General',
              iconName: 'edit_note',
              idPermiso: 830,
              route: '/menucontabilidad/tipos-asientos/general',
            },
            {
              displayName: 'Sistema',
              iconName: 'settings',
              idPermiso: 830,
              route: '/menucontabilidad/tipos-asientos/sistema',
            },
          ],
        },
        {
          displayName: 'Plantillas',
          iconName: 'description',
          idPermiso: 830,
          children: [
            {
              displayName: 'General',
              iconName: 'edit_note',
              idPermiso: 830,
              route: '/menucontabilidad/plantillas/general',
            },
            {
              displayName: 'Sistema',
              iconName: 'settings',
              idPermiso: 830,
              route: '/menucontabilidad/plantillas/sistema',
            },
          ],
        },
        {
          displayName: 'Períodos Contables',
          iconName: 'calendar_month',
          idPermiso: 830,
          route: '/menucontabilidad/periodo-contable',
        },
      ],
    },
    {
      displayName: 'Procesos',
      iconName: 'sync_alt',
      idPermiso: 811,
      children: [
        {
          displayName: 'Asientos Dinámico',
          iconName: 'dynamic_form',
          idPermiso: 830,
          route: '/menucontabilidad/procesos/asientos-dinamico',
        },
        {
          displayName: 'Listado de Asientos',
          iconName: 'list_alt',
          idPermiso: 830,
          route: '/menucontabilidad/listado-asientos',
        },
        {
          displayName: 'Mayorización - Proceso',
          iconName: 'account_balance',
          idPermiso: 830,
          route: '/menucontabilidad/mayorizacion-proceso',
        },
      ],
    },
    {
      displayName: 'Reportes',
      iconName: 'bar_chart',
      idPermiso: 811,
      children: [
        {
          displayName: 'Balance General',
          iconName: 'balance',
          idPermiso: 830,
          route: '/menucontabilidad/reportes/balance-general',
        },
        {
          displayName: 'Estado de Resultados',
          iconName: 'trending_up',
          idPermiso: 830,
          route: '/menucontabilidad/reportes/estado-resultados',
        },
        {
          displayName: 'Mayor Analítico',
          iconName: 'analytics',
          idPermiso: 830,
          route: '/menucontabilidad/reportes/mayor-analitico',
        },
        {
          displayName: 'Listado de Asientos',
          iconName: 'list_alt',
          idPermiso: 830,
          route: '/menucontabilidad/reportes/listado-asientos',
        },
        {
          displayName: 'Balance de Prueba',
          iconName: 'fact_check',
          idPermiso: 830,
          route: '/menucontabilidad/reportes/balance-prueba',
        },
      ],
    },
    {
      displayName: 'Créditos',
      iconName: 'credit_score',
      route: '/menucreditos',
    },
    {
      displayName: 'Regresar',
      iconName: 'arrow_back',
      route: '/menu',
    },
  ];
}
