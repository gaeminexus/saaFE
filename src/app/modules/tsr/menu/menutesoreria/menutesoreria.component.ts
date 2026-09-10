import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { SideMenuCustomComponent } from '../../../../shared/basics/menu/forms/side-menu-custom/side-menu-custom.component';
import { NavItem } from '../../../../shared/basics/menu/model/nav-item';
import { Permisos } from '../../../../shared/model/permisos';
import { AppStateService } from '../../../../shared/services/app-state.service';
import { PermisosService } from '../../../../shared/services/permisos.service';
import { SaldoCajaChica } from '../../model/saldo-caja-chica';
import { CajaChicaService } from '../../service/caja-chica.service';
import { PartidaTransitoAntigua } from '../../model/conciliacion-cierre';
import { ConciliacionCierreService } from '../../service/conciliacion-cierre.service';

@Component({
  selector: 'app-menutesoreria',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, SideMenuCustomComponent],
  templateUrl: './menutesoreria.component.html',
  styleUrls: ['./menutesoreria.component.scss'],
})
export class MenutesoreriaComponent implements OnInit {
  titulo = 'Tesorería';

  /** Cajas chicas cuyo saldo cayó por debajo de su umbral de alerta (T6). */
  cajasEnAlerta = signal<SaldoCajaChica[]>([]);

  /** Partidas en tránsito con más de 60 días sin saldarse (§8 del diseño de conciliación). */
  transitoAntiguo = signal<PartidaTransitoAntigua[]>([]);

  /** true cuando no se pudo determinar la empresa de la sesión — antes esto dejaba los banners vacíos sin decir por qué. */
  sinEmpresa = signal(false);

  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  constructor(
    private cajaChicaS: CajaChicaService,
    private conciliacionCierreS: ConciliacionCierreService,
    private appState: AppStateService,
    private router: Router,
    private snackBar: MatSnackBar,
    private permisosService: PermisosService,
  ) {}

  ngOnInit(): void {
    const idEmpresa = this.appState.getEmpresa()?.codigo;
    if (!idEmpresa) {
      this.sinEmpresa.set(true);
      return;
    }

    // El banner es un aviso secundario del shell: si falla, no debe romper
    // la navegación de todo el módulo de tesorería.
    this.cajaChicaS.saldos(idEmpresa).subscribe({
      next: (data) => this.cajasEnAlerta.set((data ?? []).filter((c) => c.alerta)),
      error: () => this.cajasEnAlerta.set([]),
    });

    // Igual criterio: si el endpoint todavía no existe en el backend (ver
    // ConciliacionCierreService), este banner simplemente no aparece — no
    // rompe el resto del menú.
    this.conciliacionCierreS.transitoAntiguas(idEmpresa, 60).subscribe({
      next: (data) => this.transitoAntiguo.set(Array.isArray(data) ? data : []),
      error: () => this.transitoAntiguo.set([]),
    });
  }

