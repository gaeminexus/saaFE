import { Component, Input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MenuListComponent } from '../menu-list/menu-list.component';
import { NavItem } from '../../model/nav-item';

@Component({
  selector: 'app-side-menu-custom',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MenuListComponent
  ],
  templateUrl: './side-menu-custom.component.html',
  styleUrl: './side-menu-custom.component.scss'
})
export class SideMenuCustomComponent {
  @Input() title: string = 'Menú';
  @Input() navItems: NavItem[] = [];

  private router = inject(Router);
  isCollapsed = signal<boolean>(false);

  toggle(): void {
    this.isCollapsed.update(value => !value);
    // Opcional: guardar estado en localStorage
    localStorage.setItem('sidenavCollapsed', JSON.stringify(this.isCollapsed()));
  }

  isCollapsedFn(): boolean {
    return this.isCollapsed();
  }

  regresarAlMenu(): void {
    this.router.navigate(['/menu']);
  }
}

