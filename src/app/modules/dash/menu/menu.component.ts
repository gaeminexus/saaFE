import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition, MatSnackBar } from '@angular/material/snack-bar';
import { UsuarioService } from '../../../shared/services/usuario.service';
import { PermisosService } from '../../../shared/services/permisos.service';
import { Permisos } from '../../../shared/model/permisos';

/** Ruta del botón del menú de entrada -> permiso del módulo raíz que lo protege. */
const PERMISO_POR_RUTA: Record<string, number> = {
  menucontabilidad: Permisos.CNT,
  menutesoreria: Permisos.TSR,
  menucuentaxpagar: Permisos.CXP,
  menucuentasxcobrar: Permisos.CXC,
  menucreditos: Permisos.CRD,
  reportes: Permisos.RPR,
  menurecursoshumanos: Permisos.RRH,
};

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  usuarioNombre: string = '';

  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  constructor(
    private router: Router,
    private usuarioService: UsuarioService,
    private permisosService: PermisosService,
    private snackBar: MatSnackBar,
  ) {
    try {
      const usuario = this.usuarioService.getUsuarioLog();
      this.usuarioNombre = usuario?.nombre || '';
    } catch {
      this.usuarioNombre = '';
    }
  }

  ngOnInit() {
    // Componente inicializado
  }

  onSalir() {
    this.router.navigate(['/login']);
  }

  navigate(ruta: string) {
    this.permisosService.ejecutarSiPermitido(
      PERMISO_POR_RUTA[ruta],
      () => this.router.navigate([`/${ruta}`]),
      (mensaje) => this.openSnackBar(mensaje.toUpperCase()),
    );
  }

  openSnackBar(mensaje: string): void {
    this.snackBar.open(mensaje, 'Aceptar', {
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }
}
