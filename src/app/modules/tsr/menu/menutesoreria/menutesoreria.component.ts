import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-menutesoreria',
  standalone: true,
  templateUrl: './menutesoreria.component.html',
  styleUrls: ['./menutesoreria.component.scss'],
  encapsulation: ViewEncapsulation.None, // 👈 Permite sobrescribir estilos de Material
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule
  ]
})
export class MenutesoreriaComponent {
  isCollapsed = false;
}
