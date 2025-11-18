import { Component, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';

@Component({
  selector: 'app-menutesoreria',
  standalone: true,
  templateUrl: './menutesoreria.component.html',
  styleUrls: ['./menutesoreria.component.scss'],
  encapsulation: ViewEncapsulation.None, // 👈 Permite sobrescribir estilos de Material
  imports: [
    RouterModule,
    MaterialFormModule
  ]
})
export class MenutesoreriaComponent {
  isCollapsed = false;
}
