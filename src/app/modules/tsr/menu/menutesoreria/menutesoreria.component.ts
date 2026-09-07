import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { SideMenuCustomComponent } from '../../../../shared/basics/menu/forms/side-menu-custom/side-menu-custom.component';
import { NavItem } from '../../../../shared/basics/menu/model/nav-item';
import { AppStateService } from '../../../../shared/services/app-state.service';
import { SaldoCajaChica } from '../../model/saldo-caja-chica';
import { CajaChicaService } from '../../service/caja-chica.service';
import { PartidaTransitoAntigua } from '../../model/conciliacion-cierre';
import { ConciliacionCierreService } from '../../service/conciliacion-cierre.service';

@Component({
  selector: 'app-menutesoreria',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, RouterLink, SideMenuCustomComponent],
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

  constructor(
    private cajaChicaS: CajaChicaService,
    private conciliacionCierreS: ConciliacionCierreService,
    private appState: AppStateService,
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
        // "Cajas" (Lógicas → Grupos / Cajas por Grupo, y Físicas) se dio de baja definitiva el
        // 2026-09-03 por decisión del usuario — pantallas, componentes y rutas borrados, no solo
        // esta entrada de menú. El estado anterior (entrada de menú retirada pero pantallas
        // vivas) quedó en el commit cc794d8; las pantallas completas están en su historial, antes
        // de ese commit.
        {
          displayName: 'Titulares',
          iconName: 'account_box',
          idPermiso: 830,
          route: '/menutesoreria/parametrizacion/titulares',
        },
        {
          displayName: 'Cajas Chicas',
          iconName: 'savings',
          idPermiso: 830,
          route: '/menutesoreria/parametrizacion/caja-chica',
        },
      ],
    },
    {
      displayName: 'Procesos',
      iconName: 'sync_alt',
      idPermiso: 811,
      children: [
        {
          displayName: 'Estado de Cuenta',
          iconName: 'account_balance_wallet',
          idPermiso: 830,
          route: '/menutesoreria/procesos/estado-cuenta-titular',
        },
        {
          displayName: 'Anticipos',
          iconName: 'payments',
          idPermiso: 830,
          children: [
            {
              displayName: 'Clientes',
              iconName: 'person',
              idPermiso: 830,
              route: '/menutesoreria/procesos/anticipos/clientes',
            },
            {
              displayName: 'Proveedores',
              iconName: 'business',
              idPermiso: 830,
              route: '/menutesoreria/procesos/anticipos/proveedores',
            },
            {
              displayName: 'Seguimiento',
              iconName: 'fact_check',
              idPermiso: 830,
              route: '/menutesoreria/procesos/anticipos/seguimiento',
            },
          ],
        },
        {
          displayName: 'Registrar',
          iconName: 'edit_note',
          idPermiso: 830,
          children: [
            {
              displayName: 'Ingresos',
              iconName: 'arrow_downward',
              idPermiso: 830,
              route: '/menutesoreria/procesos/registrar/ingresos',
            },
            {
              displayName: 'Egresos',
              iconName: 'arrow_upward',
              idPermiso: 830,
              route: '/menutesoreria/procesos/registrar/egresos',
            },
          ],
        },
        // "Cobros" (Cierre de Caja, Depósitos, Consultas, Procesos — 10 pantallas) se retiró del
        // menú el 2026-09-07 por decisión del usuario (docs/logica-negocio/tsr/PLAN-MENU-TESORERIA-Y-CHEQUES.md
        // M1): las rutas y los componentes NO se tocan, siguen alcanzables por URL. Si hace falta
        // devolverlo al menú, es descomentar este bloque.
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
          idPermiso: 830,
          children: [
            {
              displayName: 'Gastos',
              iconName: 'point_of_sale',
              idPermiso: 830,
              route: '/menutesoreria/procesos/caja-chica/gastos',
            },
            {
              displayName: 'Reposición',
              iconName: 'sync',
              idPermiso: 830,
              route: '/menutesoreria/procesos/caja-chica/reposicion',
            },
            {
              displayName: 'Cierre',
              iconName: 'fact_check',
              idPermiso: 830,
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
          idPermiso: 830,
          children: [
            {
              displayName: 'Aprobación de pagos',
              iconName: 'checklist',
              idPermiso: 830,
              route: '/menutesoreria/pagos/aprobacion',
            },
            {
              displayName: 'Generación de archivo',
              iconName: 'description',
              idPermiso: 830,
              route: '/menutesoreria/pagos/archivo-banco',
            },
            {
              displayName: 'Recepción y confirmación',
              iconName: 'task_alt',
              idPermiso: 830,
              route: '/menutesoreria/pagos/confirmacion',
            },
            {
              displayName: 'Consulta y gestión',
              iconName: 'list_alt',
              idPermiso: 830,
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
          idPermiso: 830,
          children: [
            {
              displayName: 'Solicitud de pago',
              iconName: 'playlist_add',
              idPermiso: 830,
              route: '/menutesoreria/procesos/pagos/procesos/solicitud-pagos',
            },
            {
              displayName: 'Cheques generados',
              iconName: 'done_all',
              idPermiso: 830,
              route: '/menutesoreria/procesos/pagos/procesos/cheques-generados',
            },
            {
              displayName: 'Cheques impresos',
              iconName: 'print',
              idPermiso: 830,
              route: '/menutesoreria/procesos/pagos/procesos/cheques-impresos',
            },
            {
              displayName: 'Cheques entregados',
              iconName: 'task_alt',
              idPermiso: 830,
              route: '/menutesoreria/procesos/pagos/procesos/cheques-entregados',
            },
            {
              displayName: 'Consulta de cheques',
              iconName: 'manage_search',
              idPermiso: 830,
              route: '/menutesoreria/procesos/pagos/consulta/cheques',
            },
          ],
        },
        {
          displayName: 'Extractos Bancarios',
          iconName: 'receipt_long',
          idPermiso: 830,
          children: [
            {
              displayName: 'Cargar Extracto',
              iconName: 'upload_file',
              idPermiso: 830,
              route: '/menutesoreria/procesos/extractos-bancarios/cargar',
            },
            {
              displayName: 'Consulta de Extractos',
              iconName: 'search',
              idPermiso: 830,
              route: '/menutesoreria/procesos/extractos-bancarios/consulta',
            },
            {
              displayName: 'Conciliación Contable',
              iconName: 'fact_check',
              idPermiso: 830,
              route: '/menutesoreria/procesos/conciliacion-contable',
            },
            {
              displayName: 'Conciliación — Cierre',
              iconName: 'lock',
              idPermiso: 830,
              route: '/menutesoreria/procesos/conciliacion/cierre',
            },
            {
              displayName: 'Tablero de Cumplimiento',
              iconName: 'dashboard',
              idPermiso: 830,
              route: '/menutesoreria/procesos/extractos-bancarios/tablero',
            },
          ],
        },
      ],
    },
    { displayName: 'Regresar', iconName: 'arrow_back', route: '/menu' },
  ];
}
