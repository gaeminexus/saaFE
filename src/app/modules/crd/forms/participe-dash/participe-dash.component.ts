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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PagosDialogComponent } from './pagos-dialog.component';

import { Entidad } from '../../model/entidad';
import { Prestamo } from '../../model/prestamo';
import { DetallePrestamo } from '../../model/detalle-prestamo';
import { PagoPrestamo } from '../../model/pago-prestamo';
import { Producto } from '../../model/producto';
import { Aporte } from '../../model/aporte';

import { EntidadService } from '../../service/entidad.service';
import { PrestamoService } from '../../service/prestamo.service';
import { DetallePrestamoService } from '../../service/detalle-prestamo.service';
import { PagoPrestamoService } from '../../service/pago-prestamo.service';
import { AporteService } from '../../service/aporte.service';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

interface DetalleConPagos {
  detalle: DetallePrestamo;
  pagos: PagoPrestamo[];
  mostrarPagos: boolean;
}

interface AportesPorTipo {
  tipoAporte: string;
  codigoTipo: number;
  aportes: Aporte[];
  totalValor: number;
  totalPagado: number;
  totalSaldo: number;
  expandido: boolean;
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
    MatSnackBarModule,
    MatDialogModule
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
  prestamos: Prestamo[] = [];
  aportes: Aporte[] = [];
  aportesPorTipo: AportesPorTipo[] = [];
  totalAportes: number = 0;

  // Vista de detalle
  vistaActual: 'dashboard' | 'detallePrestamos' | 'detalleAportes' = 'dashboard';
  prestamoSeleccionado: Prestamo | null = null;

  // Detalles de préstamos
  detallesPrestamo: Map<number, DetalleConPagos[]> = new Map();
  prestamoExpandido: number | null = null;

  // Columnas de las tablas
  displayedColumns: string[] = ['numeroCuota', 'fechaVencimiento', 'capital', 'interes', 'cuota', 'saldo', 'acciones'];
  displayedColumnsAportes: string[] = ['fechaTransaccion', 'tipoAporte', 'glosa', 'valor', 'valorPagado', 'saldo'];

  // Loading states
  isLoadingDetalles: boolean = false;
  isLoadingPagos: boolean = false;
  isLoadingAportes: boolean = false;

  constructor(
    private entidadService: EntidadService,
    private prestamoService: PrestamoService,
    private detallePrestamoService: DetallePrestamoService,
    private pagoPrestamoService: PagoPrestamoService,
    private aporteService: AporteService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {}

  /**
   * Convierte una fecha de forma segura manejando diferentes formatos
   */
  private convertirFecha(fecha: any): Date | null {
    if (!fecha) return null;

    if (fecha instanceof Date) return fecha;

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

    console.warn('No se pudo convertir la fecha:', fecha);
    return null;
  }

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

    // Cargar aportes
    this.cargarAportes();
  }

