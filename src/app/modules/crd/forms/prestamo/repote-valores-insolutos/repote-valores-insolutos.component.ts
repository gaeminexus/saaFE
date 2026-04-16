import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';

import { DetallePrestamo } from '../../../model/detalle-prestamo';
import { Exter } from '../../../model/exter';
import { DetallePrestamoService } from '../../../service/detalle-prestamo.service';
import { ExterService } from '../../../service/exter.service';
import { ExportService } from '../../../../../shared/services/export.service';

interface ReporteValorInsolutoRow {
  apellido1: string;
  apellido2: string;
  nombre: string;
  fechaNacimiento: string;
  sexo: string;
  tipoDocumento: string;
  numeroCedula: string;
  fechaPrestamo: string;
  saldoInsolutoAbril: number;
  tipo: string;
}

@Component({
  selector: 'app-repote-valores-insolutos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './repote-valores-insolutos.component.html',
  styleUrls: ['./repote-valores-insolutos.component.scss'],
})
export class RepoteValoresInsolutosComponent implements OnInit {
  private readonly ESTADO_CUOTA_PAGADA = 4;
  private readonly ESTADO_CUOTA_CANCELADA_ANTICIPADA = 7;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  loading = signal<boolean>(false);
  error = signal<string>('');
  busquedaRealizada = signal<boolean>(false);
  filtrosPrincipalesExpandidos = signal<boolean>(true);

  displayedColumns: string[] = [
    'apellido1',
    'apellido2',
    'nombre',
    'fechaNacimiento',
    'sexo',
    'tipoDocumento',
    'numeroCedula',
    'fechaPrestamo',
    'saldoInsolutoAbril',
    'tipo',
  ];

