import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { CambioClaveDialogComponent } from '../../modules/dash/forms/login/cambio-clave-dialog/cambio-clave-dialog.component';
import { MaterialFormModule } from '../modules/material-form.module';
import { AppStateService } from '../services/app-state.service';
import { LoadingService } from '../services/loading.service';
import { UsuarioService } from '../services/usuario.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MaterialFormModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    private appStateService: AppStateService,
    private snackBar: MatSnackBar,
    private loadingService: LoadingService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
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
    // Limpiar TODA la sesión (localStorage, caché de rubros, estado global)
    this.appStateService.limpiarDatos();
    this.usuarioService.clearSession();

    console.log('HeaderComponent: Logout completo - redirigiendo a login');
    this.router.navigate(['/login']);
  }

  cambiarContrasena() {
    const usuario = this.usuarioService.getUsuarioLog();

    // Intentar obtener el username desde localStorage (usado en el login)
    const username = localStorage.getItem('userName') || localStorage.getItem('usuario');

    if (!username) {
      this.snackBar.open(
        'No se pudo obtener el nombre de usuario. Por favor inicie sesión nuevamente.',
        'Cerrar',
        {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar'],
        }
      );
      return;
    }

    const dialogRef = this.dialog.open(CambioClaveDialogComponent, {
      width: '520px',
      disableClose: false,
      data: {
        idUsuario: username.toString().toUpperCase(),
        esDesdeLogin: false,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.success) {
        this.snackBar.open('Contraseña cambiada exitosamente. Cerrando sesión...', 'Cerrar', {
          duration: 2000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['success-snackbar'],
        });

        // Nota: El diálogo ahora maneja el cierre de sesión automáticamente
        // No es necesario duplicar la lógica aquí
      }
    });
  }

  restablecerContrasena() {
    this.snackBar.open('Restablecer Contraseña — próximamente', 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}
