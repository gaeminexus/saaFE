import { Component } from '@angular/core';
import { SideMenuCustomComponent } from '../../../../shared/basics/menu/forms/side-menu-custom/side-menu-custom.component';
import { NavItem } from '../../../../shared/basics/menu/model/nav-item';
import { Permisos } from '../../../../shared/model/permisos';

@Component({
  selector: 'app-menureportes',
  standalone: true,
  imports: [SideMenuCustomComponent],
  templateUrl: './menureportes.component.html',
  styles: [''],
})
export class MenureportesComponent {
  navItems: NavItem[] = [
    // {
    //   displayName: 'Contabilidad',
    //   iconName: 'calculate',
    //   route: '/reportes',
    // },
    // {
    //   displayName: 'Tesorería',
    //   iconName: 'account_balance_wallet',
    //   route: '/reportes',
    // },
    // {
    //   displayName: 'CxP',
    //   iconName: 'receipt_long',
    //   route: '/reportes',
    // },
    // {
    //   displayName: 'CxC',
    //   iconName: 'attach_money',
    //   route: '/reportes',
    // },
    {
      displayName: 'Créditos',
      iconName: 'credit_score',
      idPermiso: Permisos.RPR_CREDITOS,
      children: [
        {
          displayName: 'Super de Bancos',
          iconName: 'insights',
          idPermiso: Permisos.RPR_SUPER_DE_BANCOS,
          route: '/reportes/creditos/super-bancos',
        },
        {
          displayName: 'Informes Mensuales',
          iconName: 'bar_chart',
          idPermiso: Permisos.RPR_INFORMES_MENSUALES,
          route: '/reportes/creditos/informes-mensuales',
        },
      ],
    },
    {
      // Navega cross-módulo a la pantalla de RRHH — no hay nodo propio de RPR en el árbol de
      // permisos para este atajo (docs/seguridad/ITEM5-MAPEO-MENUS-PERMISOS.md): es la misma
      // pantalla que ya está en el menú de Recursos Humanos, así que usa su mismo código.
      displayName: 'Recursos Humanos',
      iconName: 'groups',
      idPermiso: Permisos.RRH_REPORTES_DE_NOMINA,
      route: '/menurecursoshumanos/procesos/reportes-nomina',
    },
    {
      displayName: 'Regresar',
      iconName: 'arrow_back',
      route: '/menu',
    },
  ];
}
