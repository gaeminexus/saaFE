import { Component } from '@angular/core';
import { SideMenuCustomComponent } from '../../../shared/basics/menu/forms/side-menu-custom/side-menu-custom.component';
import { NavItem } from '../../../shared/basics/menu/model/nav-item';
import { esUsuarioUno } from '../../../shared/guard/usuario-uno.guard';
import { Permisos } from '../../../shared/model/permisos';

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
      idPermiso: Permisos.CRD_HISTORICOS,
      route: '/menucreditos/parametrizacion',
      children: [
        {
          displayName: 'DELTA21',
          iconName: 'hard_drive_2',
          idPermiso: Permisos.CRD_DELTA21,
          route: '/menucreditos/extr',
        },
        {
          displayName: 'Aportes Por Revisar',
          iconName: 'indeterminate_question_box',
          idPermiso: Permisos.CRD_APORTES_POR_REVISAR,
          route: '/menucreditos/aportes-revisar',
        },
        {
          displayName: 'Participes Inicial',
          iconName: 'person_text',
          idPermiso: Permisos.CRD_PARTICIPES_INICIAL,
          route: '/menucreditos/participe-inicial',
        },
      ],
    },
    {
      displayName: 'Parametrización',
      iconName: 'tune',
      idPermiso: Permisos.CRD_PARAMETRIZACION,
      route: '/menucreditos/parametrizacion',
      children: [
        {
          displayName: 'Info. General Fondo',
          iconName: 'account_balance',
          idPermiso: Permisos.CRD_INFORMACION_GENERAL_DEL_FONDO,
          route: '/menucreditos/informacion-general-fondo',
        },
        {
          displayName: 'Tipos',
          iconName: 'dataset',
          idPermiso: Permisos.CRD_TIPOS,
          route: '/menucreditos/tiposCrd',
        },
        {
          displayName: 'Estados',
          iconName: 'event_list',
          idPermiso: Permisos.CRD_ESTADOS,
          route: '/menucreditos/estadosCrd',
        },
        {
          displayName: 'Listados',
          iconName: 'list_alt',
          idPermiso: Permisos.CRD_LISTADOS,
          route: '/menucreditos/listadosCrd',
        },
      ],
    },
    // La opción "Bandas de Cartera" se agrega en el constructor solo para el USUARIO 1
    // (ver TODO temporal en shared/guard/usuario-uno.guard.ts).
    {
      displayName: 'Participes',
      iconName: 'person',
      idPermiso: Permisos.CRD_PARTICIPES,
      route: '/menucreditos/parametrizacion',
      children: [
        {
          displayName: 'Administrar',
          iconName: 'domain',
          idPermiso: Permisos.CRD_ADMINISTRAR,
          route: '/menucreditos/participe-info',
        },
        {
          displayName: 'Consulta',
          iconName: 'group_search',
          idPermiso: Permisos.CRD_CONSULTA,
          route: '/menucreditos/entidad-consulta',
        },
        {
          displayName: 'Listado General',
          iconName: 'list',
          idPermiso: Permisos.CRD_LISTADO_GENERAL,
          route: '/menucreditos/navegacion-cascada',
        },
        {
          displayName: 'Consolidado',
          iconName: 'table_chart',
          idPermiso: Permisos.CRD_CONSOLIDADO,
          route: '/menucreditos/consolidado',
        },
        {
          displayName: 'Jubilados',
          iconName: 'elderly',
          idPermiso: Permisos.CRD_JUBILADOS,
          route: '/menucreditos/parametrizacion',
          children: [
            {
              displayName: 'Jubilar Participe',
              iconName: 'person_check',
              idPermiso: Permisos.CRD_JUBILAR_PARTICIPE,
              route: '/menucreditos/jubilar-participe',
            },
            {
              displayName: 'Pago Jubilados',
              iconName: 'payments',
              idPermiso: Permisos.CRD_PAGO_JUBILADOS,
              route: '/menucreditos/jubilados',
            },
          ],
        },
      ],
    },
    {
      displayName: 'Contratos',
      iconName: 'library_books',
      idPermiso: Permisos.CRD_CONTRATOS,
      route: '/menucreditos/parametrizacion',
      children: [
        {
          displayName: 'Ingreso',
          iconName: 'contract',
          idPermiso: Permisos.CRD_INGRESO,
          route: '/menucreditos/contrato-edit',
        },
        {
          displayName: 'Administrar',
          iconName: 'developer_guide',
          idPermiso: Permisos.CRD_CONTRATOS_ADMINISTRAR,
          route: '/menucreditos/contrato-consulta',
        },
        {
          displayName: 'Dash',
          iconName: 'widget_width',
          idPermiso: Permisos.CRD_DASH,
          route: '/menucreditos/contrato-dash',
        },
      ],
    },
    {
      displayName: 'Prestamos',
      iconName: 'account_balance',
      idPermiso: Permisos.CRD_PRESTAMOS,
      route: '/menucreditos/parametrizacion',
      children: [
        {
          displayName: 'Ingreso',
          iconName: 'credit_score',
          idPermiso: Permisos.CRD_PRESTAMOS_INGRESO,
          route: '/menucreditos/prestamo-edit',
        },
        {
          displayName: 'Consulta',
          iconName: 'app_registration',
          idPermiso: Permisos.CRD_PRESTAMOS_CONSULTA,
          route: '/menucreditos/prestamo-consulta',
        },
        {
          displayName: 'Dash',
          iconName: 'money_bag',
          idPermiso: Permisos.CRD_PRESTAMOS_DASH,
          route: '/menucreditos/prestamo-dash',
        },
        {
          displayName: 'Consulta Cuotas',
          iconName: 'manage_search',
          idPermiso: Permisos.CRD_CONSULTA_CUOTAS,
          route: '/menucreditos/cuota-consulta',
        },
        {
          displayName: 'Repote Valores Insolutos',
          iconName: 'request_quote',
          idPermiso: Permisos.CRD_REPORTE_VALORES_INSOLUTOS,
          route: '/menucreditos/repote-valores-insolutos',
        },
        {
          displayName: 'Asignación de Seguros',
          iconName: 'verified_user',
          idPermiso: Permisos.CRD_ASIGNACION_DE_SEGUROS,
          route: '/menucreditos/asignacion-seguros',
        },
      ],
    },
    {
      displayName: 'Cobros',
      iconName: 'currency_exchange',
      idPermiso: Permisos.CRD_COBROS,
      route: '/menucreditos/parametrizacion',
      children: [
        // "Archivos Descuentos" comentado el 2026-09-10: no tiene pantalla programada (sin
        // `route`, y sin ningún `path` bajo `menucreditos` que lo respalde — ver
        // docs/seguridad/INVENTARIO-PANTALLAS-SAA.md, ÍTEM 2(a)). Por decisión del usuario, una
        // opción de menú sin pantalla no se muestra. No borrar: recuperable el día que exista.
        // {
        //   displayName: 'Archivos Descuentos',
        //   iconName: 'system_update_alt',
        // },
        {
          displayName: 'Archivos Petro',
          iconName: 'cards_stack',
          idPermiso: Permisos.CRD_ARCHIVOS_PETRO,
          route: '/menucreditos/parametrizacion',
          children: [
            {
              displayName: 'Carga',
              iconName: 'folder_open',
              idPermiso: Permisos.CRD_CARGA,
              route: '/menucreditos/parametrizacion',
              children: [
                {
                  displayName: 'Carga Aportes',
                  iconName: 'drive_folder_upload',
                  idPermiso: Permisos.CRD_CARGA_APORTES,
                  route: '/menucreditos/archivos-petro/carga/carga-aportes-back',
                },
                {
                  displayName: 'Consulta Carga',
                  iconName: 'manage_search',
                  idPermiso: Permisos.CRD_CONSULTA_CARGA,
                  route: '/menucreditos/archivos-petro/carga/consulta',
                },
              ],
            },
            {
              displayName: 'Generar',
              iconName: 'post_add',
              idPermiso: Permisos.CRD_GENERAR,
              route: '/menucreditos/parametrizacion',
              children: [
                {
                  displayName: 'Generar Archivo',
                  iconName: 'publish',
                  idPermiso: Permisos.CRD_GENERAR_ARCHIVO,
                  route: '/menucreditos/archivos-petro/generar/proceso',
                },
                {
                  displayName: 'Consulta Generación',
                  iconName: 'description',
                  idPermiso: Permisos.CRD_CONSULTA_GENERACION,
                  route: '/menucreditos/archivos-petro/generar/consulta',
                },
              ],
            },
          ],
        },
        {
          displayName: 'Pago Cuota',
          iconName: 'payment',
          idPermiso: Permisos.CRD_PAGO_CUOTA,
          route: '/menucreditos/pago-cuotas',
        },
        {
          displayName: 'Cruce de Valores',
          iconName: 'sync_alt',
          idPermiso: Permisos.CRD_CRUCE_DE_VALORES,
          route: '/menucreditos/cruce-de-valores',
        },
        {
          displayName: 'Devolución de Aportes',
          iconName: 'undo',
          idPermiso: Permisos.CRD_DEVOLUCION_DE_APORTES,
          route: '/menucreditos/devolucion-aportes',
        },
        {
          displayName: 'Cobros Personales',
          iconName: 'point_of_sale',
          idPermiso: Permisos.CRD_COBROS_PERSONALES,
          route: '/menucreditos/cobros-personales',
        },
        {
          displayName: 'Bandeja de Contabilidad',
          iconName: 'fact_check',
          idPermiso: Permisos.CRD_BANDEJA_DE_CONTABILIDAD,
          route: '/menucreditos/bandeja-contabilidad',
        },
        {
          displayName: 'Auditoría de Bandas',
          iconName: 'account_balance',
          idPermiso: Permisos.CRD_AUDITORIA_DE_BANDAS,
          route: '/menucreditos/auditoria-bandas',
        },
        {
          displayName: 'Proceso de Crédito',
          iconName: 'rule',
          idPermiso: Permisos.CRD_PROCESO_DE_CREDITO,
          route: '/menucreditos/proceso-credito',
        },
        {
          displayName: 'Consulta de Cobros',
          iconName: 'history',
          idPermiso: Permisos.CRD_CONSULTA_DE_COBROS,
          route: '/menucreditos/consulta-cobros',
        },
        {
          displayName: 'Seguimiento de Cobros',
          iconName: 'timeline',
          idPermiso: Permisos.CRD_SEGUIMIENTO_DE_COBROS,
          route: '/menucreditos/seguimiento-cobros',
        },
        {
          displayName: 'Condonación de Valores',
          iconName: 'handshake',
          idPermiso: Permisos.CRD_CONDONACION_DE_VALORES,
          route: '/menucreditos/acuerdo-condonacion',
        },
        // "Dash" comentado el 2026-09-10: sin `route` activa (estaba comentada) y por lo tanto sin
        // opción de menú real — ver docs/seguridad/INVENTARIO-PANTALLAS-SAA.md, ÍTEM 2(a). El
        // destino `/menucreditos/participe-dash` (ParticipeDashComponent) sigue vivo y alcanzable
        // desde entidad-consulta, participe-inicial y pago-jubilados, y sigue teniendo nodo propio
        // en el árbol de permisos (Permisos.CRD_DASH_DEL_PARTICIPE) — comentar esta entrada de
        // menú no lo deja huérfano. No borrar: recuperable el día que se decida mostrarlo acá.
        // {
        //   displayName: 'Dash',
        //   iconName: 'finance',
        //   route: '/menucreditos/participe-dash',
        // },
      ],
    },
    {
      displayName: 'Simuladores',
      iconName: 'calculate',
      idPermiso: Permisos.CRD_SIMULADORES,
      route: '/menucreditos/parametrizacion',
      children: [
        {
          displayName: 'Crédito Nuevo',
          iconName: 'calculate',
          idPermiso: Permisos.CRD_CREDITO_NUEVO,
          route: '/menucreditos/simulador-credito',
        },
        {
          displayName: 'Préstamo Existente',
          iconName: 'rule_settings',
          idPermiso: Permisos.CRD_PRESTAMO_EXISTENTE,
          route: '/menucreditos/simulador-prestamo',
        },
      ],
    },
  ];

  constructor() {
    // TODO TEMPORAL: mostrar "Bandas de Cartera" solo al USUARIO 1 mientras se
    // implementa el esquema de permisos definitivo (shared/guard/usuario-uno.guard.ts).
    if (esUsuarioUno()) {
      const paramNode = this.navItems.find((n) => n.displayName === 'Parametrización');
      paramNode?.children?.push({
        displayName: 'Bandas de Cartera',
        iconName: 'account_tree',
        idPermiso: Permisos.CRD_BANDAS_DE_CARTERA,
        route: '/menucreditos/bandas-cartera',
      });
      paramNode?.children?.push({
        displayName: 'Escala de Calificación de Riesgo',
        iconName: 'rule',
        idPermiso: Permisos.CRD_ESCALA_DE_CALIFICACION_DE_RIESGO,
        route: '/menucreditos/escala-calificacion-riesgo',
      });
      paramNode?.children?.push({
        displayName: 'Cierre de Cartera',
        iconName: 'event_available',
        idPermiso: Permisos.CRD_CIERRE_DE_CARTERA,
        route: '/menucreditos/cierre-cartera',
      });
      paramNode?.children?.push({
        displayName: 'Contabilidad de CRD',
        iconName: 'account_balance',
        idPermiso: Permisos.CRD_CONTABILIDAD_DE_CREDITOS,
        route: '/menucreditos/interruptor-contabilidad',
      });
      paramNode?.children?.push({
        displayName: 'Cuentas por Tipo de Aporte',
        iconName: 'account_balance_wallet',
        idPermiso: Permisos.CRD_CUENTAS_POR_TIPO_DE_APORTE,
        route: '/menucreditos/cuentas-tipo-aporte',
      });
    }
  }
}
