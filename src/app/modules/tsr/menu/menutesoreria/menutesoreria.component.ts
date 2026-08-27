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
          displayName: 'Pagos',
          iconName: 'payments',
          idPermiso: 830,
          children: [
            {
              displayName: 'Consulta',
              iconName: 'manage_search',
              idPermiso: 830,
              children: [
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
