import { Component } from '@angular/core';
import { SideMenuCustomComponent } from '../../../../shared/basics/menu/forms/side-menu-custom/side-menu-custom.component';
import { NavItem } from '../../../../shared/basics/menu/model/nav-item';

@Component({
  selector: 'app-menurecursoshumanos',
  standalone: true,
  imports: [SideMenuCustomComponent],
  templateUrl: './menurecursoshumanos.component.html',
  styleUrls: ['./menurecursoshumanos.component.scss'],
})
export class MenurecursoshumanosComponent {
  titulo = 'Recursos Humanos';

  navItems: NavItem[] = [
    {
      displayName: 'Parametrización',
      iconName: 'tune',
      idPermiso: 811,
      children: [
        {
          displayName: 'Departamentos',
          iconName: 'account_tree',
          idPermiso: 830,
          route: '/menurecursoshumanos/parametrizacion/departamentos',
        },
        {
          displayName: 'Cargos/Puestos',
          iconName: 'badge',
          idPermiso: 830,
          route: '/menurecursoshumanos/parametrizacion/cargos',
        },
        {
          displayName: 'Tipos de Contrato',
          iconName: 'description',
          idPermiso: 830,
          route: '/menurecursoshumanos/parametrizacion/tipos-contrato',
        },
        {
          displayName: 'Turnos y Horarios',
          iconName: 'schedule',
          idPermiso: 830,
          route: '/menurecursoshumanos/parametrizacion/turnos',
        },
      ],
    },
    {
      displayName: 'Gestión de Personal',
      iconName: 'group',
      idPermiso: 811,
      children: [
        {
          displayName: 'Empleados',
          iconName: 'person',
          idPermiso: 830,
          route: '/menurecursoshumanos/gestion/empleados',
        },
        {
          displayName: 'Contratos',
          iconName: 'assignment',
          idPermiso: 830,
          route: '/menurecursoshumanos/gestion/contratos',
        },
        {
          displayName: 'Vacaciones',
          iconName: 'beach_access',
          idPermiso: 830,
          route: '/menurecursoshumanos/gestion/vacaciones',
        },
        {
          displayName: 'Permisos/Licencias',
          iconName: 'event',
          idPermiso: 830,
          route: '/menurecursoshumanos/gestion/permisos',
        },
        {
          displayName: 'Asistencia',
          iconName: 'access_time',
          idPermiso: 830,
          route: '/menurecursoshumanos/gestion/asistencia',
        },
      ],
    },
    {
      displayName: 'Procesos',
      iconName: 'sync_alt',
      idPermiso: 811,
      children: [
        {
          displayName: 'Nómina',
          iconName: 'request_quote',
          idPermiso: 830,
          route: '/menurecursoshumanos/procesos/nomina',
        },
        {
          displayName: 'Roles de Pago',
          iconName: 'paid',
          idPermiso: 830,
          route: '/menurecursoshumanos/procesos/roles-pago',
        },
        {
          displayName: 'Aportes/Retenciones',
          iconName: 'percent',
          idPermiso: 830,
          route: '/menurecursoshumanos/procesos/aportes',
        },
        {
          displayName: 'Liquidaciones',
          iconName: 'receipt_long',
          idPermiso: 830,
          route: '/menurecursoshumanos/procesos/liquidaciones',
        },
      ],
    },
    {
      displayName: 'Reportes',
      iconName: 'bar_chart',
      idPermiso: 811,
      children: [
        {
          displayName: 'Roles de Pago',
          iconName: 'summarize',
          idPermiso: 830,
          route: '/menurecursoshumanos/reportes/roles',
        },
        {
          displayName: 'Historial de Vacaciones',
          iconName: 'calendar_month',
          idPermiso: 830,
          route: '/menurecursoshumanos/reportes/vacaciones',
        },
        {
          displayName: 'Asistencia',
          iconName: 'query_stats',
          idPermiso: 830,
          route: '/menurecursoshumanos/reportes/asistencia',
        },
        {
          displayName: 'Nómina Consolidada',
          iconName: 'insights',
          idPermiso: 830,
          route: '/menurecursoshumanos/reportes/nomina',
        },
      ],
    },
    {
      displayName: 'Regresar',
      iconName: 'arrow_back',
      route: '/menu',
    },
  ];
}
