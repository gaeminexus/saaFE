import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { UsuarioService } from '../../../../../shared/services/usuario.service';
import { Periodo } from '../../../../cnt/model/periodo';
import { PeriodoService } from '../../../../cnt/service/periodo.service';
import { CuentaBancaria } from '../../../model/cuenta-bancaria';
import { ResumenImportacionExtracto } from '../../../model/resumen-importacion-extracto';
import { ConciliacionContableService } from '../../../service/conciliacion-contable.service';
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

  periodos: Periodo[] = [];
  periodoSeleccionado: number | null = null;
  periodosCerrados = new Set<number>();

  archivoSeleccionado: File | null = null;
  nombreArchivo: string = '';

  resumen: ResumenImportacionExtracto | null = null;
  cargaExitosa: boolean = false;
  idExtractoCreado: number | null = null;

  isLoadingCuentas: boolean = false;
  isLoadingPeriodos: boolean = false;
  isValidando: boolean = false;
  isConfirmando: boolean = false;

  constructor(
    private cuentaBancariaService: CuentaBancariaService,
    private extractoBancarioService: ExtractoBancarioService,
    private periodoService: PeriodoService,
    private conciliacionContableService: ConciliacionContableService,
    private appStateService: AppStateService,
    private usuarioService: UsuarioService,
    private snackBar: MatSnackBar,
    private router: Router,
    private funcionesDatosService: FuncionesDatosService
  ) {}

  ngOnInit(): void {
    this.cargarCuentas();
    this.cargarPeriodosCerrados();
  }

  /**
   * Carga primero los períodos cerrados (cierre exclusivo de TSR, ver
   * ControlExtractoBancario) para que seleccionarPeriodoPorDefecto pueda
   * saltarse los cerrados desde el primer render, en vez de tener que
   * recalcular la selección despues de una segunda llamada.
   */
  private cargarPeriodosCerrados(): void {
    const empresa = this.appStateService.getEmpresa();
    if (!empresa?.codigo) {
      this.cargarPeriodos();
      return;
    }
    this.conciliacionContableService.periodosCerrados(empresa.codigo).subscribe({
      next: (cerrados) => {
        this.periodosCerrados = new Set(Array.isArray(cerrados) ? cerrados : []);
        this.cargarPeriodos();
      },
      error: () => {
        this.periodosCerrados = new Set();
        this.cargarPeriodos();
      },
    });
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

  cargarPeriodos(): void {
    this.isLoadingPeriodos = true;
    this.periodoService.getAll().subscribe({
      next: (periodos) => {
        this.periodos = (Array.isArray(periodos) ? periodos : []).sort(
          (a, b) => b.anio - a.anio || b.mes - a.mes
        );
        this.seleccionarPeriodoPorDefecto();
        this.isLoadingPeriodos = false;
      },
      error: () => {
        this.snackBar.open('Error al cargar períodos contables', 'Cerrar', { duration: 4000 });
        this.periodos = [];
        this.isLoadingPeriodos = false;
      },
    });
  }

  /**
   * Por defecto selecciona el mes contable ANTERIOR al actual, no el mes en
   * curso: el banco recien publica el extracto de un mes despues de que ese
   * mes cierra, asi que cuando el usuario entra a cargar/conciliar, casi
   * siempre esta trabajando sobre el mes pasado. Si ese periodo no existe o
   * ya esta cerrado, cae al periodo abierto mas reciente en su lugar.
   */
  private seleccionarPeriodoPorDefecto(): void {
    const hoy = new Date();
    // getMonth() es 0-based (enero=0), lo que numericamente ya coincide con
    // el mes anterior en base 1 (ej. julio=7 en PRDOMSSS -> getMonth()=6=junio).
    let mesAnterior = hoy.getMonth();
    let anioAnterior = hoy.getFullYear();
    if (mesAnterior === 0) {
      mesAnterior = 12;
      anioAnterior -= 1;
    }

    const periodoAnterior = this.periodos.find(
      (p) => p.mes === mesAnterior && p.anio === anioAnterior && !this.isPeriodoCerrado(p)
    );
    if (periodoAnterior) {
      this.periodoSeleccionado = periodoAnterior.codigo;
      return;
    }
    const primerAbierto = this.periodos.find((p) => !this.isPeriodoCerrado(p));
    this.periodoSeleccionado = primerAbierto ? primerAbierto.codigo : null;
  }

  isPeriodoCerrado(periodo: Periodo): boolean {
    return this.periodosCerrados.has(periodo.codigo);
  }

  onCuentaChange(): void {
    this.limpiarResultados();
  }

  onPeriodoChange(): void {
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
    if (!this.periodoSeleccionado) {
      this.snackBar.open('Seleccione el período contable del extracto', 'Cerrar', { duration: 3000 });
      return;
    }
    if (!this.archivoSeleccionado) {
      this.snackBar.open('Seleccione un archivo', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isValidando = true;
    this.resumen = null;
    this.extractoBancarioService
      .validarImportacion(this.archivoSeleccionado, this.cuentaSeleccionada, this.periodoSeleccionado)
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
    if (!this.cuentaSeleccionada || !this.periodoSeleccionado || !this.archivoSeleccionado || !this.resumen) {
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
      .confirmarImportacion(
        this.archivoSeleccionado,
        this.cuentaSeleccionada,
        this.periodoSeleccionado,
        empresa.codigo,
        usuario?.nombre || ''
      )
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
