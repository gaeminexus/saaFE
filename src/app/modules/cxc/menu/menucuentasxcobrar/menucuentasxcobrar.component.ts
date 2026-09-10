import { Component } from '@angular/core';
import { SideMenuCustomComponent } from '../../../../shared/basics/menu/forms/side-menu-custom/side-menu-custom.component';
import { NavItem } from '../../../../shared/basics/menu/model/nav-item';
import { Permisos } from '../../../../shared/model/permisos';

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
      idPermiso: Permisos.CXC_PARAMETRIZACION,
      route: '/menucuentasxcobrar/parametrizacion',
      children: [
        {
          displayName: 'Grupos de Productos',
          iconName: 'category',
          idPermiso: Permisos.CXC_GRUPOS_DE_PRODUCTOS,
          route: '/menucuentasxcobrar/parametrizacion/grupos-productos',
        },
        {
          displayName: 'Datos Facturador',
          iconName: 'receipt_long',
          idPermiso: Permisos.CXC_DATOS_FACTURADOR,
          route: '/menucuentasxcobrar/parametrizacion/datos-facturador',
        },
        {
          displayName: 'Datos SRI',
          iconName: 'account_balance',
          idPermiso: Permisos.CXC_DATOS_SRI,
          route: '/menucuentasxcobrar/parametrizacion/datos-sri',
        },
      ],
    },
    {
      displayName: 'Cobros',
      iconName: 'payments',
      idPermiso: Permisos.CXC_COBROS,
      route: '/menucuentasxcobrar/cobros',
      children: [
        {
          displayName: 'Registrar Cobro',
          iconName: 'account_balance',
          idPermiso: Permisos.CXC_REGISTRAR_COBRO,
          route: '/menucuentasxcobrar/cobros/registrar',
        },
        {
          displayName: 'Cruce de Anticipo',
          iconName: 'savings',
          idPermiso: Permisos.CXC_CRUCE_DE_ANTICIPO,
          route: '/menucuentasxcobrar/cobros/cruce-anticipo',
        },
        {
          displayName: 'Consulta de Cobros',
          iconName: 'search',
          idPermiso: Permisos.CXC_CONSULTA_DE_COBROS,
          route: '/menucuentasxcobrar/cobros/consulta',
        },
      ],
    },
    {
      displayName: 'Emitir',
      iconName: 'receipt_long',
      idPermiso: Permisos.CXC_EMITIR,
      route: '/menucuentasxcobrar/emitir',
      children: [
        {
          displayName: 'Facturas',
          iconName: 'request_quote',
          idPermiso: Permisos.CXC_FACTURAS,
          route: '/menucuentasxcobrar/emitir/facturas',
        },
        {
          displayName: 'Notas de Crédito',
          iconName: 'assignment_return',
          idPermiso: Permisos.CXC_NOTAS_DE_CREDITO,
          route: '/menucuentasxcobrar/emitir/notas-credito',
        },
        {
          displayName: 'Notas de Débito',
          iconName: 'assignment_late',
          idPermiso: Permisos.CXC_NOTAS_DE_DEBITO,
          route: '/menucuentasxcobrar/emitir/notas-debito',
        },
        {
          displayName: 'Liquidación en Compras',
          iconName: 'shopping_cart_checkout',
          idPermiso: Permisos.CXC_LIQUIDACION_EN_COMPRAS,
          route: '/menucuentasxcobrar/emitir/liquidaciones',
        },
        {
          displayName: 'Retenciones',
          iconName: 'description',
          idPermiso: Permisos.CXC_RETENCIONES,
          route: '/menucuentasxcobrar/emitir/retenciones-v2',
        },
      ],
    },
    {
      displayName: 'Gestionar',
      iconName: 'manage_search',
      idPermiso: Permisos.CXC_GESTIONAR,
      route: '/menucuentasxcobrar/gestionar',
      children: [
        {
          displayName: 'Documentos Electrónicos',
          iconName: 'receipt_long',
          idPermiso: Permisos.CXC_DOCUMENTOS_ELECTRONICOS,
          route: '/menucuentasxcobrar/gestionar/documentos-electronicos',
        },
        {
          displayName: 'Financiar Factura',
          iconName: 'payments',
          idPermiso: Permisos.CXC_FINANCIAR_FACTURA,
          route: '/menucuentasxcobrar/gestionar/financiar-factura',
        },
      ],
    },
    {
      displayName: 'Reportes',
      iconName: 'assessment',
      idPermiso: Permisos.CXC_REPORTES,
      route: '/menucuentasxcobrar/reportes',
      children: [
        {
          displayName: 'Dashboard de Ventas',
          iconName: 'chart_data',
          idPermiso: Permisos.CXC_DASHBOARD_DE_VENTAS,
          route: '/menucuentasxcobrar/reportes/dash-ventas',
        },
        {
          displayName: 'ATS y Cuadre 103/104',
          iconName: 'summarize',
          idPermiso: Permisos.CXC_ATS_Y_CUADRE_103_104,
          route: '/menucuentasxcobrar/reportes/ats',
        },
      ],
    },
  ];
}
