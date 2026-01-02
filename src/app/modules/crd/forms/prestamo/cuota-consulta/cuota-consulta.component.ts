import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';

import { DetallePrestamoService } from '../../../service/detalle-prestamo.service';
import { ExportService } from '../../../../../shared/services/export.service';
import { DetallePrestamo } from '../../../model/detalle-prestamo';
import { PrestamoDetalleDialogComponent } from '../../../dialog/prestamo-detalle-dialog/prestamo-detalle-dialog.component';

interface CuotaDisplay {
  codigoDetalle: number;
  codigoPrestamo: number;        // Código interno del préstamo (para navegación)
  numeroPrestamo: number;        // ID ASOPREP (para mostrar)
  tipoPrestamo: string;
  fechaVencimiento: Date;
  valorCuota: number;
  nombreEntidad: string;
  numeroIdentificacion: string;
  codigoPetro: number;
  numeroCuota: number;
  estado: string;
}

@Component({
  selector: 'app-cuota-consulta',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCardModule,
    MatTooltipModule, MatProgressSpinnerModule, MatSelectModule
  ],
  templateUrl: './cuota-consulta.component.html',
  styleUrls: ['./cuota-consulta.component.scss']
})
export class CuotaConsultaComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  loading = signal<boolean>(false);
  error = signal<string>('');
  busquedaRealizada = signal<boolean>(false);
  filtrosSecundariosExpandidos = signal<boolean>(false);

  allCuotas: CuotaDisplay[] = [];
  dataSource = new MatTableDataSource<CuotaDisplay>([]);
  displayedColumns = ['numeroPrestamo', 'tipoPrestamo', 'numeroCuota', 'fechaVencimiento', 'valorCuota', 'nombreEntidad', 'numeroIdentificacion', 'codigoPetro', 'estado', 'acciones'];

  meses = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
  ];

  anios: number[] = [];

  filtrosForm = new FormGroup({
    mes: new FormControl<number>(new Date().getMonth() + 1),
    anio: new FormControl<number>(new Date().getFullYear()),
    numeroPrestamo: new FormControl<string>(''),
    nombreEntidad: new FormControl<string>(''),
    numeroIdentificacion: new FormControl<string>(''),
    codigoPetro: new FormControl<string>('')
  });

  constructor(
    private detallePrestamoService: DetallePrestamoService,
    private exportService: ExportService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource<CuotaDisplay>([]);
    this.inicializarAnios();
  }

  inicializarAnios(): void {
    const anioActual = new Date().getFullYear();
    for (let i = anioActual - 5; i <= anioActual + 5; i++) {
      this.anios.push(i);
    }
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.error.set('');

    const { mes, anio } = this.filtrosForm.value;

    if (!mes || !anio) {
      this.error.set('Debe seleccionar mes y año');
      this.loading.set(false);
      return;
    }

    this.detallePrestamoService.getByMesAnio(mes, anio).subscribe({
      next: (data) => {
        const detalles = (data || []).map(detalle => ({
          ...detalle,
          fechaVencimiento: this.convertirFecha(detalle.fechaVencimiento) as Date,
          fechaPagado: this.convertirFecha(detalle.fechaPagado) as Date,
          fechaRegistro: this.convertirFecha(detalle.fechaRegistro) as Date
        }));

        this.allCuotas = this.mapearDetallesACuotas(detalles);

        // Aplicar filtros secundarios
        this.aplicarFiltrosSecundarios();

        this.loading.set(false);
        this.busquedaRealizada.set(true);
      },
      error: (err) => {
        console.error('Error al cargar cuotas:', err);
        this.error.set('Error al cargar datos de cuotas');
        this.loading.set(false);
        this.busquedaRealizada.set(true);
      }
    });
  }

  private aplicarFiltrosSecundarios(): void {
    const { numeroPrestamo, nombreEntidad, numeroIdentificacion, codigoPetro } = this.filtrosForm.value;
    let cuotasFiltradas = [...this.allCuotas];

    // Filtrar por número de préstamo (búsqueda parcial)
    if (numeroPrestamo && numeroPrestamo.trim()) {
      const filtro = numeroPrestamo.trim().toLowerCase();
      cuotasFiltradas = cuotasFiltradas.filter(cuota =>
        cuota.numeroPrestamo.toString().toLowerCase().includes(filtro)
      );
    }

    // Filtrar por nombre de entidad (búsqueda parcial)
    if (nombreEntidad && nombreEntidad.trim()) {
      const filtro = nombreEntidad.trim().toLowerCase();
      cuotasFiltradas = cuotasFiltradas.filter(cuota =>
        cuota.nombreEntidad.toLowerCase().includes(filtro)
      );
    }

    // Filtrar por número de identificación (búsqueda parcial)
    if (numeroIdentificacion && numeroIdentificacion.trim()) {
      const filtro = numeroIdentificacion.trim().toLowerCase();
      cuotasFiltradas = cuotasFiltradas.filter(cuota =>
        cuota.numeroIdentificacion.toLowerCase().includes(filtro)
      );
    }

    // Filtrar por código petro (búsqueda parcial)
    if (codigoPetro && codigoPetro.trim()) {
      const filtro = codigoPetro.trim().toLowerCase();
      cuotasFiltradas = cuotasFiltradas.filter(cuota =>
        cuota.codigoPetro.toString().toLowerCase().includes(filtro)
      );
    }

    this.dataSource.data = cuotasFiltradas;
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private convertirFecha(fecha: any): Date | null {
    if (!fecha) return null;
    if (Array.isArray(fecha)) {
      const [year, month, day, hour = 0, minute = 0, second = 0, ms = 0] = fecha;
      return new Date(year, month - 1, day, hour, minute, second, ms);
    }
    if (fecha instanceof Date) return fecha;
    if (typeof fecha === 'string' || typeof fecha === 'number') {
      return new Date(fecha);
    }
    return null;
  }

  private mapearDetallesACuotas(detalles: DetallePrestamo[]): CuotaDisplay[] {
    return detalles.map(detalle => ({
      codigoDetalle: detalle.codigo,
      codigoPrestamo: detalle.prestamo?.codigo || 0,
      numeroPrestamo: detalle.prestamo?.idAsoprep || 0,
      tipoPrestamo: detalle.prestamo?.producto?.nombre || 'N/A',
      fechaVencimiento: detalle.fechaVencimiento,
      valorCuota: detalle.cuota,
      nombreEntidad: detalle.prestamo?.entidad?.razonSocial || detalle.prestamo?.entidad?.nombreComercial || 'N/A',
      numeroIdentificacion: detalle.prestamo?.entidad?.numeroIdentificacion || 'N/A',
      codigoPetro: detalle.prestamo?.entidad?.rolPetroComercial || 0,
      numeroCuota: detalle.numeroCuota,
      estado: this.obtenerEstadoCuota(detalle)
    }));
  }

  private obtenerEstadoCuota(detalle: DetallePrestamo): string {
    if (detalle.fechaPagado) return 'Pagada';

    const hoy = new Date();
    const fechaVencimiento = new Date(detalle.fechaVencimiento);

    if (fechaVencimiento < hoy) return 'Vencida';

    const diferenciaDias = Math.floor((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diferenciaDias <= 7) return 'Por vencer';

    return 'Pendiente';
  }

  aplicarFiltros(): void {
    // Si ya hay datos cargados, solo aplicar filtros secundarios
    if (this.allCuotas.length > 0 && this.busquedaRealizada()) {
      this.aplicarFiltrosSecundarios();
    } else {
      // Si no hay datos, cargar desde el backend
      this.cargarDatos();
    }
  }

  limpiarFiltros(): void {
    this.filtrosForm.patchValue({
      mes: new Date().getMonth() + 1,
      anio: new Date().getFullYear(),
      numeroPrestamo: '',
      nombreEntidad: '',
      numeroIdentificacion: '',
      codigoPetro: ''
    });
    this.allCuotas = [];
    this.dataSource.data = [];
    this.busquedaRealizada.set(false);
  }

  toggleFiltrosSecundarios(): void {
    this.filtrosSecundariosExpandidos.update(v => !v);
  }

  exportarCSV(): void {
    const rows = this.dataSource.data.map(c => ({
      'Nº Préstamo': c.numeroPrestamo,
      'Tipo Préstamo': c.tipoPrestamo,
      'Nº Cuota': c.numeroCuota,
      'Fecha Vencimiento': this.formatearFecha(c.fechaVencimiento),
      'Valor Cuota': c.valorCuota.toFixed(2),
      'Nombre Entidad': c.nombreEntidad,
      'Nº Identificación': c.numeroIdentificacion,
      'Código Petro': c.codigoPetro,
      'Estado': c.estado
    }));
    const headers = ['Nº Préstamo', 'Tipo Préstamo', 'Nº Cuota', 'Fecha Vencimiento', 'Valor Cuota', 'Nombre Entidad', 'Nº Identificación', 'Código Petro', 'Estado'];
    const dataKeys = ['Nº Préstamo', 'Tipo Préstamo', 'Nº Cuota', 'Fecha Vencimiento', 'Valor Cuota', 'Nombre Entidad', 'Nº Identificación', 'Código Petro', 'Estado'];
    this.exportService.exportToCSV(rows, 'cuotas-prestamos', headers, dataKeys);
  }

  exportarPDF(): void {
    const rows = this.dataSource.data.map(c => ({
      prestamo: c.numeroPrestamo.toString(),
      tipo: c.tipoPrestamo,
      cuota: c.numeroCuota.toString(),
      vencimiento: this.formatearFecha(c.fechaVencimiento),
      valor: c.valorCuota.toFixed(2),
      entidad: c.nombreEntidad,
      estado: c.estado
    }));

    const headers = ['Préstamo', 'Tipo', 'Cuota', 'Vencimiento', 'Valor', 'Entidad', 'Estado'];
    const dataKeys = ['prestamo', 'tipo', 'cuota', 'vencimiento', 'valor', 'entidad', 'estado'];

    const { mes, anio } = this.filtrosForm.value;
    const nombreMes = this.meses.find(m => m.valor === mes)?.nombre || '';
    const titulo = `Cuotas de Préstamos - ${nombreMes} ${anio}`;

    this.exportService.exportToPDF(rows, 'cuotas-prestamos', titulo, headers, dataKeys);
  }

  verDetallesPrestamo(codigoPrestamo: number): void {
    this.dialog.open(PrestamoDetalleDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { codigoPrestamo },
      panelClass: 'prestamo-detalle-dialog'
    });
  }

  private formatearFecha(fecha: Date | null): string {
    if (!fecha) return 'N/A';
    const d = new Date(fecha);
    const dia = d.getDate().toString().padStart(2, '0');
    const mes = (d.getMonth() + 1).toString().padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }
}
