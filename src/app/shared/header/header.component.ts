import { NaturalezaCuentaService } from './../../modules/cnt/service/naturaleza-cuenta.service';
import { CommonModule, DatePipe } from '@angular/common';
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
import { DatosBusqueda } from '../model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../model/datos-busqueda/tipo-datos-busqueda';
import { AprobacionXMontoService } from '../../modules/cxp/service/aprobacion-x-monto.service';
import { AprobacionXProposicionPagoService } from '../../modules/cxp/service/aprobacion-x-proposicion-pago.service';
import { ComposicionCuotaInicialPagoService } from '../../modules/cxp/service/composicion-cuota-inicial-pago.service';
import { CuotaXFinanciacionPagoService } from '../../modules/cxp/service/cuota-x-financiacion-pago.service';
import { DetalleDocumentoPagoService } from '../../modules/cxp/service/detalle-documento-pago.service';
import { FinanciacionXDocumentoPagoService } from '../../modules/cxp/service/financiacion-x-documento-pago.service';
import { MontoAprobacionService } from '../../modules/cxp/service/monto-aprobacion.service';
import { ValorImpuestoDocumentoCobroService } from '../../modules/cxc/service/valor-impuesto-documento-cobro.service';

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

  // Variables para selectByCriteria
  criterioConsultaArray: Array<DatosBusqueda> = [];
  criterioConsulta = new DatosBusqueda();

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
    private valorImpuestoDocumentoCobro: ValorImpuestoDocumentoCobroService,
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

  testServicios() {
      const pipe = new DatePipe('en-US');
      this.criterioConsultaArray = [];

      this.criterioConsulta = new DatosBusqueda();
      this.criterioConsulta.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.LONG,
        'codigo',
        '8',
        TipoComandosBusqueda.IGUAL
      );
      this.criterioConsultaArray.push(this.criterioConsulta);

      this.criterioConsulta = new DatosBusqueda();
      this.criterioConsulta.orderBy('codigo');
      this.criterioConsultaArray.push(this.criterioConsulta);

      this.valorImpuestoDocumentoCobro.selectByCriteria(this.criterioConsultaArray).subscribe({
        next: (data: any) => {
          console.log('Datos de ValorImpuestoDocumentoCobro:', data);
        },
        error: (error: any) => {
          console.error('Error al obtener ValorImpuestoDocumentoCobro:', error);
        },
      });

      /*this.naturalezaCuentaService.getById('2588').subscribe({
        next: (data) => {
          console.log('GetById - Registro específico:', data);
        },
        error: (error) => {
          console.error('Error al obtener NaturalezaCuenta:', error);
        }
      });*/

      this.valorImpuestoDocumentoCobro.getById('').subscribe({
        next: (data: any) => {
          console.log('GetById - Registro específico:', data);
        },
        error: (error: any) => {
          console.error('Error al obtener ValorImpuestoDocumentoCobro:', error);
        },
      });

      /*this.naturalezaCuentaService.selectByCriteria(this.criterioConsultaArray).subscribe({
        next: (data) => {
          console.log('Datos de NaturalezaCuenta:', data);
        },
        error: (error) => {
          console.error('Error al obtener NaturalezaCuenta:', error);
        }
      });*/

      /*this.criterioConsultaArray = [];

      this.criterioConsulta = new DatosBusqueda();
      this.criterioConsulta.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'prestamo', 'codigo',
                                                     '2739', TipoComandosBusqueda.IGUAL);
      this.criterioConsultaArray.push(this.criterioConsulta);

      this.criterioConsulta = new DatosBusqueda();
      this.criterioConsulta.orderBy('codigo');
      this.criterioConsultaArray.push(this.criterioConsulta);

      this.fileService.selectByCriteria(this.criterioConsultaArray).subscribe({
        next: (data) => {
          console.log('Datos de Prestamo:', data);
        },
        error: (error) => {
          console.error('Error al obtener Prestamo:', error);
        }
      });*/
    }
}
