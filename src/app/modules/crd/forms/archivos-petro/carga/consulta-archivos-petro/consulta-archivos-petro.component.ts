import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { CargaArchivo } from '../../../../model/carga-archivo';
import { CargaArchivoService } from '../../../../service/carga-archivo.service';
import { ServiciosAsoprepService } from '../../../../../asoprep/service/servicios-asoprep.service';
import { FuncionesDatosService } from '../../../../../../shared/services/funciones-datos.service';
import { ConfirmDialogComponent } from '../../../../../../shared/basics/confirm-dialog/confirm-dialog.component';

interface MesCirculo {
  numero: number;
  nombre: string;
  activo: boolean;
  tieneCarga: boolean;
}

@Component({
  selector: 'app-consulta-archivos-petro.component',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './consulta-archivos-petro.component.html',
  styleUrl: './consulta-archivos-petro.component.scss'
})
export class ConsultaArchivosPetroComponent implements OnInit {

  todasLasCargas: CargaArchivo[] = [];
  cargasFiltradas: CargaArchivo[] = [];
  aniosDisponibles: number[] = [];
  anioSeleccionado: number | null = null;
  mesSeleccionado: number | null = null;

  procesandoCodigos = signal<Set<number>>(new Set());

  meses: MesCirculo[] = [
    { numero: 1, nombre: 'ENE', activo: false, tieneCarga: false },
    { numero: 2, nombre: 'FEB', activo: false, tieneCarga: false },
    { numero: 3, nombre: 'MAR', activo: false, tieneCarga: false },
    { numero: 4, nombre: 'ABR', activo: false, tieneCarga: false },
    { numero: 5, nombre: 'MAY', activo: false, tieneCarga: false },
    { numero: 6, nombre: 'JUN', activo: false, tieneCarga: false },
    { numero: 7, nombre: 'JUL', activo: false, tieneCarga: false },
    { numero: 8, nombre: 'AGO', activo: false, tieneCarga: false },
    { numero: 9, nombre: 'SEP', activo: false, tieneCarga: false },
    { numero: 10, nombre: 'OCT', activo: false, tieneCarga: false },
    { numero: 11, nombre: 'NOV', activo: false, tieneCarga: false },
    { numero: 12, nombre: 'DIC', activo: false, tieneCarga: false }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cargaArchivoService: CargaArchivoService,
    private serviciosAsoprepService: ServiciosAsoprepService,
    private funcionesDatosService: FuncionesDatosService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Obtener datos del resolver
    this.route.data.subscribe(data => {
      this.todasLasCargas = data['cargas'] || [];
      this.cargasFiltradas = [...this.todasLasCargas];
      this.ordenarCargasCronologicamente(this.cargasFiltradas);
      this.extraerAniosDisponibles();
      this.inicializarVista();
    });
  }

  /**
   * Extrae los años únicos de todas las cargas
   */
  private extraerAniosDisponibles(): void {
    const aniosSet = new Set<number>();
    this.todasLasCargas.forEach(carga => {
      if (carga.anioAfectacion) {
        aniosSet.add(carga.anioAfectacion);
      }
    });
    this.aniosDisponibles = Array.from(aniosSet).sort((a, b) => b - a); // Descendente
  }

  /**
   * Inicializa la vista con el año más reciente
   */
  private inicializarVista(): void {
    if (this.aniosDisponibles.length > 0) {
      this.anioSeleccionado = this.aniosDisponibles[0];
      this.onAnioSeleccionado();
    }
  }

  /**
   * Cuando se selecciona un año del combo
   */
  onAnioSeleccionado(): void {
    if (!this.anioSeleccionado) {
      this.resetearMeses();
      this.cargasFiltradas = [];
      return;
    }

    // Llamar al servicio para obtener cargas del año seleccionado
    this.cargaArchivoService.getByAnio(this.anioSeleccionado.toString()).subscribe({
      next: (cargas: any) => {
        // El backend puede retornar un objeto o array, manejamos ambos casos
        const cargasArray = Array.isArray(cargas) ? cargas : [cargas];

        // Resetear meses
        this.resetearMeses();

        // Marcar meses que tienen carga
        cargasArray.forEach((carga: CargaArchivo) => {
          if (carga && carga.mesAfectacion) {
            const mes = this.meses.find(m => m.numero === carga.mesAfectacion);
            if (mes) {
              mes.tieneCarga = true;
            }
          }
        });

        // Resetear selección de mes
        this.mesSeleccionado = null;

        // Mostrar todas las cargas del año
        this.cargasFiltradas = cargasArray.filter(c => c && c.anioAfectacion === this.anioSeleccionado);
        this.ordenarCargasCronologicamente(this.cargasFiltradas);
      },
      error: (error) => {
        console.error('Error al cargar cargas del año:', error);
        this.resetearMeses();
        this.cargasFiltradas = [];
      }
    });
  }

  /**
   * Cuando se hace clic en un círculo de mes
   */
  onMesClick(mes: MesCirculo): void {
    if (!mes.tieneCarga) return; // No hacer nada si el mes no tiene carga

    // Toggle selección
    if (this.mesSeleccionado === mes.numero) {
      // Deseleccionar
      this.mesSeleccionado = null;
      this.meses.forEach(m => m.activo = false);
      // Mostrar todas las cargas del año
      this.cargasFiltradas = this.todasLasCargas.filter(c =>
        c.anioAfectacion === this.anioSeleccionado
      );
      this.ordenarCargasCronologicamente(this.cargasFiltradas);
    } else {
      // Seleccionar nuevo mes
      this.mesSeleccionado = mes.numero;
      this.meses.forEach(m => m.activo = false);
      mes.activo = true;

      // Filtrar cargas por año y mes
      this.cargasFiltradas = this.todasLasCargas.filter(c =>
        c.anioAfectacion === this.anioSeleccionado && c.mesAfectacion === mes.numero
      );
      this.ordenarCargasCronologicamente(this.cargasFiltradas);
    }
  }