  navItems: NavItem[] = [
    {
      displayName: 'Parametrización',
      iconName: 'tune',
      idPermiso: Permisos.TSR_PARAMETRIZACION,
      children: [
        {
          displayName: 'Bancos',
          iconName: 'account_balance',
          idPermiso: Permisos.TSR_BANCOS,
          children: [
            {
              displayName: 'Nacionales y Extranjeros',
              iconName: 'public',
              idPermiso: Permisos.TSR_NACIONALES_Y_EXTRANJEROS,
              route: '/menutesoreria/parametrizacion/bancos/nacionales-extranjeros',
            },
            {
              displayName: 'Mis Bancos',
              iconName: 'account_balance_wallet',
              idPermiso: Permisos.TSR_MIS_BANCOS,
              children: [
                {
                  displayName: 'Bancos',
                  iconName: 'account_balance',
                  idPermiso: Permisos.TSR_MIS_BANCOS_BANCOS,
                  route: '/menutesoreria/parametrizacion/bancos/mis-bancos/bancos',
                },
                {
                  displayName: 'Cuentas Bancarias',
                  iconName: 'credit_card',
                  idPermiso: Permisos.TSR_CUENTAS_BANCARIAS,
                  route: '/menutesoreria/parametrizacion/bancos/mis-bancos/cuentas-bancarias',
                },
                {
                  displayName: 'Chequeras',
                  iconName: 'receipt_long',
                  idPermiso: Permisos.TSR_CHEQUERAS,
                  children: [
                    {
                      displayName: 'Solicitud Chequera',
                      iconName: 'playlist_add',
                      idPermiso: Permisos.TSR_SOLICITUD_CHEQUERA,
                      route: '/menutesoreria/parametrizacion/bancos/mis-bancos/chequeras/solicitud',
                    },
                    {
                      displayName: 'Recepción Chequera',
                      iconName: 'assignment_turned_in',
                      idPermiso: Permisos.TSR_RECEPCION_CHEQUERA,
                      route: '/menutesoreria/parametrizacion/bancos/mis-bancos/chequeras/recepcion',
                    },
                    {
                      displayName: 'Cheques',
                      iconName: 'payments',
                      idPermiso: Permisos.TSR_CHEQUES,
                      route: '/menutesoreria/parametrizacion/bancos/mis-bancos/chequeras/cheques',
                    },
                  ],
                },
              ],
            },
          ],
        },
        // "Cajas" (Lógicas → Grupos / Cajas por Grupo, y Físicas) se dio de baja definitiva el
        // 2026-09-03 por decisión del usuario — pantallas, componentes y rutas borrados, no solo
        // esta entrada de menú. El estado anterior (entrada de menú retirada pero pantallas
        // vivas) quedó en el commit cc794d8; las pantallas completas están en su historial, antes
        // de ese commit.
        {
          displayName: 'Titulares',
          iconName: 'account_box',
          idPermiso: Permisos.TSR_TITULARES,
          route: '/menutesoreria/parametrizacion/titulares',
        },
        {
          displayName: 'Cajas Chicas',
          iconName: 'savings',
          idPermiso: Permisos.TSR_CAJAS_CHICAS,
          route: '/menutesoreria/parametrizacion/caja-chica',
        },
      ],
    },
    {
      displayName: 'Procesos',
      iconName: 'sync_alt',
      idPermiso: Permisos.TSR_PROCESOS,
      children: [
        {
          displayName: 'Estado de Cuenta',
          iconName: 'account_balance_wallet',
          idPermiso: Permisos.TSR_ESTADO_DE_CUENTA,
          route: '/menutesoreria/procesos/estado-cuenta-titular',
        },
        {
          displayName: 'Anticipos',
          iconName: 'payments',
          idPermiso: Permisos.TSR_ANTICIPOS,
          children: [
            {
              displayName: 'Clientes',
              iconName: 'person',
              idPermiso: Permisos.TSR_CLIENTES,
              route: '/menutesoreria/procesos/anticipos/clientes',
            },
            {
              displayName: 'Proveedores',
              iconName: 'business',
              idPermiso: Permisos.TSR_PROVEEDORES,
              route: '/menutesoreria/procesos/anticipos/proveedores',
            },
            {
              displayName: 'Seguimiento',
              iconName: 'fact_check',
              idPermiso: Permisos.TSR_SEGUIMIENTO,
              route: '/menutesoreria/procesos/anticipos/seguimiento',
            },
          ],
        },
        {
          displayName: 'Registrar',
          iconName: 'edit_note',
          idPermiso: Permisos.TSR_REGISTRAR,
          children: [
            {
              displayName: 'Ingresos',
              iconName: 'arrow_downward',
              idPermiso: Permisos.TSR_INGRESOS,
              route: '/menutesoreria/procesos/registrar/ingresos',
            },
            {
              displayName: 'Egresos',
              iconName: 'arrow_upward',
              idPermiso: Permisos.TSR_EGRESOS,
              route: '/menutesoreria/procesos/registrar/egresos',
            },
          ],
        },
        // "Cobros" (Cierre de Caja, Depósitos, Consultas, Procesos — 10 pantallas) se retiró del
        // menú el 2026-09-07 por decisión del usuario (docs/logica-negocio/tsr/PLAN-MENU-TESORERIA-Y-CHEQUES.md
        // M1): las rutas y los componentes NO se tocan, siguen alcanzables por URL. Si hace falta
        // devolverlo al menú, es descomentar este bloque. Nota 2026-09-10: este bloque no tiene
        // código de permiso asignado en el árbol (docs/seguridad/CODIGOS-PERMISOS-SAA.md) — si se
        // reactiva, hay que pedirle uno al árbitro antes.
        // {
        //   displayName: 'Cobros',
        //   iconName: 'attach_money',
        //   idPermiso: 830,
        //   children: [
        //     {
        //       displayName: 'Cierre de Caja',
        //       iconName: 'lock',
        //       idPermiso: 830,
        //       route: '/menutesoreria/procesos/cobros/cierre-caja',
        //     },
        //     {
        //       displayName: 'Depósitos',
        //       iconName: 'account_balance_wallet',
        //       idPermiso: 830,
        //       children: [
        //         {
        //           displayName: 'Envío',
        //           iconName: 'outbox',
        //           idPermiso: 830,
        //           route: '/menutesoreria/procesos/cobros/depositos/envio',
        //         },
        //         {
        //           displayName: 'Ratificación',
        //           iconName: 'verified',
        //           idPermiso: 830,
        //           route: '/menutesoreria/procesos/cobros/depositos/ratificacion',
        //         },
        //       ],
        //     },
        //     {
        //       displayName: 'Consultas',
        //       iconName: 'search',
        //       idPermiso: 830,
        //       children: [
        //         {
        //           displayName: 'Cobros',
        //           iconName: 'analytics',
        //           idPermiso: 830,
        //           route: '/menutesoreria/procesos/cobros/consultas/cobros',
        //         },
        //         {
        //           displayName: 'Cierres',
        //           iconName: 'fact_check',
        //           idPermiso: 830,
        //           route: '/menutesoreria/procesos/cobros/consultas/cierres',
        //         },
        //       ],
        //     },
        //     {
        //       displayName: 'Procesos',
        //       iconName: 'settings',
        //       idPermiso: 830,
        //       children: [
        //         {
        //           displayName: 'Cobros',
        //           iconName: 'payments',
        //           idPermiso: 830,
        //           route: '/menutesoreria/procesos/cobros/procesos/cobros',
        //         },
        //         {
        //           displayName: 'Cierres',
        //           iconName: 'task_alt',
        //           idPermiso: 830,
        //           route: '/menutesoreria/procesos/cobros/procesos/cierres',
        //         },
        //         {
        //           displayName: 'Depósitos',
        //           iconName: 'account_balance_wallet',
        //           idPermiso: 830,
        //           route: '/menutesoreria/procesos/cobros/procesos/depositos',
        //         },
        //         {
        //           displayName: 'Ratificación Depósitos',
        //           iconName: 'rule',
        //           idPermiso: 830,
        //           route: '/menutesoreria/procesos/cobros/procesos/ratificacion-depositos',
        //         },
        //       ],
        //     },
        //   ],
        // },
        {
          displayName: 'Caja Chica',
          iconName: 'savings',
          idPermiso: Permisos.TSR_CAJA_CHICA,
          children: [
            {
              displayName: 'Gastos',
              iconName: 'point_of_sale',
              idPermiso: Permisos.TSR_GASTOS,
              route: '/menutesoreria/procesos/caja-chica/gastos',
            },
            {
              displayName: 'Reposición',
              iconName: 'sync',
              idPermiso: Permisos.TSR_REPOSICION,
              route: '/menutesoreria/procesos/caja-chica/reposicion',
            },
            {
              displayName: 'Cierre',
              iconName: 'fact_check',
              idPermiso: Permisos.TSR_CIERRE,
              route: '/menutesoreria/procesos/caja-chica/cierre',
            },
          ],
        },
        {
          // Nuevo, hermano del nodo "Pagos" de cheques (docs/pagos/PLAN-REORGANIZACION-CIRCUITO-PAGOS.md
          // §3.3). Se llama "Pagos por transferencia", NO "Pagos": ese nombre ya lo tiene el nodo
          // de cheques (TSR.PAGO) que sigue quieto, sin tocar.
          displayName: 'Pagos por transferencia',
          iconName: 'account_balance',
          idPermiso: Permisos.TSR_PAGOS_POR_TRANSFERENCIA,
          children: [
            {
              displayName: 'Aprobación de pagos',
              iconName: 'checklist',
              idPermiso: Permisos.TSR_APROBACION_DE_PAGOS,
              route: '/menutesoreria/pagos/aprobacion',
            },
            {
              displayName: 'Generación de archivo',
              iconName: 'description',
              idPermiso: Permisos.TSR_GENERACION_DE_ARCHIVO,
              route: '/menutesoreria/pagos/archivo-banco',
            },
            {
              displayName: 'Recepción y confirmación',
              iconName: 'task_alt',
              idPermiso: Permisos.TSR_RECEPCION_Y_CONFIRMACION,
              route: '/menutesoreria/pagos/confirmacion',
            },
            {
              displayName: 'Consulta y gestión',
              iconName: 'list_alt',
              idPermiso: Permisos.TSR_CONSULTA_Y_GESTION,
              route: '/menutesoreria/pagos/consulta',
            },
          ],
        },
        {
          // Reemplaza al nodo "Pagos" el 2026-09-07 (docs/logica-negocio/tsr/PLAN-MENU-TESORERIA-Y-CHEQUES.md
          // M2/M3). Se llama "Cheques", no "Pagos": ese nombre lo confundía con "Pagos por
          // transferencia" (el circuito nuevo, arriba), que es otra cosa. Plano, sin los
          // subniveles "Consulta"/"Procesos" de antes, y en el orden del ciclo real. Las rutas
          // no cambiaron, solo el menú.
          displayName: 'Cheques',
          iconName: 'receipt_long',
          idPermiso: Permisos.TSR_PROCESOS_CHEQUES,
          children: [
            {
              displayName: 'Cheques generados',
              iconName: 'done_all',
              idPermiso: Permisos.TSR_CHEQUES_GENERADOS,
              route: '/menutesoreria/procesos/pagos/procesos/cheques-generados',
            },
            {
              displayName: 'Cheques impresos',
              iconName: 'print',
              idPermiso: Permisos.TSR_CHEQUES_IMPRESOS,
              route: '/menutesoreria/procesos/pagos/procesos/cheques-impresos',
            },
            {
              displayName: 'Cheques entregados',
              iconName: 'task_alt',
              idPermiso: Permisos.TSR_CHEQUES_ENTREGADOS,
              route: '/menutesoreria/procesos/pagos/procesos/cheques-entregados',
            },
            {
              displayName: 'Consulta de cheques',
              iconName: 'manage_search',
              idPermiso: Permisos.TSR_CONSULTA_DE_CHEQUES,
              route: '/menutesoreria/procesos/pagos/consulta/cheques',
            },
          ],
        },
        {
          displayName: 'Extractos Bancarios',
          iconName: 'receipt_long',
          idPermiso: Permisos.TSR_EXTRACTOS_BANCARIOS,
          children: [
            {
              displayName: 'Cargar Extracto',
              iconName: 'upload_file',
              idPermiso: Permisos.TSR_CARGAR_EXTRACTO,
              route: '/menutesoreria/procesos/extractos-bancarios/cargar',
            },
            {
              displayName: 'Consulta de Extractos',
              iconName: 'search',
              idPermiso: Permisos.TSR_CONSULTA_DE_EXTRACTOS,
              route: '/menutesoreria/procesos/extractos-bancarios/consulta',
            },
            {
              displayName: 'Conciliación Contable',
              iconName: 'fact_check',
              idPermiso: Permisos.TSR_CONCILIACION_CONTABLE,
              route: '/menutesoreria/procesos/conciliacion-contable',
            },
            {
              displayName: 'Conciliación — Cierre',
              iconName: 'lock',
              idPermiso: Permisos.TSR_CONCILIACION_CIERRE,
              route: '/menutesoreria/procesos/conciliacion/cierre',
            },
            {
              displayName: 'Tablero de Cumplimiento',
              iconName: 'dashboard',
              idPermiso: Permisos.TSR_TABLERO_DE_CUMPLIMIENTO,
              route: '/menutesoreria/procesos/extractos-bancarios/tablero',
            },
          ],
        },
      ],
    },
    { displayName: 'Regresar', iconName: 'arrow_back', route: '/menu' },
  ];

  /** Atajo del banner de alerta de cajas chicas (mismo permiso que el nodo del menú). */
  irAReposicion(): void {
    this.permisosService.ejecutarSiPermitido(
      Permisos.TSR_REPOSICION,
      () => this.router.navigate(['/menutesoreria/procesos/caja-chica/reposicion']),
      (mensaje) => this.openSnackBar(mensaje.toUpperCase()),
    );
  }

  /** Atajo del banner de partidas en tránsito (mismo permiso que el nodo del menú). */
  irAConciliacionCierre(): void {
    this.permisosService.ejecutarSiPermitido(
      Permisos.TSR_CONCILIACION_CIERRE,
      () => this.router.navigate(['/menutesoreria/procesos/conciliacion/cierre']),
      (mensaje) => this.openSnackBar(mensaje.toUpperCase()),
    );
  }

  openSnackBar(mensaje: string): void {
    this.snackBar.open(mensaje, 'Aceptar', {
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }
}
