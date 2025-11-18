import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Entidad } from '../../model/entidad';
import { Prestamo } from '../../model/prestamo';
import { DetallePrestamo } from '../../model/detalle-prestamo';
import { PagoPrestamo } from '../../model/pago-prestamo';
import { TipoPrestamo } from '../../model/tipo-prestamo';

import { EntidadService } from '../../service/entidad.service';
import { PrestamoService } from '../../service/prestamo.service';
import { DetallePrestamoService } from '../../service/detalle-prestamo.service';
import { PagoPrestamoService } from '../../service/pago-prestamo.service';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

interface PrestamosPorTipo {
  tipoPrestamo: TipoPrestamo;
  prestamos: Prestamo[];
  totalPrestamos: number;
  montoTotal: number;
  saldoTotal: number;
}

interface DetalleConPagos {
  detalle: DetallePrestamo;
  pagos: PagoPrestamo[];
  mostrarPagos: boolean;
}

@Component({
  selector: 'app-participe-dash',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatTableModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './participe-dash.component.html',
  styleUrl: './participe-dash.component.scss'
})
export class ParticipeDashComponent implements OnInit {
  // Búsqueda
  searchText: string = '';
  isSearching: boolean = false;

  // Entidad encontrada
  entidadEncontrada: Entidad | null = null;

  // Dashboard
  prestamosPorTipo: PrestamosPorTipo[] = [];
  totalAportes: number = 0;

  // Vista de detalle
  vistaActual: 'dashboard' | 'detallePrestamos' | 'detalleAportes' = 'dashboard';
  tipoPrestamoSeleccionado: PrestamosPorTipo | null = null;

  // Detalles de préstamos
  detallesPrestamo: Map<number, DetalleConPagos[]> = new Map();
  prestamoExpandido: number | null = null;

  // Loading states
  isLoadingDetalles: boolean = false;
  isLoadingPagos: boolean = false;

