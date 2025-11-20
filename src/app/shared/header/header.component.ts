import { Location } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';

import { MaterialFormModule } from '../modules/material-form.module';
import { UsuarioService } from '../services/usuario.service';
import { LoadingService } from '../services/loading.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MaterialFormModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  @Input() screenTitle: string = '';
  usuarioNombre: string = '';
  loading$;

  get showBackButton(): boolean {
    return this.router.url !== '/menu';
  }

  onBack() {
    this.router.navigate(['/menu']);
  }

  constructor(
    private router: Router,
    private usuarioService: UsuarioService,
    private snackBar: MatSnackBar,
    private loadingService: LoadingService
  ) {
    this.loading$ = this.loadingService.loading$;
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