  cargarPrestamos(): void {
    if (!this.entidadEncontrada || !this.entidadEncontrada.codigo) {
      console.warn('No hay entidad encontrada o no tiene código');
      return;
    }

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
        console.log('Respuesta del backend - préstamos:', prestamos);
        console.log('Tipo de respuesta:', typeof prestamos);
        console.log('Es array?', Array.isArray(prestamos));

        if (!prestamos) {
          console.warn('La respuesta de préstamos es null o undefined');
          this.prestamos = [];
          return;
        }

        if (Array.isArray(prestamos)) {
          console.log('Total préstamos recibidos:', prestamos.length);
          this.procesarPrestamosPorTipo(prestamos as Prestamo[]);
        } else {
          console.error('La respuesta no es un array:', prestamos);
          this.prestamos = [];
        }
      },
      error: (error) => {
        console.error('Error al cargar préstamos:', error);
        this.snackBar.open('Error al cargar préstamos', 'Cerrar', { duration: 3000 });
      }
    });
  }

  cargarAportes(): void {
    if (!this.entidadEncontrada || !this.entidadEncontrada.codigo) {
      console.warn('No hay entidad encontrada o no tiene código');
      return;
    }

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
    criterio.orderBy('fechaTransaccion');
    criterioConsultaArray.push(criterio);

    this.isLoadingAportes = true;

    this.aporteService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (aportes: any) => {
        console.log('Respuesta del backend - aportes:', aportes);

        if (!aportes) {
          console.warn('La respuesta de aportes es null o undefined');
          this.aportes = [];
          this.totalAportes = 0;
          this.isLoadingAportes = false;
          return;
        }

        if (Array.isArray(aportes)) {
          // Convertir fechas
          this.aportes = (aportes as Aporte[]).map(aporte => ({
            ...aporte,
            fechaTransaccion: this.convertirFecha(aporte.fechaTransaccion) || aporte.fechaTransaccion,
            fechaRegistro: this.convertirFecha(aporte.fechaRegistro) || aporte.fechaRegistro
          }));

          // Ordenar por fecha descendente (más recientes primero)
          this.aportes.sort((a, b) => {
            const fechaA = new Date(a.fechaTransaccion).getTime();
            const fechaB = new Date(b.fechaTransaccion).getTime();
            return fechaB - fechaA;
          });

          // Agrupar por tipo de aporte
          this.agruparAportesPorTipo();

          this.totalAportes = this.aportes.reduce((sum, aporte) => sum + (aporte.valor || 0), 0);
          console.log('Total aportes calculado:', this.totalAportes);
          console.log('Aportes cargados:', this.aportes.length);
          console.log('Tipos de aportes:', this.aportesPorTipo.length);
        } else {
          console.warn('La respuesta de aportes no es un array:', aportes);
          this.aportes = [];
          this.aportesPorTipo = [];
          this.totalAportes = 0;
        }

        this.isLoadingAportes = false;
      },
      error: (error) => {
        console.error('Error al cargar aportes:', error);
        this.aportes = [];
        this.totalAportes = 0;
        this.isLoadingAportes = false;
        this.snackBar.open('Error al cargar aportes', 'Cerrar', { duration: 3000 });
      }
    });
  }

  agruparAportesPorTipo(): void {
    const tiposMap = new Map<number, AportesPorTipo>();

    this.aportes.forEach(aporte => {
      const codigoTipo = aporte.tipoAporte?.codigo || 0;
      const nombreTipo = aporte.tipoAporte?.nombre || 'Sin tipo';

      if (!tiposMap.has(codigoTipo)) {
        tiposMap.set(codigoTipo, {
          tipoAporte: nombreTipo,
          codigoTipo: codigoTipo,
          aportes: [],
          totalValor: 0,
          totalPagado: 0,
          totalSaldo: 0,
          expandido: false
        });
      }

      const grupo = tiposMap.get(codigoTipo)!;
      grupo.aportes.push(aporte);
      grupo.totalValor += aporte.valor || 0;
      grupo.totalPagado += aporte.valorPagado || 0;
      grupo.totalSaldo += aporte.saldo || 0;
    });

    this.aportesPorTipo = Array.from(tiposMap.values());
    console.log('Aportes agrupados por tipo:', this.aportesPorTipo);
  }

  toggleTipoAporte(tipo: AportesPorTipo): void {
    tipo.expandido = !tipo.expandido;
  }

  procesarPrestamosPorTipo(prestamos: Prestamo[]): void {
    console.log('=== INICIANDO procesarPrestamosPorTipo ===');
    console.log('Procesando préstamos:', prestamos);
    console.log('Cantidad de préstamos:', prestamos.length);

    if (!prestamos || prestamos.length === 0) {
      console.warn('No hay préstamos para procesar');
      this.prestamos = [];
      return;
    }

    // Asignar directamente los préstamos sin agrupar
    this.prestamos = prestamos;

    console.log('=== RESULTADO FINAL ===');
    console.log('Préstamos asignados:', this.prestamos);
    console.log('Cantidad de préstamos:', this.prestamos.length);
  }

  verDetallePrestamo(prestamo: Prestamo): void {
    this.prestamoSeleccionado = prestamo;
    this.vistaActual = 'detallePrestamos';

    // Cargar detalles si no están cargados
    if (!this.detallesPrestamo.has(prestamo.codigo)) {
      this.cargarDetallesPrestamo(prestamo.codigo);
    }
  }

  verDetalleAportes(): void {
    this.vistaActual = 'detalleAportes';
  }

  volverDashboard(): void {
    this.vistaActual = 'dashboard';
    this.prestamoSeleccionado = null;
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
    criterio.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'prestamo',
      'codigo',
      codigoPrestamo.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterioConsultaArray.push(criterio);

    criterio = new DatosBusqueda();
    criterio.orderBy('numeroCuota');
    criterioConsultaArray.push(criterio);

    this.detallePrestamoService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (detalles: any) => {
        console.log('Respuesta del backend - detalles:', detalles);

        if (!detalles || !Array.isArray(detalles)) {
          console.warn('La respuesta de detalles no es un array válido:', detalles);
          this.detallesPrestamo.set(codigoPrestamo, []);
          this.isLoadingDetalles = false;
          return;
        }

        const detallesConPagos: DetalleConPagos[] = (detalles as DetallePrestamo[]).map(det => {
          // Convertir fechas de string a Date de forma segura
          const fechaVencimiento = this.convertirFecha(det.fechaVencimiento);
          const fechaPagado = this.convertirFecha(det.fechaPagado);
          const fechaRegistro = this.convertirFecha(det.fechaRegistro);

          return {
            detalle: {
              ...det,
              fechaVencimiento: fechaVencimiento || det.fechaVencimiento,
              fechaPagado: fechaPagado || det.fechaPagado,
              fechaRegistro: fechaRegistro || det.fechaRegistro
            },
            pagos: [],
            mostrarPagos: false
          };
        });
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

  togglePagosDetalle(detalleConPagos: DetalleConPagos): void {
    console.log('togglePagosDetalle llamado');
    console.log('Detalle actual:', detalleConPagos);
    console.log('Código del detalle:', detalleConPagos.detalle.codigo);

    // Si ya tiene pagos cargados, mostrar directamente el diálogo
    if (detalleConPagos.pagos.length > 0) {
      this.abrirDialogPagos(detalleConPagos);
    } else {
      // Cargar pagos y luego mostrar el diálogo
      this.isLoadingPagos = true;
      this.cargarPagosDetalle(detalleConPagos).then(() => {
        this.abrirDialogPagos(detalleConPagos);
      });
    }
  }

  abrirDialogPagos(detalleConPagos: DetalleConPagos): void {
    this.dialog.open(PagosDialogComponent, {
      width: '900px',
      maxHeight: '80vh',
      data: {
        detalle: detalleConPagos.detalle,
        pagos: detalleConPagos.pagos
      }
    });
  }

  cargarPagosDetalle(detalleConPagos: DetalleConPagos): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.isLoadingPagos = true;

      const criterioConsultaArray: DatosBusqueda[] = [];

      let criterio = new DatosBusqueda();
      criterio.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'detallePrestamo',
        'codigo',
        detalleConPagos.detalle.codigo.toString(),
        TipoComandosBusqueda.IGUAL
      );
      criterioConsultaArray.push(criterio);

      criterio = new DatosBusqueda();
      criterio.orderBy('fecha');
      criterioConsultaArray.push(criterio);

      this.pagoPrestamoService.selectByCriteria(criterioConsultaArray).subscribe({
        next: (pagos: any) => {
          console.log('Respuesta del backend - pagos:', pagos);

          if (!pagos || !Array.isArray(pagos)) {
            console.warn('La respuesta de pagos no es un array válido:', pagos);
            detalleConPagos.pagos = [];
            detalleConPagos.mostrarPagos = true;
            this.isLoadingPagos = false;
            resolve();
            return;
          }

          // Convertir fechas de string a Date en los pagos de forma segura
          const pagosConvertidos = (pagos as PagoPrestamo[]).map(pago => {
            const fecha = this.convertirFecha(pago.fecha);
            const fechaRegistro = this.convertirFecha(pago.fechaRegistro);

            return {
              ...pago,
              fecha: fecha || pago.fecha,
              fechaRegistro: fechaRegistro || pago.fechaRegistro
            };
          });

          detalleConPagos.pagos = pagosConvertidos;
          detalleConPagos.mostrarPagos = true;
          this.isLoadingPagos = false;
          resolve();
        },
        error: (error) => {
          console.error('Error al cargar pagos:', error);
          this.snackBar.open('Error al cargar pagos', 'Cerrar', { duration: 3000 });
          this.isLoadingPagos = false;
          reject(error);
        }
      });
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

  calcularTotalPagado(prestamo: Prestamo): number {
    // Calcular el total pagado como la diferencia entre el monto total y el saldo
    const totalPrestamo = prestamo.totalPrestamo || 0;
    const saldoTotal = prestamo.saldoTotal || 0;
    return totalPrestamo - saldoTotal;
  }

  limpiarBusqueda(): void {
    this.searchText = '';
    this.entidadEncontrada = null;
    this.prestamos = [];
    this.totalAportes = 0;
    this.vistaActual = 'dashboard';
    this.detallesPrestamo.clear();
    this.prestamoExpandido = null;
  }
}