  dataSource = new MatTableDataSource<ReporteValorInsolutoRow>([]);

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
    { valor: 12, nombre: 'Diciembre' },
  ];

  anios: number[] = [];

  filtrosForm = new FormGroup({
    mes: new FormControl<number>(new Date().getMonth() + 1, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    anio: new FormControl<number>(new Date().getFullYear(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor(
    private detallePrestamoService: DetallePrestamoService,
    private exterService: ExterService,
    private exportService: ExportService,
  ) {}

  ngOnInit(): void {
    this.inicializarAnios();
  }

  inicializarAnios(): void {
    const anioActual = new Date().getFullYear();
    for (let i = anioActual - 10; i <= anioActual + 1; i++) {
      this.anios.push(i);
    }
  }

  consultar(): void {
    const { mes, anio } = this.filtrosForm.getRawValue();

    if (!mes || !anio) {
      this.error.set('Debe seleccionar mes y año.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    forkJoin({
      detalles: this.detallePrestamoService.getByMesAnio(mes, anio),
      exters: this.exterService.getAll(),
    }).subscribe({
      next: ({ detalles, exters }) => {
        const rows = this.construirFilas(detalles || [], exters || []);
        this.dataSource.data = rows;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading.set(false);
        this.busquedaRealizada.set(true);
      },
      error: (err) => {
        console.error('Error al consultar reporte de valores insolutos:', err);
        this.error.set('No se pudo consultar la información. Intente nuevamente.');
        this.loading.set(false);
        this.busquedaRealizada.set(true);
      },
    });
  }

  limpiar(): void {
    this.filtrosForm.setValue({
      mes: new Date().getMonth() + 1,
      anio: new Date().getFullYear(),
    });
    this.dataSource.data = [];
    this.error.set('');
    this.busquedaRealizada.set(false);
  }

  toggleFiltrosPrincipales(): void {
    this.filtrosPrincipalesExpandidos.update((v) => !v);
  }

  get totalRegistros(): number {
    return this.dataSource.data.length;
  }

  get nombreMesSeleccionado(): string {
    const mes = this.filtrosForm.getRawValue().mes;
    return this.meses.find((item) => item.valor === mes)?.nombre || 'N/A';
  }

  exportarCSV(): void {
    const rows = this.dataSource.data.map((row) => ({
      Apellido_1: row.apellido1,
      Apellido_2: row.apellido2,
      Nombre: row.nombre,
      Fecha_Nacmto: row.fechaNacimiento,
      Sexo: row.sexo,
      Tipo_Dcmto: row.tipoDocumento,
      Nro_Cedula: row.numeroCedula,
      Fecha_Prestamo: row.fechaPrestamo,
      'Saldo Insoluto Abril': row.saldoInsolutoAbril,
      Tipo: row.tipo,
    }));

    const headers = [
      'Apellido_1',
      'Apellido_2',
      'Nombre',
      'Fecha_Nacmto',
      'Sexo',
      'Tipo_Dcmto',
      'Nro_Cedula',
      'Fecha_Prestamo',
      'Saldo Insoluto Abril',
      'Tipo',
    ];

    this.exportService.exportToCSV(rows, 'reporte-valores-insolutos', headers, headers);
  }

  exportarPDF(): void {
    const rows = this.dataSource.data.map((row) => ({
      apellido1: row.apellido1,
      apellido2: row.apellido2,
      nombre: row.nombre,
      fechaNacimiento: row.fechaNacimiento,
      sexo: row.sexo,
      tipoDocumento: row.tipoDocumento,
      numeroCedula: row.numeroCedula,
      fechaPrestamo: row.fechaPrestamo,
      saldoInsolutoAbril: row.saldoInsolutoAbril.toFixed(2),
      tipo: row.tipo,
    }));

    const headers = [
      'Apellido_1',
      'Apellido_2',
      'Nombre',
      'Fecha_Nacmto',
      'Sexo',
      'Tipo_Dcmto',
      'Nro_Cedula',
      'Fecha_Prestamo',
      'Saldo Insoluto Abril',
      'Tipo',
    ];

    const dataKeys = [
      'apellido1',
      'apellido2',
      'nombre',
      'fechaNacimiento',
      'sexo',
      'tipoDocumento',
      'numeroCedula',
      'fechaPrestamo',
      'saldoInsolutoAbril',
      'tipo',
    ];

    this.exportService.exportToPDF(
      rows,
      'reporte-valores-insolutos',
      'Reporte Valores Insolutos',
      headers,
      dataKeys,
    );
  }

  private construirFilas(detalles: DetallePrestamo[], exters: Exter[]): ReporteValorInsolutoRow[] {
    const exterPorCedula = new Map<string, Exter>(
      exters
        .filter((item) => !!item?.cedula)
        .map((item) => [this.normalizarCedula(item.cedula), item]),
    );

    return detalles
      .filter((detalle) => !!detalle?.prestamo?.entidad)
      .filter((detalle) => detalle.estado !== this.ESTADO_CUOTA_PAGADA)
      .filter((detalle) => detalle.estado !== this.ESTADO_CUOTA_CANCELADA_ANTICIPADA)
      .map((detalle) => {
        const entidad = detalle.prestamo!.entidad;
        const cedula = entidad.numeroIdentificacion || '';
        const exter = exterPorCedula.get(this.normalizarCedula(cedula));
        const nombreSplit = this.separarNombreCompleto(entidad.razonSocial || entidad.nombreComercial || '');

        return {
          apellido1: nombreSplit.apellido1,
          apellido2: nombreSplit.apellido2,
          nombre: nombreSplit.nombre,
          fechaNacimiento: this.formatearFecha(exter?.fechaNacimiento),
          sexo: this.mapearSexo(exter?.genero),
          tipoDocumento: 'cedula',
          numeroCedula: cedula,
          fechaPrestamo: this.formatearFecha(detalle.prestamo?.fecha),
          saldoInsolutoAbril: Number(detalle.saldoCapital || 0),
          tipo: detalle.prestamo?.producto?.codigoSBS || '',
        };
      });
  }

  private mapearSexo(genero: string | undefined): string {
    const valor = (genero || '').toUpperCase().trim();
    if (valor === 'HOMBRE' || valor === 'M' || valor === 'MASCULINO') return 'M';
    if (valor === 'MUJER' || valor === 'F' || valor === 'FEMENINO') return 'F';
    return valor;
  }

  private separarNombreCompleto(valor: string): { apellido1: string; apellido2: string; nombre: string } {
    const partes = (valor || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const apellido1 = partes[0] || '';
    const apellido2 = partes[1] || '';
    const nombre = partes.length > 2 ? partes.slice(2).join(' ') : '';

    return { apellido1, apellido2, nombre };
  }

  private normalizarCedula(cedula: string): string {
    return (cedula || '').replace(/[^0-9A-Za-z]/g, '').trim().toUpperCase();
  }

  private formatearFecha(fecha: unknown): string {
    if (!fecha) {
      return '';
    }

    const fechaConvertida = this.convertirFecha(fecha);
    if (!fechaConvertida) {
      return '';
    }

    const dia = fechaConvertida.getDate().toString().padStart(2, '0');
    const mes = (fechaConvertida.getMonth() + 1).toString().padStart(2, '0');
    const anio = fechaConvertida.getFullYear();

    return `${dia}/${mes}/${anio}`;
  }

  private convertirFecha(fecha: unknown): Date | null {
    if (!fecha) {
      return null;
    }

    if (fecha instanceof Date) {
      return fecha;
    }

    if (Array.isArray(fecha)) {
      const [year, month, day, hour = 0, minute = 0, second = 0, nanoseconds = 0] = fecha;
      const milisegundos = Math.floor(nanoseconds / 1000000);
      return new Date(year, month - 1, day, hour, minute, second, milisegundos);
    }

    if (typeof fecha === 'string' || typeof fecha === 'number') {
      const parseada = new Date(fecha);
      return Number.isNaN(parseada.getTime()) ? null : parseada;
    }

    return null;
  }
}
