import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SideMenuCustomComponent } from '../../../../shared/basics/menu/forms/side-menu-custom/side-menu-custom.component';
import { NavItem } from '../../../../shared/basics/menu/model/nav-item';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { PermisosRrh } from '../../model/permisos-rrh';

@Component({
  selector: 'app-menurecursoshumanos',
  standalone: true,
  imports: [CommonModule, MaterialFormModule, SideMenuCustomComponent],
  templateUrl: './menurecursoshumanos.component.html',
  styleUrls: ['./menurecursoshumanos.component.scss'],
})
export class MenurecursoshumanosComponent {
  titulo = 'Recursos Humanos';

  navItems: NavItem[] = [
    {
      displayName: 'Parametrización',
      iconName: 'tune',
      idPermiso: PermisosRrh.GRUPO_PARAMETRIZACION,
      children: [
        {
          displayName: 'Conceptos de nómina',
          iconName: 'rule',
          idPermiso: PermisosRrh.CONCEPTOS_NOMINA,
          route: '/menurecursoshumanos/parametrizacion/conceptos-nomina',
        },
        {
          displayName: 'Parámetros anuales',
          iconName: 'event_repeat',
          idPermiso: PermisosRrh.PARAMETROS_ANUALES,
          route: '/menurecursoshumanos/parametrizacion/parametros-anuales',
        },
        {
          displayName: 'Tabla de impuesto a la renta',
          iconName: 'account_balance',
          idPermiso: PermisosRrh.TABLA_IMPUESTO_RENTA,
          route: '/menurecursoshumanos/parametrizacion/tabla-impuesto-renta',
        },
        {
          displayName: 'Topes de gastos personales',
          iconName: 'savings',
          idPermiso: PermisosRrh.TOPES_GASTOS_PERSONALES,
          route: '/menurecursoshumanos/parametrizacion/topes-gastos-personales',
        },
        {
          displayName: 'Causales de terminación',
          iconName: 'gavel',
          idPermiso: PermisosRrh.CAUSALES_TERMINACION,
          route: '/menurecursoshumanos/parametrizacion/causales-terminacion',
        },
        {
          displayName: 'Configuración de nómina',
          iconName: 'settings_suggest',
          idPermiso: PermisosRrh.CONFIGURACION_NOMINA,
          route: '/menurecursoshumanos/parametrizacion/configuracion-nomina',
        },
        {
          displayName: 'Formatos de marcación',
          iconName: 'fingerprint',
          idPermiso: PermisosRrh.FORMATOS_MARCACION,
          route: '/menurecursoshumanos/parametrizacion/formatos-marcacion',
        },
        {
          displayName: 'Formatos del archivo bancario',
          iconName: 'account_balance',
          idPermiso: PermisosRrh.FORMATOS_ARCHIVO_BANCARIO,
          route: '/menurecursoshumanos/parametrizacion/formatos-archivo-bancario',
        },
        {
          displayName: 'Departamentos',
          iconName: 'account_tree',
          idPermiso: PermisosRrh.DEPARTAMENTOS,
          route: '/menurecursoshumanos/parametrizacion/departamentos',
        },
        {
          displayName: 'Cargos y puestos',
          iconName: 'badge',
          idPermiso: PermisosRrh.CARGOS,
          route: '/menurecursoshumanos/parametrizacion/cargos',
        },
        {
          displayName: 'Departamento — Cargo',
          iconName: 'hub',
          idPermiso: PermisosRrh.DEPARTAMENTO_CARGO,
          route: '/menurecursoshumanos/parametrizacion/departamento-cargo',
        },
        {
          displayName: 'Tipos de contrato',
          iconName: 'description',
          idPermiso: PermisosRrh.TIPOS_CONTRATO,
          route: '/menurecursoshumanos/parametrizacion/tipos-contrato',
        },
        {
          displayName: 'Turnos y horarios',
          iconName: 'schedule',
          idPermiso: PermisosRrh.TURNOS,
          route: '/menurecursoshumanos/parametrizacion/turnos',
        },
      ],
    },
    {
      displayName: 'Personal',
      iconName: 'group',
      idPermiso: PermisosRrh.GRUPO_PERSONAL,
      children: [
        {
          displayName: 'Colaboradores',
          iconName: 'groups',
          idPermiso: PermisosRrh.COLABORADORES,
          route: '/menurecursoshumanos/personal/colaboradores',
        },
        {
          displayName: 'Vacaciones',
          iconName: 'beach_access',
          idPermiso: PermisosRrh.VACACIONES,
          route: '/menurecursoshumanos/gestion/vacaciones',
        },
        {
          displayName: 'Permisos y licencias',
          iconName: 'event_note',
          idPermiso: PermisosRrh.PERMISOS_LICENCIAS,
          route: '/menurecursoshumanos/gestion/permisos-licencias',
        },
      ],
    },
    {
      displayName: 'Asistencia',
      iconName: 'access_time',
      idPermiso: PermisosRrh.GRUPO_ASISTENCIA,
      children: [
        {
          displayName: 'Marcaciones',
          iconName: 'schedule',
          idPermiso: PermisosRrh.MARCACIONES,
          route: '/menurecursoshumanos/asistencia/marcaciones',
        },
        {
          displayName: 'Importación de marcaciones',
          iconName: 'upload_file',
          idPermiso: PermisosRrh.IMPORTACION_MARCACIONES,
          route: '/menurecursoshumanos/asistencia/importacion',
        },
        {
          displayName: 'Resumen diario',
          iconName: 'today',
          idPermiso: PermisosRrh.RESUMEN_DIARIO,
          route: '/menurecursoshumanos/asistencia/resumen-diario',
        },
        {
          displayName: 'Horas extra',
          iconName: 'more_time',
          idPermiso: PermisosRrh.HORAS_EXTRA,
          route: '/menurecursoshumanos/procesos/horas-extra',
        },
      ],
    },
    {
      displayName: 'Migración de apertura',
      iconName: 'upload_file',
      idPermiso: PermisosRrh.GRUPO_MIGRACION,
      children: [
        {
          displayName: 'Saldos de apertura',
          iconName: 'playlist_add_check',
          idPermiso: PermisosRrh.SALDOS_APERTURA,
          route: '/menurecursoshumanos/migracion/saldos-apertura',
        },
        {
          displayName: 'Acumulados',
          iconName: 'summarize',
          idPermiso: PermisosRrh.ACUMULADOS,
          route: '/menurecursoshumanos/migracion/acumulados',
        },
      ],
    },
    {
      displayName: 'Procesos',
      iconName: 'sync_alt',
      idPermiso: PermisosRrh.GRUPO_PROCESOS,
      children: [
        {
          displayName: 'Períodos de nómina',
          iconName: 'event_note',
          idPermiso: PermisosRrh.PERIODOS_NOMINA,
          route: '/menurecursoshumanos/procesos/periodos-nomina',
        },
        {
          displayName: 'Novedades del período',
          iconName: 'playlist_add',
          idPermiso: PermisosRrh.NOVEDADES_NOMINA,
          route: '/menurecursoshumanos/procesos/novedades-nomina',
        },
        {
          displayName: 'Novedades del mes (IESS)',
          iconName: 'assignment_late',
          idPermiso: PermisosRrh.NOVEDADES_IESS,
          route: '/menurecursoshumanos/procesos/novedades-iess',
        },
        {
          displayName: 'Horas extra',
          iconName: 'more_time',
          idPermiso: PermisosRrh.HORAS_EXTRA,
          route: '/menurecursoshumanos/procesos/horas-extra',
        },
        {
          displayName: 'Proyección de impuesto a la renta',
          iconName: 'account_balance',
          idPermiso: PermisosRrh.PROYECCION_IR,
          route: '/menurecursoshumanos/procesos/proyeccion-ir',
        },
        {
          displayName: 'Descuentos recurrentes',
          iconName: 'credit_score',
          idPermiso: PermisosRrh.DESCUENTOS_RECURRENTES,
          route: '/menurecursoshumanos/procesos/descuentos-recurrentes',
        },
        {
          displayName: 'Roles de pago',
          iconName: 'paid',
          idPermiso: PermisosRrh.ROLES_PAGO,
          route: '/menurecursoshumanos/procesos/roles-pago',
        },
        {
          displayName: 'Órdenes de pago',
          iconName: 'payments',
          idPermiso: PermisosRrh.ORDENES_PAGO,
          route: '/menurecursoshumanos/procesos/ordenes-pago',
        },
        {
          displayName: 'Reportes de nómina',
          iconName: 'summarize',
          idPermiso: PermisosRrh.REPORTES_NOMINA,
          route: '/menurecursoshumanos/procesos/reportes-nomina',
        },
        {
          displayName: 'Aportes y retenciones',
          iconName: 'account_balance_wallet',
          idPermiso: PermisosRrh.APORTES_RETENCIONES,
          route: '/menurecursoshumanos/procesos/aportes',
        },
        {
          displayName: 'Liquidación',
          iconName: 'assignment_turned_in',
          idPermiso: PermisosRrh.LIQUIDACION,
          route: '/menurecursoshumanos/procesos/liquidacion',
        },
        {
          displayName: 'Salidas oficiales',
          iconName: 'assured_workload',
          idPermiso: PermisosRrh.SALIDAS_OFICIALES,
          route: '/menurecursoshumanos/procesos/salidas-oficiales',
        },
        {
          displayName: 'Reparto de utilidades',
          iconName: 'pie_chart',
          idPermiso: PermisosRrh.UTILIDADES,
          route: '/menurecursoshumanos/procesos/utilidades',
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
