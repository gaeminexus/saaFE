import { Component } from '@angular/core';
import { SideMenuCustomComponent } from '../../../../shared/basics/menu/forms/side-menu-custom/side-menu-custom.component';
import { NavItem } from '../../../../shared/basics/menu/model/nav-item';

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
      children: [
        {
          displayName: 'Super de Bancos',
          iconName: 'insights',
          route: '/reportes/creditos/super-bancos',
        },
      ],
    },
    // {
    //   displayName: 'Recursos Humanos',
    //   iconName: 'groups',
    //   route: '/reportes',
    // },
    {
      displayName: 'Regresar',
      iconName: 'arrow_back',
      route: '/menu',
    },
  ];
}