  constructor(
    private entidadService: EntidadService,
    private prestamoService: PrestamoService,
    private detallePrestamoService: DetallePrestamoService,
    private pagoPrestamoService: PagoPrestamoService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {}

  buscarEntidad(): void {
    if (!this.searchText.trim()) {
      this.snackBar.open('Por favor ingrese un criterio de búsqueda', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isSearching = true;
    this.entidadEncontrada = null;
    this.vistaActual = 'dashboard';

    const criterioConsultaArray: DatosBusqueda[] = [];

    // Búsqueda por número de identificación, razón social o nombre comercial
    let criterio = new DatosBusqueda();
    criterio.asigna3(TipoDatosBusqueda.STRING, 'numeroIdentificacion',
      this.searchText.trim(), TipoComandosBusqueda.LIKE);
    criterioConsultaArray.push(criterio);

    criterio = new DatosBusqueda();
    criterio.asigna3(TipoDatosBusqueda.STRING, 'razonSocial',
      this.searchText.trim(), TipoComandosBusqueda.LIKE);
    criterio.setTipoOperadorLogico(TipoComandosBusqueda.OR);
    criterioConsultaArray.push(criterio);

    criterio = new DatosBusqueda();
    criterio.asigna3(TipoDatosBusqueda.STRING, 'nombreComercial',
      this.searchText.trim(), TipoComandosBusqueda.LIKE);
    criterio.setTipoOperadorLogico(TipoComandosBusqueda.OR);
    criterioConsultaArray.push(criterio);

    this.entidadService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (entidades: any) => {
        this.isSearching = false;
        if (entidades && entidades.length > 0) {
          this.entidadEncontrada = entidades[0] as Entidad;
          this.cargarDashboard();
        } else {
          this.snackBar.open('No se encontró ninguna entidad', 'Cerrar', { duration: 3000 });
        }
      },
      error: (error) => {
        this.isSearching = false;
        console.error('Error al buscar entidad:', error);
        this.snackBar.open('Error al buscar entidad', 'Cerrar', { duration: 3000 });
      }
    });
  }

  cargarDashboard(): void {
    if (!this.entidadEncontrada) return;

    // Cargar préstamos
    this.cargarPrestamos();

    // Cargar aportes (simulado por ahora ya que no existe el modelo)
    this.totalAportes = 0; // Aquí irá la lógica real cuando exista el modelo Aporte
  }

  cargarPrestamos(): void {
    if (!this.entidadEncontrada) return;

    const criterioConsultaArray: DatosBusqueda[] = [];

    let criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'entidad',
      'codigo',
      this.entidadEncontrada.codigo.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterioConsultaArray.push(criterio);

    criterio = new DatosBusqueda();
    criterio.orderBy('codigo');
    criterioConsultaArray.push(criterio);

    this.prestamoService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (prestamos: any) => {
        this.procesarPrestamosPorTipo(prestamos as Prestamo[]);
      },
      error: (error) => {
        console.error('Error al cargar préstamos:', error);
        this.snackBar.open('Error al cargar préstamos', 'Cerrar', { duration: 3000 });
      }
    });
  }

  procesarPrestamosPorTipo(prestamos: Prestamo[]): void {
    const mapaPrestamosPorTipo = new Map<number, Prestamo[]>();

    prestamos.forEach(prestamo => {
      const codigoTipo = prestamo.Producto?.codigo || 0;
      if (!mapaPrestamosPorTipo.has(codigoTipo)) {
        mapaPrestamosPorTipo.set(codigoTipo, []);
      }
      mapaPrestamosPorTipo.get(codigoTipo)!.push(prestamo);
    });

    this.prestamosPorTipo = Array.from(mapaPrestamosPorTipo.entries()).map(([codigo, prestamos]) => {
      const montoTotal = prestamos.reduce((sum, p) => sum + (p.totalPrestamo || 0), 0);
      const saldoTotal = prestamos.reduce((sum, p) => sum + (p.saldoTotal || 0), 0);

      return {
        tipoPrestamo: prestamos[0].Producto as any, // Asumiendo que Producto contiene info similar a TipoPrestamo
        prestamos: prestamos,
        totalPrestamos: prestamos.length,
        montoTotal: montoTotal,
        saldoTotal: saldoTotal
      };
    });
  }

  verDetallePrestamos(prestamoTipo: PrestamosPorTipo): void {
    this.tipoPrestamoSeleccionado = prestamoTipo;
    this.vistaActual = 'detallePrestamos';
  }

  verDetalleAportes(): void {
    this.vistaActual = 'detalleAportes';
  }

  volverDashboard(): void {
    this.vistaActual = 'dashboard';
    this.tipoPrestamoSeleccionado = null;
    this.prestamoExpandido = null;
  }

  togglePrestamo(prestamo: Prestamo): void {
    if (this.prestamoExpandido === prestamo.codigo) {
      this.prestamoExpandido = null;
    } else {
      this.prestamoExpandido = prestamo.codigo;
      this.cargarDetallesPrestamo(prestamo.codigo);
    }
  }

  cargarDetallesPrestamo(codigoPrestamo: number): void {
    if (this.detallesPrestamo.has(codigoPrestamo)) {
      return; // Ya está cargado
    }

    this.isLoadingDetalles = true;

    const criterioConsultaArray: DatosBusqueda[] = [];

    let criterio = new DatosBusqueda();
    criterio.asigna3(
      TipoDatosBusqueda.LONG,
      'codigoPrestamo',
      codigoPrestamo.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterioConsultaArray.push(criterio);

    criterio = new DatosBusqueda();
    criterio.orderBy('numeroCuota');
    criterioConsultaArray.push(criterio);

    this.detallePrestamoService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (detalles: any) => {
        const detallesConPagos: DetalleConPagos[] = (detalles as DetallePrestamo[]).map(det => ({
          detalle: det,
          pagos: [],
          mostrarPagos: false
        }));
        this.detallesPrestamo.set(codigoPrestamo, detallesConPagos);
        this.isLoadingDetalles = false;
      },
      error: (error) => {
        console.error('Error al cargar detalles del préstamo:', error);
        this.snackBar.open('Error al cargar detalles del préstamo', 'Cerrar', { duration: 3000 });
        this.isLoadingDetalles = false;
      }
    });
  }

  togglePagosDetalle(codigoPrestamo: number, detalleIndex: number): void {
    const detalles = this.detallesPrestamo.get(codigoPrestamo);
    if (!detalles || !detalles[detalleIndex]) return;

    const detalleConPagos = detalles[detalleIndex];

    if (detalleConPagos.mostrarPagos) {
      detalleConPagos.mostrarPagos = false;
    } else {
      if (detalleConPagos.pagos.length === 0) {
        this.cargarPagosDetalle(detalleConPagos);
      } else {
        detalleConPagos.mostrarPagos = true;
      }
    }
  }

  cargarPagosDetalle(detalleConPagos: DetalleConPagos): void {
    this.isLoadingPagos = true;

    const criterioConsultaArray: DatosBusqueda[] = [];

    let criterio = new DatosBusqueda();
    criterio.asigna3(
      TipoDatosBusqueda.LONG,
      'codigoDetalle',
      detalleConPagos.detalle.codigo.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterioConsultaArray.push(criterio);

    criterio = new DatosBusqueda();
    criterio.orderBy('fecha');
    criterioConsultaArray.push(criterio);

    this.pagoPrestamoService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (pagos: any) => {
        detalleConPagos.pagos = pagos as PagoPrestamo[];
        detalleConPagos.mostrarPagos = true;
        this.isLoadingPagos = false;
      },
      error: (error) => {
        console.error('Error al cargar pagos:', error);
        this.snackBar.open('Error al cargar pagos', 'Cerrar', { duration: 3000 });
        this.isLoadingPagos = false;
      }
    });
  }

  calcularTotales(codigoPrestamo: number): { capital: number, interes: number, cuota: number } {
    const detalles = this.detallesPrestamo.get(codigoPrestamo);
    if (!detalles) return { capital: 0, interes: 0, cuota: 0 };

    return detalles.reduce((acc, dc) => ({
      capital: acc.capital + (dc.detalle.capital || 0),
      interes: acc.interes + (dc.detalle.interes || 0),
      cuota: acc.cuota + (dc.detalle.cuota || 0)
    }), { capital: 0, interes: 0, cuota: 0 });
  }

  limpiarBusqueda(): void {
    this.searchText = '';
    this.entidadEncontrada = null;
    this.prestamosPorTipo = [];
    this.totalAportes = 0;
    this.vistaActual = 'dashboard';
    this.detallesPrestamo.clear();
    this.prestamoExpandido = null;
  }
}
