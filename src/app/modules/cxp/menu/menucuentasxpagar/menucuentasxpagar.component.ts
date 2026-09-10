import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideMenuCustomComponent } from '../../../../shared/basics/menu/forms/side-menu-custom/side-menu-custom.component';
import { NavItem } from '../../../../shared/basics/menu/model/nav-item';
import { Permisos } from '../../../../shared/model/permisos';

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
      idPermiso: Permisos.CXP_PARAMETRIZACION,
      route: '/menucuentaxpagar/parametrizacion',
      children: [
        {
          displayName: 'Grupos de Productos',
          iconName: 'category',
          idPermiso: Permisos.CXP_GRUPOS_DE_PRODUCTOS,
          route: '/menucuentaxpagar/parametrizacion/grupos-productos',
        },
        {
          displayName: 'Datos SRI',
          iconName: 'receipt_long',
          idPermiso: Permisos.CXP_DATOS_SRI,
          route: '/menucuentaxpagar/parametrizacion/datos-sri',
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
      idPermiso: Permisos.CXP_PROCESOS,
      route: '/menucuentaxpagar/procesos',
      children: [
        {
          displayName: 'Bandeja Electrónica',
          iconName: 'inbox',
          idPermiso: Permisos.CXP_BANDEJA_ELECTRONICA,
          route: '/menucuentaxpagar/procesos/bandeja-electronica',
        },
        {
          displayName: 'Gestión de Documentos',
          iconName: 'folder_open',
          idPermiso: Permisos.CXP_GESTION_DE_DOCUMENTOS,
          route: '/menucuentaxpagar/procesos/gestion-documentos',
        },
        {
          displayName: 'Consulta Documentos',
          iconName: 'receipt_long',
          idPermiso: Permisos.CXP_CONSULTA_DOCUMENTOS,
          route: '/menucuentaxpagar/procesos/consulta-documentos',
        },
        {
          displayName: 'Nota de Venta (Manual)',
          iconName: 'edit_note',
          idPermiso: Permisos.CXP_NOTA_DE_VENTA_MANUAL,
          route: '/menucuentaxpagar/procesos/nota-venta-compra-manual',
        },
        {
          displayName: 'Proposición de Pago',
          iconName: 'payment',
          idPermiso: Permisos.CXP_PROPOSICION_DE_PAGO,
          route: '/menucuentaxpagar/procesos/proposicion-pago',
        },
        {
          displayName: 'Sustento tributario (ATS)',
          iconName: 'fact_check',
          idPermiso: Permisos.CXP_SUSTENTO_TRIBUTARIO_ATS,
          route: '/menucuentaxpagar/procesos/sustento-tributario',
        },
      ],
    },
    {
      displayName: 'Pagos',
      iconName: 'account_balance',
      idPermiso: Permisos.CXP_PAGOS,
      route: '/menucuentaxpagar/pagos',
      children: [
        {
          // Renombrado y reapuntado: la pantalla ahora es solo la solicitud
          // (docs/pagos/PLAN-REORGANIZACION-CIRCUITO-PAGOS.md §3.1) — el resto
          // del circuito pasó a Tesorería → Pagos por transferencia.
          displayName: 'Solicitud de pago',
          iconName: 'send_money',
          idPermiso: Permisos.CXP_SOLICITUD_DE_PAGO,
          route: '/menucuentaxpagar/pagos/solicitud',
        },
        {
          displayName: 'Cruce de Anticipo',
          iconName: 'savings',
          idPermiso: Permisos.CXP_CRUCE_DE_ANTICIPO,
          route: '/menucuentaxpagar/pagos/cruce-anticipo',
        },
      ],
    },
    {
      displayName: 'Reportes',
      iconName: 'assessment',
      idPermiso: Permisos.CXP_REPORTES,
      route: '/menucuentaxpagar/reportes',
      children: [
        {
          displayName: 'Dashboard',
          iconName: 'dashboard',
          idPermiso: Permisos.CXP_DASHBOARD,
          route: '/menucuentaxpagar/reportes/dashboard',
        },
      ],
    },
    {
      displayName: 'Negociaciones',
      iconName: 'handshake',
      idPermiso: Permisos.CXP_NEGOCIACIONES,
      route: '/menucuentaxpagar/negociaciones',
      children: [
        {
          displayName: 'Administrar Negociaciones',
          iconName: 'list_alt',
          idPermiso: Permisos.CXP_ADMINISTRAR_NEGOCIACIONES,
          route: '/menucuentaxpagar/negociaciones',
        },
      ],
    },
  ];
}
