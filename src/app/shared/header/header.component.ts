import { Location } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { UsuarioService } from '../services/usuario.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, MatMenuModule, MatIconModule, MatButtonModule, MatTooltipModule, MatSnackBarModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  @Input() screenTitle: string = '';
  usuarioNombre: string = '';

  get showBackButton(): boolean {
    return this.router.url !== '/menu';
  }

  onBack() {
    this.router.navigate(['/menu']);
  }

  constructor(private router: Router, private usuarioService: UsuarioService, private snackBar: MatSnackBar) {
    try {
      const usuario = this.usuarioService.getUsuarioLog();
      this.usuarioNombre = usuario?.nombre || '';
    } catch {
      this.usuarioNombre = '';
    }
  }

  onSalir() {
    this.router.navigate(['/login']);
  }

  cambiarContrasena() {
    this.snackBar.open('Cambiar Contraseña — próximamente', 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  restablecerContrasena() {
    this.snackBar.open('Restablecer Contraseña — próximamente', 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }
}
