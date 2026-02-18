import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';

import { Mayorizacion } from '../../model/mayorizacion';
import { MayorizacionProceso, TipoProceso } from '../../model/mayorizacion-proceso';
import { Periodo } from '../../model/periodo';
import { MayorizacionService } from '../../service/mayorizacion.service';
import { PeriodoService } from '../../service/periodo.service';

const FECHA_HORA = 1;
const RUBRO_PROCESOS_MAYORIZACION = 49;

@Component({
  selector: 'app-mayorizacion-proceso',
  standalone: true,
  imports: [
    CommonModule,
    MaterialFormModule,
  ],
  templateUrl: './mayorizacion-proceso.component.html',
  styleUrl: './mayorizacion-proceso.component.scss',
})
export class MayorizacionProcesoComponent implements OnInit {
  formProceso: FormGroup;
  periodos: Periodo[] = [];
  mayorizaciones: Mayorizacion[] = [];
  cargando = false;
  procesando = false;

  // Procesos cargados desde detalleRubro (rubro 49)
  tiposProceso: any[] = [];

  displayedColumns: string[] = ['codigo', 'periodo', 'fecha', 'acciones'];

  constructor(
    private fb: FormBuilder,
    private mayorizacionService: MayorizacionService,
    private periodoService: PeriodoService,
    private snackBar: MatSnackBar,
    private funcionesDatos: FuncionesDatosService,
    private detalleRubroService: DetalleRubroService
  ) {
    this.formProceso = this.fb.group({
      // Empresa ya se filtra por login; no se selecciona en UI
      periodoDesde: ['', [Validators.required]],
      periodoHasta: ['', [Validators.required]],
      proceso: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.cargarProcesosMayorizacion();
    this.cargarPeriodos();
    this.cargarMayorizaciones();
  }

  cargarProcesosMayorizacion(): void {
    const detalles = this.detalleRubroService.getDetallesByParent(RUBRO_PROCESOS_MAYORIZACION);
    this.tiposProceso = detalles.map(detalle => ({
      value: detalle.codigoAlterno, // 1=Mayorizar, 2=Mayorizar Cierre, 3=Desmayorizar
      label: detalle.descripcion
    }));

    // Establecer proceso 1 (Mayorizar) como default si existe
    if (this.tiposProceso.length > 0) {
      this.formProceso.patchValue({ proceso: 1 });
    }
  }

  cargarPeriodos(): void {
    this.cargando = true;
    this.periodoService.getAll().subscribe({
      next: (periodos) => {
        // Ordenar cronológicamente (Año ascendente, Mes ascendente)
        this.periodos = (periodos || []).sort((a, b) => {
          if (a.anio !== b.anio) return a.anio - b.anio;
          return a.mes - b.mes;
        });
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar períodos:', error);
        this.mostrarMensaje('Error al cargar períodos', 'error');
        this.cargando = false;
      },
    });
  }

  cargarMayorizaciones(): void {
    this.mayorizacionService.getAll().subscribe({
      next: (mayorizaciones) => {
        this.mayorizaciones = mayorizaciones || [];
      },
      error: (error) => {
        console.error('Error al cargar mayorizaciones:', error);
        this.mostrarMensaje('Error al cargar mayorizaciones', 'error');
      },
    });
  }

  ejecutarProceso(): void {
    if (this.formProceso.valid) {
      this.procesando = true;
      const periodoDesde = this.formProceso.value.periodoDesde;
      const periodoHasta = this.formProceso.value.periodoHasta;
      const proceso = this.formProceso.value.proceso; // 1=Mayorizar, 2=Mayorizar Cierre, 3=Desmayorizar
      const empresaCodigo = this.getEmpresaCodigo().toString();

      // Validar que periodo hasta sea mayor o igual a periodo desde
      if (periodoHasta < periodoDesde) {
        this.mostrarMensaje('El período hasta debe ser mayor o igual al período desde', 'error');
        this.procesando = false;
        return;
      }

      // Seleccionar el servicio según el tipo de proceso
      const serviceCall = proceso === 3
        ? this.mayorizacionService.desmayorizacion(empresaCodigo, periodoDesde, periodoHasta, proceso)
        : this.mayorizacionService.mayorizacion(empresaCodigo, periodoDesde, periodoHasta, proceso);

      serviceCall.subscribe({
        next: () => {
          const mensajeProceso = proceso === 3 ? 'desmayorización' : proceso === 2 ? 'mayorización de cierre' : 'mayorización';
          this.mostrarMensaje(`Proceso de ${mensajeProceso} ejecutado exitosamente`, 'success');
          this.cargarMayorizaciones(); // Recargar la lista
          this.formProceso.patchValue({ proceso: 1 }); // Resetear a Mayorizar
          this.procesando = false;
        },
        error: (error) => {
          const mensajeProceso = proceso === 3 ? 'desmayorización' : proceso === 2 ? 'mayorización de cierre' : 'mayorización';
          this.mostrarMensaje(
            error || `Error al ejecutar el proceso de ${mensajeProceso}. Verifique la conexión con el servidor.`,
            'error'
          );
          this.procesando = false;
        },
      });
    } else {
      this.mostrarMensaje('Por favor complete todos los campos requeridos', 'warn');
    }
  }

  private mostrarMensaje(mensaje: string, tipo: 'success' | 'error' | 'warn' = 'success'): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: [`snackbar-${tipo}`],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  // Función auxiliar para casting de FormControl
  $any(obj: any): any {
    return obj;
  }

  private getEmpresaCodigo(): number {
    return parseInt(localStorage.getItem('idSucursal') || '280', 10);
  }

  /**
   * Formatea una fecha usando el servicio global de funciones
   */
  formatFecha(fecha: any): string {
    return this.funcionesDatos.formatoFechaOrigenConHora(fecha, FECHA_HORA);
  }
}
