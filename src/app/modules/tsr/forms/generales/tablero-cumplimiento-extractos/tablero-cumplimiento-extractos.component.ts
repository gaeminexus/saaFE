import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { Periodo } from '../../../../cnt/model/periodo';
import { PeriodoService } from '../../../../cnt/service/periodo.service';
import { ControlExtractoBancario } from '../../../model/control-extracto-bancario';
import { DetalleCumplimientoCuenta } from '../../../model/detalle-cumplimiento-cuenta';
import { ControlExtractoBancarioService } from '../../../service/control-extracto-bancario.service';

@Component({
  selector: 'app-tablero-cumplimiento-extractos',
  standalone: true,
  imports: [MaterialFormModule],
  templateUrl: './tablero-cumplimiento-extractos.component.html',
  styleUrl: './tablero-cumplimiento-extractos.component.scss',
})
export class TableroCumplimientoExtractosComponent implements OnInit {
  controles: ControlExtractoBancario[] = [];
  periodos: Periodo[] = [];
  periodoSeleccionado: number | null = null;

  isLoading: boolean = false;
  isLoadingPeriodos: boolean = false;
  isGenerando: boolean = false;
  recalculandoCodigo: number | null = null;

  controlExpandido: number | null = null;
  detalleCuentas: DetalleCumplimientoCuenta[] = [];
  isLoadingDetalle: boolean = false;

  constructor(
    private controlExtractoBancarioService: ControlExtractoBancarioService,
    private periodoService: PeriodoService,
    private appStateService: AppStateService,
    private snackBar: MatSnackBar,
    private funcionesDatosService: FuncionesDatosService
  ) {}

  ngOnInit(): void {
    this.cargarControles();
    this.cargarPeriodos();
  }

  cargarControles(): void {
    this.isLoading = true;
    this.controlExtractoBancarioService.getAll().subscribe({
      next: (data) => {
        this.controles = Array.isArray(data)
          ? [...data].sort((a, b) => b.anio - a.anio || b.mes - a.mes)
          : [];
        this.isLoading = false;
      },
      error: () => {
        this.controles = [];
        this.isLoading = false;
      },
    });
  }

  cargarPeriodos(): void {
    this.isLoadingPeriodos = true;
    this.periodoService.getAll().subscribe({
      next: (data) => {
        this.periodos = Array.isArray(data) ? data : [];
        this.isLoadingPeriodos = false;
      },
      error: () => {
        this.periodos = [];
        this.isLoadingPeriodos = false;
      },
    });
  }

  generarPeriodo(): void {
    const empresa = this.appStateService.getEmpresa();
    if (!empresa?.codigo) {
      this.snackBar.open('No se pudo determinar la empresa actual', 'Cerrar', { duration: 4000 });
      return;
    }
    if (!this.periodoSeleccionado) {
      this.snackBar.open('Seleccione un período', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isGenerando = true;
    this.controlExtractoBancarioService.generarPeriodo(empresa.codigo, this.periodoSeleccionado).subscribe({
      next: () => {
        this.isGenerando = false;
        this.snackBar.open('Período generado', 'Cerrar', { duration: 4000 });
        this.cargarControles();
      },
      error: (error) => {
        this.isGenerando = false;
        this.snackBar.open(`Error al generar período: ${error?.error || error?.message || error}`, 'Cerrar', {
          duration: 6000,
        });
      },
    });
  }

  recalcular(control: ControlExtractoBancario): void {
    const idEmpresa = control.empresa?.codigo;
    const idPeriodo = control.periodo?.codigo;
    if (!idEmpresa || !idPeriodo) {
      return;
    }

    this.recalculandoCodigo = control.codigo;
    this.controlExtractoBancarioService.recalcularPeriodo(idEmpresa, idPeriodo).subscribe({
      next: () => {
        this.recalculandoCodigo = null;
        this.snackBar.open('Período recalculado', 'Cerrar', { duration: 4000 });
        this.cargarControles();
        if (this.controlExpandido === control.codigo) {
          this.cargarDetalleCuentas(control);
        }
      },
      error: (error) => {
        this.recalculandoCodigo = null;
        this.snackBar.open(`Error al recalcular: ${error?.error || error?.message || error}`, 'Cerrar', {
          duration: 6000,
        });
      },
    });
  }

  /**
   * Expande/colapsa el drill-down por cuenta bancaria de un período - lo que
   * responde directamente "¿cuáles cuentas faltan?" en vez de solo un
   * porcentaje agregado.
   */
  toggleDetalle(control: ControlExtractoBancario): void {
    if (this.controlExpandido === control.codigo) {
      this.controlExpandido = null;
      return;
    }
    this.controlExpandido = control.codigo;
    this.cargarDetalleCuentas(control);
  }

  private cargarDetalleCuentas(control: ControlExtractoBancario): void {
    const idEmpresa = control.empresa?.codigo;
    const idPeriodo = control.periodo?.codigo;
    if (!idEmpresa || !idPeriodo) {
      return;
    }
    this.isLoadingDetalle = true;
    this.detalleCuentas = [];
    this.controlExtractoBancarioService.detalleCuentas(idEmpresa, idPeriodo).subscribe({
      next: (lista) => {
        this.detalleCuentas = Array.isArray(lista) ? lista : [];
        this.isLoadingDetalle = false;
      },
      error: (error) => {
        this.isLoadingDetalle = false;
        this.snackBar.open(
          `Error al obtener el detalle por cuenta: ${error?.error || error?.message || error}`,
          'Cerrar',
          { duration: 6000 }
        );
      },
    });
  }

  /** Cuentas que todavía no han cargado su extracto - lo primero que se quiere ver. */
  get cuentasFaltantes(): DetalleCumplimientoCuenta[] {
    return this.detalleCuentas.filter((d) => !d.cargada);
  }

  /** Cuentas cargadas pero aún sin conciliar. */
  get cuentasPendientesConciliar(): DetalleCumplimientoCuenta[] {
    return this.detalleCuentas.filter((d) => d.cargada && !d.conciliada);
  }

  formatearFechaHora(fecha: any): string {
    return this.funcionesDatosService.formatoFecha(fecha, FuncionesDatosService.FECHA_HORA);
  }

  porcentajeCargadas(control: ControlExtractoBancario): number {
    if (!control.totalCuentas) {
      return 0;
    }
    return Math.round((control.cuentasCargadas / control.totalCuentas) * 100);
  }

  porcentajeConciliadas(control: ControlExtractoBancario): number {
    if (!control.totalCuentas) {
      return 0;
    }
    return Math.round((control.cuentasConciliadas / control.totalCuentas) * 100);
  }

  /** Cuantas cuentas faltan por cargar - para el badge prominente de la tarjeta. */
  faltantesCarga(control: ControlExtractoBancario): number {
    return (control.totalCuentas || 0) - (control.cuentasCargadas || 0);
  }

  /** Cuantas cuentas ya cargaron pero aun no se concilian. */
  faltantesConciliacion(control: ControlExtractoBancario): number {
    return (control.cuentasCargadas || 0) - (control.cuentasConciliadas || 0);
  }

  /** Clase de color para el borde de la tarjeta segun que tan completo esta el mes. */
  estadoTarjeta(control: ControlExtractoBancario): string {
    if ((control.totalCuentas || 0) === 0) {
      return 'estado-sin-datos';
    }
    if (control.cuentasConciliadas === control.totalCuentas) {
      return 'estado-completo';
    }
    if (control.cuentasCargadas === 0) {
      return 'estado-critico';
    }
    return 'estado-parcial';
  }
}
