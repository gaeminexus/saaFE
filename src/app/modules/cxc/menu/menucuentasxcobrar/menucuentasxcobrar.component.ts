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
          route: '/menucuentasxcobrar/parametrizacion/grupos-productos',
        },
        {
          displayName: 'Datos Facturador',
          iconName: 'receipt_long',
          route: '/menucuentasxcobrar/parametrizacion/datos-facturador',
        },
        {
          displayName: 'Datos SRI',
          iconName: 'account_balance',
          route: '/menucuentasxcobrar/parametrizacion/datos-sri',
        },
      ],
    },
    {
      displayName: 'Cobros',
      iconName: 'payments',
      route: '/menucuentasxcobrar/cobros',
      children: [
        {
          displayName: 'Registrar Cobro',
          iconName: 'account_balance',
          route: '/menucuentasxcobrar/cobros/registrar',
        },
        {
          displayName: 'Cruce de Anticipo',
          iconName: 'savings',
          route: '/menucuentasxcobrar/cobros/cruce-anticipo',
        },
      ],
    },
    {
      displayName: 'Emitir',
      iconName: 'receipt_long',
      route: '/menucuentasxcobrar/emitir',
      children: [
        {
          displayName: 'Facturas',
          iconName: 'request_quote',
          route: '/menucuentasxcobrar/emitir/facturas',
        },
        {
          displayName: 'Notas de Crédito',
          iconName: 'assignment_return',
          route: '/menucuentasxcobrar/emitir/notas-credito',
        },
        {
          displayName: 'Notas de Débito',
          iconName: 'assignment_late',
          route: '/menucuentasxcobrar/emitir/notas-debito',
        },
        {
          displayName: 'Liquidación en Compras',
          iconName: 'shopping_cart_checkout',
          route: '/menucuentasxcobrar/emitir/liquidaciones',
        },
        {
          displayName: 'Retenciones',
          iconName: 'description',
          route: '/menucuentasxcobrar/emitir/retenciones-v2',
        },
      ],
    },
    {
      displayName: 'Gestionar',
      iconName: 'manage_search',
      route: '/menucuentasxcobrar/gestionar',
      children: [
        {
          displayName: 'Documentos Electrónicos',
          iconName: 'receipt_long',
          route: '/menucuentasxcobrar/gestionar/documentos-electronicos',
        },
        {
          displayName: 'Financiar Factura',
          iconName: 'payments',
          route: '/menucuentasxcobrar/gestionar/financiar-factura',
        },
      ],
    },
    {
      displayName: 'Reportes',
      iconName: 'assessment',
      route: '/menucuentasxcobrar/reportes',
      children: [
        {
          displayName: 'Dashboard de Ventas',
          iconName: 'chart_data',
          route: '/menucuentasxcobrar/reportes/dash-ventas',
        },
      ],
    },
  ];
}
