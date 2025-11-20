import { Location } from '@angular/common';
import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
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
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() screenTitle: string = '';
  usuarioNombre: string = '';
  loading$;
  private storageListener?: (e: StorageEvent) => void;

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
    private loadingService: LoadingService,
    private cdr: ChangeDetectorRef
  ) {
    this.loading$ = this.loadingService.loading$;
  }

  ngOnInit(): void {
    // Ejecutar en el próximo tick para evitar ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.cargarNombreUsuario();
      this.cdr.markForCheck();
    });

    // Escuchar cambios en localStorage de otras tabs
    this.storageListener = (e: StorageEvent) => {
      if (e.key === 'usuarioLog') {
        // Ejecutar en el próximo ciclo de detección de cambios
        setTimeout(() => {
          this.cargarNombreUsuario();
          this.cdr.markForCheck();

          // Si se eliminó el usuario (logout en otra tab), redirigir al login
          if (!e.newValue) {
            this.router.navigate(['/login']);
          }
        });
      }
    };

    window.addEventListener('storage', this.storageListener);
  }

  ngOnDestroy(): void {
    // Limpiar el listener al destruir el componente
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
  }

  private cargarNombreUsuario(): void {
    try {
      const usuario = this.usuarioService.getUsuarioLog();
      this.usuarioNombre = usuario?.nombre || '';
    } catch {
      this.usuarioNombre = '';
    }
  }

  onSalir() {
    // Limpiar sesión antes de redirigir al login
    this.usuarioService.clearSession();
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