  /**
   * Resetea el estado de todos los meses
   */
  private resetearMeses(): void {
    this.meses.forEach(mes => {
      mes.activo = false;
      mes.tieneCarga = false;
    });
  }

  /**
   * Ordena las cargas cronológicamente: año descendente, mes descendente
   * (más recientes primero)
   */
  private ordenarCargasCronologicamente(cargas: CargaArchivo[]): void {
    cargas.sort((a, b) => {
      // Primero ordenar por año (descendente - más reciente primero)
      if (a.anioAfectacion !== b.anioAfectacion) {
        return (b.anioAfectacion || 0) - (a.anioAfectacion || 0);
      }

      // Si el año es igual, ordenar por mes (descendente - más reciente primero)
      if (a.mesAfectacion !== b.mesAfectacion) {
        return (b.mesAfectacion || 0) - (a.mesAfectacion || 0);
      }

      // Si año y mes son iguales, ordenar por fecha de carga (descendente)
      const fechaA = this.funcionesDatosService.convertirFechaDesdeBackend(a.fechaCarga);
      const fechaB = this.funcionesDatosService.convertirFechaDesdeBackend(b.fechaCarga);

      if (fechaA && fechaB) {
        return fechaB.getTime() - fechaA.getTime();
      }

      return 0;
    });
  }

  /**
   * Obtiene el nombre de la filial
   */
  getFilialNombre(carga: CargaArchivo): string {
    return carga.filial?.nombre || 'N/A';
  }

  /**
   * Obtiene el nombre del usuario que cargó
   */
  getUsuarioCarga(carga: CargaArchivo): string {
    if (carga.usuarioCarga) {
      return carga.usuarioCarga.nombre || 'N/A';
    }
    return 'N/A';
  }

  /**
   * Formatea la fecha de carga usando conversión unificada
   */
  formatearFechaCarga(carga: CargaArchivo): string {
    if (!carga.fechaCarga) return 'N/A';

    // Usar el método centralizado que maneja nanosegundos correctamente
    const fechaConvertida = this.funcionesDatosService.convertirFechaDesdeBackend(carga.fechaCarga);
    if (!fechaConvertida) return 'N/A';

    return fechaConvertida.toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Obtiene el nombre del mes
   */
  getMesNombre(numeroMes: number | undefined): string {
    if (!numeroMes) return 'N/A';
    const mes = this.meses.find(m => m.numero === numeroMes);
    return mes?.nombre || 'N/A';
  }

  /**
   * Navega al detalle de la carga
   */
  verDetalle(carga: CargaArchivo): void {
    if (carga.codigo) {
      this.router.navigate(['/menucreditos/archivos-petro/carga/detalle', carga.codigo]);
    }
  }

  /**
   * Aprueba la carga para contabilidad
   */
  aprobarContabilidad(carga: CargaArchivo): void {
    console.log('Aprobar contabilidad para carga:', carga.codigo);
    // TODO: Implementar lógica de aprobación contable
  }

  /**
   * Procesa la carga petrocomercial llamando al backend
   */
  procesarCarga(carga: CargaArchivo): void {
    if (!carga.codigo) return;

    if (this.esCargaProcesada(carga)) {
      this.snackBar.open('La carga ya está procesada', 'Cerrar', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: {
        title: 'Confirmar Procesamiento',
        message: `¿Está seguro de que desea procesar la carga ${carga.anioAfectacion}/${carga.mesAfectacion}? Esta acción generará los registros definitivos en el sistema.`,
        type: 'warning',
        confirmText: 'Procesar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      const procesando = new Set(this.procesandoCodigos());
      procesando.add(carga.codigo!);
      this.procesandoCodigos.set(procesando);

      this.serviciosAsoprepService.aplicarPagosArchivoPetro(carga.codigo!).subscribe({
        next: () => {
          const actualizado = new Set(this.procesandoCodigos());
          actualizado.delete(carga.codigo!);
          this.procesandoCodigos.set(actualizado);
          this.snackBar.open('Carga procesada exitosamente', 'Cerrar', { duration: 4000 });
          // Recargar cargas del año para reflejar el nuevo estado
          this.onAnioSeleccionado();
        },
        error: (err) => {
          const actualizado = new Set(this.procesandoCodigos());
          actualizado.delete(carga.codigo!);
          this.procesandoCodigos.set(actualizado);
          const mensaje = err?.message || err?.mensaje || 'Error al procesar la carga';
          this.snackBar.open(`Error: ${mensaje}`, 'Cerrar', { duration: 5000 });
        }
      });
    });
  }

  esCargaProcesada(carga: CargaArchivo): boolean {
    const estadoNumerico = Number((carga as any).codigoEstado ?? carga.estado ?? 0);
    return estadoNumerico === 3;
  }

  /**
   * @deprecated Usar funcionesDatosService.convertirFechaDesdeBackend() en su lugar
   * Mantener por compatibilidad temporal
   */
  private convertirFecha(fecha: any): Date | null {
    return this.funcionesDatosService.convertirFechaDesdeBackend(fecha);
  }
}
