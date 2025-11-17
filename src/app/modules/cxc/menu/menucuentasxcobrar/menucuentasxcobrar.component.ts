import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-menucuentasxcobrar',
  standalone: true,
  templateUrl: './menucuentasxcobrar.component.html',
  styleUrls: ['./menucuentasxcobrar.component.scss'],
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
export class MenucuentasxcobrarComponent {
  isCollapsed = false;
}
