import { Component } from '@angular/core';
import { SideMenuCustomComponent } from '../../../../shared/basics/menu/forms/side-menu-custom/side-menu-custom.component';
import { NavItem } from '../../../../shared/basics/menu/model/nav-item';
import { Permisos } from '../../../../shared/model/permisos';

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
      idPermiso: Permisos.CNT_PARAMETRIZACION,
      children: [
        {
          displayName: 'Naturaleza de Cuentas',
          iconName: 'category',
          idPermiso: Permisos.CNT_NATURALEZA_DE_CUENTAS,
          route: '/menucontabilidad/naturaleza-cuentas',
        },
        {
          displayName: 'Plan de Cuentas',
          iconName: 'account_tree',
          idPermiso: Permisos.CNT_PLAN_DE_CUENTAS,
          children: [
            {
              displayName: 'Plan Arbol',
              iconName: 'account_tree',
              idPermiso: Permisos.CNT_PLAN_ARBOL,
              route: '/menucontabilidad/plan-cuentas',
            },
            {
              displayName: 'Plan Grid',
              iconName: 'view_list',
              idPermiso: Permisos.CNT_PLAN_GRID,
              route: '/menucontabilidad/plan-grid',
            },
          ],
        },
        {
          displayName: 'Centro de Costos',
          iconName: 'business_center',
          idPermiso: Permisos.CNT_CENTRO_DE_COSTOS,
          children: [
            {
              displayName: 'Centro Costos Árbol',
              iconName: 'account_tree',
              idPermiso: Permisos.CNT_CENTRO_COSTOS_ARBOL,
              route: '/menucontabilidad/centro-costos/arbol',
            },
            {
              displayName: 'Centro Costos Grid',
              iconName: 'view_list',
              idPermiso: Permisos.CNT_CENTRO_COSTOS_GRID,
              route: '/menucontabilidad/centro-costos/grid',
            },
          ],
        },
        {
          displayName: 'Tipos de Asientos',
          iconName: 'receipt_long',
          idPermiso: Permisos.CNT_TIPOS_DE_ASIENTOS,
          children: [
            {
              displayName: 'General',
              iconName: 'edit_note',
              idPermiso: Permisos.CNT_GENERAL,
              route: '/menucontabilidad/tipos-asientos/general',
            },
            {
              displayName: 'Sistema',
              iconName: 'settings',
              idPermiso: Permisos.CNT_SISTEMA,
              route: '/menucontabilidad/tipos-asientos/sistema',
            },
          ],
        },
        {
          displayName: 'Plantillas',
          iconName: 'description',
          idPermiso: Permisos.CNT_PLANTILLAS,
          children: [
            {
              displayName: 'General',
              iconName: 'edit_note',
              idPermiso: Permisos.CNT_PLANTILLAS_GENERAL,
              route: '/menucontabilidad/plantillas/general',
            },
            {
              displayName: 'Sistema',
              iconName: 'settings',
              idPermiso: Permisos.CNT_PLANTILLAS_SISTEMA,
              route: '/menucontabilidad/plantillas/sistema',
            },
          ],
        },
        {
          displayName: 'Períodos Contables',
          iconName: 'calendar_month',
          idPermiso: Permisos.CNT_PERIODOS_CONTABLES,
          route: '/menucontabilidad/periodo-contable',
        },
        {
          displayName: 'Reportes Contables',
          iconName: 'receipt_long',
          idPermiso: Permisos.CNT_REPORTES_CONTABLES,
          route: '/menucontabilidad/parametrizacion/reportes-contables',
        },
      ],
    },
    {
      displayName: 'Procesos',
      iconName: 'sync_alt',
      idPermiso: Permisos.CNT_PROCESOS,
      children: [
        {
          displayName: 'Asientos Dinámico',
          iconName: 'dynamic_form',
          idPermiso: Permisos.CNT_ASIENTOS_DINAMICO,
          route: '/menucontabilidad/procesos/asientos-dinamico',
        },
        {
          displayName: 'Listado de Asientos',
          iconName: 'list_alt',
          idPermiso: Permisos.CNT_LISTADO_DE_ASIENTOS,
          route: '/menucontabilidad/reportes/listado-asientos',
        },
        /*{
          displayName: 'Mayorización',
          iconName: 'account_balance',
          idPermiso: 830,
          route: '/menucontabilidad/procesos/mayorizacion',
        },*/
        /*{
          displayName: 'Listado de Asientos',
          iconName: 'list_alt',
          idPermiso: 830,
          route: '/menucontabilidad/listado-asientos',
        },*/
        {
          displayName: 'Mayorización - Proceso',
          iconName: 'account_balance',
          idPermiso: Permisos.CNT_MAYORIZACION_PROCESO,
          route: '/menucontabilidad/mayorizacion-proceso',
        },
        {
          displayName: 'Detalle Mayorización',
          iconName: 'table_view',
          idPermiso: Permisos.CNT_DETALLE_MAYORIZACION,
          route: '/menucontabilidad/procesos/detalle-mayorizacion',
        },
      ],
    },
    {
      displayName: 'Reportes',
      iconName: 'bar_chart',
      idPermiso: Permisos.CNT_REPORTES,
      children: [
        {
          displayName: 'Listado de Asientos',
          iconName: 'list_alt',
          idPermiso: Permisos.CNT_REPORTES_LISTADO_DE_ASIENTOS,
          route: '/menucontabilidad/reportes/listado-asientos',
        },
        {
          displayName: 'Balance General',
          iconName: 'balance',
          idPermiso: Permisos.CNT_BALANCE_GENERAL,
          route: '/menucontabilidad/reportes/balance-general',
        },
        /*{
          displayName: 'Estado de Resultados',
          iconName: 'trending_up',
          idPermiso: 830,
          route: '/menucontabilidad/reportes/estado-resultados',
        },*/
        {
          displayName: 'Mayor Analítico',
          iconName: 'analytics',
          idPermiso: Permisos.CNT_MAYOR_ANALITICO,
          route: '/menucontabilidad/reportes/mayor-analitico',
        },
        {
          displayName: 'Mayor Analítico V2',
          iconName: 'view_column',
          idPermiso: Permisos.CNT_MAYOR_ANALITICO_V2,
          route: '/menucontabilidad/reportes/mayor-analitico-v2',
        },
        /*{
          displayName: 'Balance de Prueba',
          iconName: 'fact_check',
          idPermiso: 830,
          route: '/menucontabilidad/reportes/balance-prueba',
        },*/
      ],
    },
    {
      displayName: 'Regresar',
      iconName: 'arrow_back',
      route: '/menu',
    },
  ];
}
