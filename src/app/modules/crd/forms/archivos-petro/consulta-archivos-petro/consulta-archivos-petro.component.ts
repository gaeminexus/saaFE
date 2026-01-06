import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { CargaArchivo } from '../../../model/carga-archivo';
import { CargaArchivoService } from '../../../service/carga-archivo.service';

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
    private cargaArchivoService: CargaArchivoService
  ) {}

  ngOnInit(): void {
    // Obtener datos del resolver
    this.route.data.subscribe(data => {
      this.todasLasCargas = data['cargas'] || [];
      this.cargasFiltradas = [...this.todasLasCargas];
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
    } else {
      // Seleccionar nuevo mes
      this.mesSeleccionado = mes.numero;
      this.meses.forEach(m => m.activo = false);
      mes.activo = true;

      // Filtrar cargas por año y mes
      this.cargasFiltradas = this.todasLasCargas.filter(c =>
        c.anioAfectacion === this.anioSeleccionado && c.mesAfectacion === mes.numero
      );
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

    const fechaConvertida = this.convertirFecha(carga.fechaCarga);
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
      this.router.navigate(['/menucreditos/detalle-consulta-carga', carga.codigo]);
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
   * Procesa la carga
   */
  procesarCarga(carga: CargaArchivo): void {
    console.log('Procesar carga:', carga.codigo);
    // TODO: Implementar lógica de procesamiento
  }

  /**
   * Convierte una fecha de forma segura manejando diferentes formatos
   */
  private convertirFecha(fecha: any): Date | null {
    if (!fecha) return null;

    if (fecha instanceof Date) return fecha;

    // Si es un array (como [2023,7,31,0,0]), convertir a Date
    if (Array.isArray(fecha)) {
      // Array format: [year, month, day, hour, minute, second?, millisecond?]
      const [year, month, day, hour = 0, minute = 0, second = 0, ms = 0] = fecha;
      // Nota: los meses en JavaScript Date van de 0-11, pero el backend puede enviar 1-12
      // Asumimos que el backend envía 1-12 (mes real), así que restamos 1
      return new Date(year, month - 1, day, hour, minute, second, ms);
    }

    if (typeof fecha === 'string') {
      // Limpiar el string de fecha quitando el timezone [UTC] si existe
      const fechaLimpia = fecha.replace(/\[.*?\]/, '');
      const fechaConvertida = new Date(fechaLimpia);

      // Verificar si la fecha es válida
      if (!isNaN(fechaConvertida.getTime())) {
        return fechaConvertida;
      }
    }

    if (typeof fecha === 'number') {
      return new Date(fecha);
    }

    return null;
  }
}
