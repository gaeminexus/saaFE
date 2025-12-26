import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { ContratoService } from '../../../service/contrato.service';
import { FilialService } from '../../../service/filial.service';
import { ExportService } from '../../../../../shared/services/export.service';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../shared/services/funciones-datos.service';
import { Contrato } from '../../../model/contrato';
import { Filial } from '../../../model/filial';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

@Component({
  selector: 'app-contrato-consulta',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCardModule,
    MatTooltipModule, MatProgressSpinnerModule, MatDatepickerModule, MatNativeDateModule,
    MatSelectModule
  ],
  templateUrl: './contrato-consulta.component.html',
  styleUrls: ['./contrato-consulta.component.scss']
})
export class ContratoConsultaComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  loading = signal<boolean>(false);
  error = signal<string>('');
  busquedaRealizada = signal<boolean>(false);
  filialesOptions = signal<Filial[]>([]);
  allContratos: Contrato[] = [];
  dataSource = new MatTableDataSource<Contrato>([]);
  displayedColumns = ['codigo', 'codigoEntidad', 'fechaInicio', 'filial', 'porcentajeIndividual', 'porcentajeJubilacion', 'estado', 'acciones'];

  filtrosPrincipalesExpandidos = true;

  filtrosForm = new FormGroup({
    codigo: new FormControl<number | null>(null),
    codigoEntidad: new FormControl<number | null>(null),
    filial: new FormControl<number | null>(null),
    fechaInicio: new FormControl<Date | null>(null),
    fechaFin: new FormControl<Date | null>(null)
  });

  constructor(
    private contratoService: ContratoService,
    private filialService: FilialService,
    private exportService: ExportService,
    private funcionesDatos: FuncionesDatosService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.dataSource = new MatTableDataSource<Contrato>([]);
    this.cargarFiliales();
  }

  cargarFiliales(): void {
    this.filialService.getAll().subscribe({
      next: (data) => this.filialesOptions.set(data || []),
      error: (err) => console.error('Error al cargar filiales:', err)
    });
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.error.set('');
    const criterios = this.buildCriterios();

    this.contratoService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        this.allContratos = (data || []).map(contrato => ({
          ...contrato,
          fechaInicio: this.convertirFecha(contrato.fechaInicio) as Date,
          fechaTerminacion: this.convertirFecha(contrato.fechaTerminacion) as Date,
          fechaAprobacion: this.convertirFecha(contrato.fechaAprobacion) as Date,
          fechaReporte: this.convertirFecha(contrato.fechaReporte) as Date,
          fechaRegistro: this.convertirFecha(contrato.fechaRegistro) as Date
        }));
        this.dataSource.data = this.allContratos;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading.set(false);
        this.busquedaRealizada.set(true);
      },
      error: (err) => {
        console.error('Error al cargar contratos:', err);
        this.error.set('Error al cargar datos');
        this.loading.set(false);
        this.busquedaRealizada.set(true);
      }
    });
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

  private buildCriterios(): DatosBusqueda[] {
    const criterios: DatosBusqueda[] = [];
    const { codigo, codigoEntidad, filial, fechaInicio, fechaFin } = this.filtrosForm.value;

    if (codigo) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatos.LONG,
        'codigo',
        codigo.toString(),
        TipoComandosBusqueda.IGUAL
      );
      criterios.push(db);
    }

    if (codigoEntidad) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatos.LONG,
        'entidad.codigo',
        codigoEntidad.toString(),
        TipoComandosBusqueda.IGUAL
      );
      criterios.push(db);
    }

    if (filial) {
      const db = new DatosBusqueda();
      db.asignaValorConCampoPadre(
        TipoDatos.LONG,
        'filial',
        'codigo',
        filial.toString(),
        TipoComandosBusqueda.IGUAL
      );
      criterios.push(db);
    }

    // Manejo de rango de fechas
    if (fechaInicio && fechaFin) {
      const fechaInicioFormateada = this.funcionesDatos.formatearFechaParaBackend(
        fechaInicio,
        TipoFormatoFechaBackend.SOLO_FECHA
      );
      const fechaFinFormateada = this.funcionesDatos.formatearFechaParaBackend(
        fechaFin,
        TipoFormatoFechaBackend.SOLO_FECHA
      );

      if (fechaInicioFormateada && fechaFinFormateada) {
        const db = new DatosBusqueda();
        db.asignaUnCampoConBetween(
          'fechaInicio',
          TipoDatos.DATE,
          fechaInicioFormateada,
          TipoComandosBusqueda.BETWEEN,
          fechaFinFormateada
        );
        criterios.push(db);
      }
    } else if (fechaInicio) {
      const fechaInicioFormateada = this.funcionesDatos.formatearFechaParaBackend(
        fechaInicio,
        TipoFormatoFechaBackend.SOLO_FECHA
      );

      if (fechaInicioFormateada) {
        const db = new DatosBusqueda();
        db.asignaUnCampoSinTrunc(
          TipoDatos.DATE,
          'fechaInicio',
          fechaInicioFormateada,
          TipoComandosBusqueda.MAYOR_IGUAL
        );
        criterios.push(db);
      }
    } else if (fechaFin) {
      const fechaFinFormateada = this.funcionesDatos.formatearFechaParaBackend(
        fechaFin,
        TipoFormatoFechaBackend.SOLO_FECHA
      );

      if (fechaFinFormateada) {
        const db = new DatosBusqueda();
        db.asignaUnCampoSinTrunc(
          TipoDatos.DATE,
          'fechaInicio',
          fechaFinFormateada,
          TipoComandosBusqueda.MENOR_IGUAL
        );
        criterios.push(db);
      }
    }

    return criterios;
  }

  aplicarFiltros(): void { this.cargarDatos(); }
  limpiarFiltros(): void {
    this.filtrosForm.reset();
    this.allContratos = [];
    this.dataSource.data = [];
    this.busquedaRealizada.set(false);
  }

  toggleFiltrosPrincipales(): void {
    this.filtrosPrincipalesExpandidos = !this.filtrosPrincipalesExpandidos;
  }

  exportarCSV(): void {
    const rows = this.dataSource.data.map(c => ({
      Código: c.codigo, 'Cód. Entidad': c.entidad.codigo, 'Fecha Inicio': c.fechaInicio,
      'Fecha Fin': c.fechaTerminacion || 'N/A', Filial: c.filial?.nombre || 'N/A',
      '% Individual': c.porcentajeAporteIndividual || 0, '% Jubilación': c.porcentajeAporteJubilacion || 0,
      Estado: c.estado || 'Activo'
    }));
    const headers = ['Código', 'Cód. Entidad', 'Fecha Inicio', 'Fecha Fin', 'Filial', '% Individual', '% Jubilación', 'Estado'];
    const dataKeys = ['Código', 'Cód. Entidad', 'Fecha Inicio', 'Fecha Fin', 'Filial', '% Individual', '% Jubilación', 'Estado'];
    this.exportService.exportToCSV(rows, 'contratos', headers, dataKeys);
  }

  exportarPDF(): void {
    const rows = this.dataSource.data.map(c => ({
      codigo: c.codigo.toString(),
      entidad: c.entidad.codigo.toString(),
      inicio: c.fechaInicio || '',
      filial: c.filial?.nombre || 'N/A',
      individual: (c.porcentajeAporteIndividual || 0).toString(),
      jubilacion: (c.porcentajeAporteJubilacion || 0).toString(),
      estado: c.estado || 'Activo'
    }));

    const headers = ['Código', 'Entidad', 'Inicio', 'Filial', '% Ind', '% Jub', 'Estado'];
    const dataKeys = ['codigo', 'entidad', 'inicio', 'filial', 'individual', 'jubilacion', 'estado'];

    this.exportService.exportToPDF(rows, 'contratos', 'Consulta de Contratos', headers, dataKeys);
  }

  editar(codigo: number): void {
    this.router.navigate(['/menucontabilidad/menucreditos/contrato-edit', codigo]);
  }

  nuevo(): void {
    this.router.navigate(['/menucontabilidad/menucreditos/contrato-edit']);
  }
}
