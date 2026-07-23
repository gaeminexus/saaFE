import { Component } from '@angular/core';
import { SideMenuCustomComponent } from '../../../../shared/basics/menu/forms/side-menu-custom/side-menu-custom.component';
import { NavItem } from '../../../../shared/basics/menu/model/nav-item';

@Component({
  selector: 'app-menutesoreria',
  standalone: true,
  imports: [SideMenuCustomComponent],
  templateUrl: './menutesoreria.component.html',
  styleUrls: ['./menutesoreria.component.scss'],
})
export class MenutesoreriaComponent {
  titulo = 'Tesorería';

  navItems: NavItem[] = [
    {
      displayName: 'Parametrización',
      iconName: 'tune',
      idPermiso: 811,
      children: [
        {
          displayName: 'Bancos',
          iconName: 'account_balance',
          idPermiso: 830,
          children: [
            {
              displayName: 'Nacionales y Extranjeros',
              iconName: 'public',
              idPermiso: 830,
              route: '/menutesoreria/parametrizacion/bancos/nacionales-extranjeros',
            },
            {
              displayName: 'Mis Bancos',
              iconName: 'account_balance_wallet',
              idPermiso: 830,
              children: [
                {
                  displayName: 'Bancos',
                  iconName: 'account_balance',
                  idPermiso: 830,
                  route: '/menutesoreria/parametrizacion/bancos/mis-bancos/bancos',
                },
                {
                  displayName: 'Cuentas Bancarias',
                  iconName: 'credit_card',
                  idPermiso: 830,
                  route: '/menutesoreria/parametrizacion/bancos/mis-bancos/cuentas-bancarias',
                },
                {
                  displayName: 'Chequeras',
                  iconName: 'receipt_long',
                  idPermiso: 830,
                  children: [
                    {
                      displayName: 'Solicitud Chequera',
                      iconName: 'playlist_add',
                      idPermiso: 830,
                      route: '/menutesoreria/parametrizacion/bancos/mis-bancos/chequeras/solicitud',
                    },
                    {
                      displayName: 'Recepción Chequera',
                      iconName: 'assignment_turned_in',
                      idPermiso: 830,
                      route: '/menutesoreria/parametrizacion/bancos/mis-bancos/chequeras/recepcion',
                    },
                    {
                      displayName: 'Cheques',
                      iconName: 'payments',
                      idPermiso: 830,
                      route: '/menutesoreria/parametrizacion/bancos/mis-bancos/chequeras/cheques',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          displayName: 'Cajas',
          iconName: 'inventory_2',
          idPermiso: 830,
          children: [
            {
              displayName: 'Lógicas',
              iconName: 'category',
              idPermiso: 830,
              children: [
                {
                  displayName: 'Grupos',
                  iconName: 'group_work',
                  idPermiso: 830,
                  route: '/menutesoreria/parametrizacion/cajas/logicas/grupos',
                },
                {
                  displayName: 'Cajas por Grupo',
                  iconName: 'view_module',
                  idPermiso: 830,
                  route: '/menutesoreria/parametrizacion/cajas/logicas/cajas-por-grupo',
                },
              ],
            },
            {
              displayName: 'Físicas',
              iconName: 'warehouse',
              idPermiso: 830,
              route: '/menutesoreria/parametrizacion/cajas/fisicas',
            },
          ],
        },
        {
          displayName: 'Titulares',
          iconName: 'account_box',
          idPermiso: 830,
          route: '/menutesoreria/parametrizacion/titulares',
        },
      ],
    },
    {
      displayName: 'Procesos',
      iconName: 'sync_alt',
      idPermiso: 811,
      children: [
        {
          displayName: 'Cobros',
          iconName: 'attach_money',
          idPermiso: 830,
          children: [
            {
              displayName: 'Ingresar',
              iconName: 'login',
              idPermiso: 830,
              route: '/menutesoreria/procesos/cobros/ingresar',
            },
            {
              displayName: 'Cierre de Caja',
              iconName: 'lock',
              idPermiso: 830,
              route: '/menutesoreria/procesos/cobros/cierre-caja',
            },
            {
              displayName: 'Depósitos',
              iconName: 'account_balance_wallet',
              idPermiso: 830,
              children: [
                {
                  displayName: 'Envío',
                  iconName: 'outbox',
                  idPermiso: 830,
                  route: '/menutesoreria/procesos/cobros/depositos/envio',
                },
                {
                  displayName: 'Ratificación',
                  iconName: 'verified',
                  idPermiso: 830,
                  route: '/menutesoreria/procesos/cobros/depositos/ratificacion',
                },
              ],
            },
            {
              displayName: 'Consultas',
              iconName: 'search',
              idPermiso: 830,
              children: [
                {
                  displayName: 'Cobros',
                  iconName: 'analytics',
                  idPermiso: 830,
                  route: '/menutesoreria/procesos/cobros/consultas/cobros',
                },
                {
                  displayName: 'Cierres',
                  iconName: 'fact_check',
                  idPermiso: 830,
                  route: '/menutesoreria/procesos/cobros/consultas/cierres',
                },
              ],
            },
            {
              displayName: 'Procesos',
              iconName: 'settings',
              idPermiso: 830,
              children: [
                {
                  displayName: 'Cobros',
                  iconName: 'payments',
                  idPermiso: 830,
                  route: '/menutesoreria/procesos/cobros/procesos/cobros',
                },
                {
                  displayName: 'Cierres',
                  iconName: 'task_alt',
                  idPermiso: 830,
                  route: '/menutesoreria/procesos/cobros/procesos/cierres',
                },
                {
                  displayName: 'Depósitos',
                  iconName: 'account_balance_wallet',
                  idPermiso: 830,
                  route: '/menutesoreria/procesos/cobros/procesos/depositos',
                },
                {
                  displayName: 'Ratificación Depósitos',
                  iconName: 'rule',
                  idPermiso: 830,
                  route: '/menutesoreria/procesos/cobros/procesos/ratificacion-depositos',
                },
              ],
            },
          ],
        },
        {
          displayName: 'Pagos',
          iconName: 'payments',
          idPermiso: 830,
          children: [
            {
              displayName: 'Ingreso',
              iconName: 'login',
              idPermiso: 830,
              route: '/menutesoreria/procesos/pagos/ingreso',
            },
            {
              displayName: 'Cheques',
              iconName: 'receipt_long',
              idPermiso: 830,
              children: [
                {
                  displayName: 'Impresión',
                  iconName: 'print',
                  idPermiso: 830,
                  route: '/menutesoreria/procesos/pagos/cheques/impresion',
                },
                {
                  displayName: 'Entrega',
                  iconName: 'assignment_turned_in',
                  idPermiso: 830,
                  route: '/menutesoreria/procesos/pagos/cheques/entrega',
                },
              ],
            },
            {
              displayName: 'Consulta',
              iconName: 'manage_search',
              idPermiso: 830,
              children: [
                {
                  displayName: 'Pagos',
                  iconName: 'payments',
                  idPermiso: 830,
                  route: '/menutesoreria/procesos/pagos/consulta/pagos',
                },
                {
                  displayName: 'Cheques',
                  iconName: 'receipt_long',
                  idPermiso: 830,
                  route: '/menutesoreria/procesos/pagos/consulta/cheques',
                },
              ],
            },
            {
              displayName: 'Procesos',
              iconName: 'settings',
              idPermiso: 830,
              children: [
                {
                  displayName: 'Solicitud Pagos',
                  iconName: 'playlist_add',
                  idPermiso: 830,
                  route: '/menutesoreria/procesos/pagos/procesos/solicitud-pagos',
                },
                {
                  displayName: 'Cheques Generados',
                  iconName: 'done_all',
                  idPermiso: 830,
                  route: '/menutesoreria/procesos/pagos/procesos/cheques-generados',
                },
                {
                  displayName: 'Cheques Impresos',
                  iconName: 'print',
                  idPermiso: 830,
                  route: '/menutesoreria/procesos/pagos/procesos/cheques-impresos',
                },
                {
                  displayName: 'Cheques Entregados',
                  iconName: 'task_alt',
                  idPermiso: 830,
                  route: '/menutesoreria/procesos/pagos/procesos/cheques-entregados',
                },
              ],
            },
          ],
        },
        {
          displayName: 'Movimientos Bancarios',
          iconName: 'account_balance',
          idPermiso: 830,
          children: [
            {
              displayName: 'Débitos',
              iconName: 'arrow_downward',
              idPermiso: 830,
              route: '/menutesoreria/procesos/movimientos-bancarios/debitos',
            },
            {
              displayName: 'Créditos',
              iconName: 'arrow_upward',
              idPermiso: 830,
              route: '/menutesoreria/procesos/movimientos-bancarios/creditos',
            },
            {
              displayName: 'Transferencias',
              iconName: 'swap_horiz',
              idPermiso: 830,
              route: '/menutesoreria/procesos/movimientos-bancarios/transferencias',
            },
          ],
        },
        {
          displayName: 'Generales',
          iconName: 'menu_book',
          idPermiso: 830,
          children: [
            {
              displayName: 'Conciliación',
              iconName: 'compare_arrows',
              idPermiso: 830,
              route: '/menutesoreria/procesos/generales/conciliacion',
            },
            {
              displayName: 'Consulta Conciliación',
              iconName: 'search',
              idPermiso: 830,
              route: '/menutesoreria/procesos/generales/consulta-conciliacion',
            },
            {
              displayName: 'RIED',
              iconName: 'folder_shared',
              idPermiso: 830,
              route: '/menutesoreria/procesos/generales/ried',
            },
          ],
        },
      ],
    },
    { displayName: 'Regresar', iconName: 'arrow_back', route: '/menu' },
  ];
}
