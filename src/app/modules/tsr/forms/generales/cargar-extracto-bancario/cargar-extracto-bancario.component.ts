import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { UsuarioService } from '../../../../../shared/services/usuario.service';
import { CuentaBancaria } from '../../../model/cuenta-bancaria';
import { ResumenImportacionExtracto } from '../../../model/resumen-importacion-extracto';
import { CuentaBancariaService } from '../../../service/cuenta-bancaria.service';
import { ExtractoBancarioService } from '../../../service/extracto-bancario.service';

@Component({
  selector: 'app-cargar-extracto-bancario',
  standalone: true,
  imports: [MaterialFormModule],
  templateUrl: './cargar-extracto-bancario.component.html',
  styleUrl: './cargar-extracto-bancario.component.scss',
})
export class CargarExtractoBancarioComponent implements OnInit {
  cuentas: CuentaBancaria[] = [];
  cuentaSeleccionada: number | null = null;

  archivoSeleccionado: File | null = null;
  nombreArchivo: string = '';

  resumen: ResumenImportacionExtracto | null = null;
  cargaExitosa: boolean = false;
  idExtractoCreado: number | null = null;

  isLoadingCuentas: boolean = false;
  isValidando: boolean = false;
  isConfirmando: boolean = false;

  constructor(
    private cuentaBancariaService: CuentaBancariaService,
    private extractoBancarioService: ExtractoBancarioService,
    private appStateService: AppStateService,
    private usuarioService: UsuarioService,
    private snackBar: MatSnackBar,
    private router: Router,
    private funcionesDatosService: FuncionesDatosService
  ) {}

  ngOnInit(): void {
    this.cargarCuentas();
  }

  cargarCuentas(): void {
    this.isLoadingCuentas = true;
    this.cuentaBancariaService.getAll().subscribe({
      next: (cuentas) => {
        this.cuentas = Array.isArray(cuentas) ? cuentas : [];
        this.isLoadingCuentas = false;
      },
      error: () => {
        this.snackBar.open('Error al cargar cuentas bancarias', 'Cerrar', { duration: 4000 });
        this.cuentas = [];
        this.isLoadingCuentas = false;
      },
    });
  }

  onCuentaChange(): void {
    this.limpiarResultados();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    const nombreLower = file.name.toLowerCase();
    if (!nombreLower.endsWith('.xls') && !nombreLower.endsWith('.xlsx')) {
      this.snackBar.open('Solo se permiten archivos .xls o .xlsx', 'Cerrar', {
        duration: 4000,
        panelClass: ['error-snackbar'],
      });
      input.value = '';
      return;
    }
    this.archivoSeleccionado = file;
    this.nombreArchivo = file.name;
    this.limpiarResultados();
  }

  validarArchivo(): void {
    if (!this.cuentaSeleccionada) {
      this.snackBar.open('Seleccione una cuenta bancaria', 'Cerrar', { duration: 3000 });
      return;
    }
    if (!this.archivoSeleccionado) {
      this.snackBar.open('Seleccione un archivo', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isValidando = true;
    this.resumen = null;
    this.extractoBancarioService
      .validarImportacion(this.archivoSeleccionado, this.cuentaSeleccionada)
      .subscribe({
        next: (resumen) => {
          this.isValidando = false;
          this.resumen = resumen;
          if (resumen?.archivoYaCargado) {
            this.snackBar.open(
              `Este archivo ya fue cargado antes (extracto #${resumen.idExtractoExistente})`,
              'Cerrar',
              { duration: 6000 }
            );
          }
        },
        error: (error) => {
          this.isValidando = false;
          this.snackBar.open(`Error al validar archivo: ${error?.error || error?.message || error}`, 'Cerrar', {
            duration: 6000,
          });
        },
      });
  }

  confirmarCarga(): void {
    if (!this.cuentaSeleccionada || !this.archivoSeleccionado || !this.resumen) {
      return;
    }

    const empresa = this.appStateService.getEmpresa();
    if (!empresa?.codigo) {
      this.snackBar.open('No se pudo determinar la empresa actual', 'Cerrar', { duration: 4000 });
      return;
    }
    const usuario = this.usuarioService.getUsuarioLog();

    this.isConfirmando = true;
    this.extractoBancarioService
      .confirmarImportacion(this.archivoSeleccionado, this.cuentaSeleccionada, empresa.codigo, usuario?.nombre || '')
      .subscribe({
        next: (extracto) => {
          this.isConfirmando = false;
          this.cargaExitosa = true;
          this.idExtractoCreado = extracto?.codigo ?? null;
          this.snackBar.open('Extracto cargado exitosamente', 'Cerrar', { duration: 5000 });
        },
        error: (error) => {
          this.isConfirmando = false;
          this.snackBar.open(`Error al confirmar carga: ${error?.error || error?.message || error}`, 'Cerrar', {
            duration: 6000,
          });
        },
      });
  }

  verDetalle(): void {
    if (this.idExtractoCreado) {
      this.router.navigate(['/menutesoreria/procesos/extractos-bancarios/detalle'], {
        queryParams: { idExtracto: this.idExtractoCreado },
      });
    }
  }

  nuevaCarga(): void {
    this.archivoSeleccionado = null;
    this.nombreArchivo = '';
    this.limpiarResultados();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  formatearSoloFecha(fecha: any): string {
    return this.funcionesDatosService.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA);
  }

  private limpiarResultados(): void {
    this.resumen = null;
    this.cargaExitosa = false;
    this.idExtractoCreado = null;
  }
}
