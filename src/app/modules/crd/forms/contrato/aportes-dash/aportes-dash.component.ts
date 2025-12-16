import { Component, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { AporteService } from '../../../service/aporte.service';
import { EntidadService } from '../../../service/entidad.service';
import { TipoAporteService } from '../../../service/tipo-aporte.service';
import { ExportService } from '../../../../../shared/services/export.service';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../shared/services/funciones-datos.service';
import { Aporte } from '../../../model/aporte';
import { Entidad } from '../../../model/entidad';
import { TipoAporte } from '../../../model/tipo-aporte';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

interface AportePorTipo {
  tipo: TipoAporte;
  aportes: Aporte[];
  total: number;
  totalMonto: number;
}

@Component({
  selector: 'app-aportes-dash',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule
  ],
  templateUrl: './aportes-dash.component.html',
  styleUrls: ['./aportes-dash.component.scss']
})
export class AportesDashComponent implements OnInit {
  @ViewChild('dashContainer') dashContainer!: ElementRef;

  loading = signal<boolean>(false);
  error = signal<string>('');
  entidad = signal<Entidad | null>(null);
  aportes = signal<Aporte[]>([]);
  tiposAporte = signal<TipoAporte[]>([]);
  aportesPorTipo = signal<AportePorTipo[]>([]);

  totalAportes = signal<number>(0);
  totalMonto = signal<number>(0);
  isScrolled = signal<boolean>(false);

  codigoEntidad: number = 0;

  filtrosForm = new FormGroup({
    anio: new FormControl<number | null>(null),
    mes: new FormControl<number | null>(null),
    tipoAporte: new FormControl<number | null>(null)
  });

  anios: number[] = [];
  meses = [
    { value: 1, nombre: 'Enero' }, { value: 2, nombre: 'Febrero' }, { value: 3, nombre: 'Marzo' },
    { value: 4, nombre: 'Abril' }, { value: 5, nombre: 'Mayo' }, { value: 6, nombre: 'Junio' },
    { value: 7, nombre: 'Julio' }, { value: 8, nombre: 'Agosto' }, { value: 9, nombre: 'Septiembre' },
    { value: 10, nombre: 'Octubre' }, { value: 11, nombre: 'Noviembre' }, { value: 12, nombre: 'Diciembre' }
  ];

  displayedColumns = ['codigo', 'fecha', 'monto', 'tipo', 'estado'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private aporteService: AporteService,
    private entidadService: EntidadService,
    private tipoAporteService: TipoAporteService,
    private exportService: ExportService,
    private funcionesDatos: FuncionesDatosService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.codigoEntidad = +params['codigoEntidad'];
      if (this.codigoEntidad) {
        this.cargarEntidad();
        this.cargarTiposAporte();
        this.cargarAportes();
        this.generarAnios();
      }
    });
    this.setupScrollDetection();
  }

  generarAnios(): void {
    const anioActual = new Date().getFullYear();
    this.anios = Array.from({ length: 10 }, (_, i) => anioActual - i);
  }

  cargarEntidad(): void {
    this.entidadService.getById(this.codigoEntidad.toString()).subscribe({
      next: (data) => this.entidad.set(data),
      error: (err) => {
        console.error('Error al cargar entidad:', err);
        this.error.set('Error al cargar información de la entidad');
      }
    });
  }

  cargarTiposAporte(): void {
    this.tipoAporteService.getAll().subscribe({
      next: (data) => this.tiposAporte.set(data || []),
      error: (err) => console.error('Error al cargar tipos de aporte:', err)
    });
  }

  cargarAportes(): void {
    this.loading.set(true);
    this.error.set('');

    const criterios = this.buildCriterios();

    this.aporteService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        this.aportes.set(data || []);
        this.calcularTotales(data || []);
        this.clasificarPorTipo(data || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar aportes:', err);
        this.error.set('Error al cargar aportes de la entidad');
        this.loading.set(false);
      }
    });
  }

  private buildCriterios(): DatosBusqueda[] {
    const criterios: DatosBusqueda[] = [];

    // Filtro obligatorio por entidad
    const dbEntidad = new DatosBusqueda();
    dbEntidad.asignaUnCampoSinTrunc(
      TipoDatos.LONG,
      'entidad.codigo',
      this.codigoEntidad.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(dbEntidad);

    const { anio, mes, tipoAporte } = this.filtrosForm.value;

    if (anio) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatos.INTEGER,
        'anio',
        anio.toString(),
        TipoComandosBusqueda.IGUAL
      );
      criterios.push(db);
    }

    if (mes) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatos.INTEGER,
        'mes',
        mes.toString(),
        TipoComandosBusqueda.IGUAL
      );
      criterios.push(db);
    }

    if (tipoAporte) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatos.LONG,
        'tipoAporte.codigo',
        tipoAporte.toString(),
        TipoComandosBusqueda.IGUAL
      );
      criterios.push(db);
    }

    return criterios;
  }

  private calcularTotales(aportes: Aporte[]): void {
    this.totalAportes.set(aportes.length);
    this.totalMonto.set(aportes.reduce((sum, a) => sum + (a.valor || 0), 0));
  }

  private clasificarPorTipo(aportes: Aporte[]): void {
    const clasificacion: AportePorTipo[] = this.tiposAporte().map(tipo => {
      const aportesTipo = aportes.filter(a => a.tipoAporte?.codigo === tipo.codigo);
      return {
        tipo,
        aportes: aportesTipo,
        total: aportesTipo.length,
        totalMonto: aportesTipo.reduce((sum, a) => sum + (a.valor || 0), 0)
      };
    });

    clasificacion.sort((a, b) => b.totalMonto - a.totalMonto);
    this.aportesPorTipo.set(clasificacion);
  }

  aplicarFiltros(): void { this.cargarAportes(); }
  limpiarFiltros(): void { this.filtrosForm.reset(); this.cargarAportes(); }
  volver(): void { this.router.navigate(['/menucontabilidad/menucreditos/contrato-dash']); }

  exportarCSV(): void {
    const rows = this.aportes().map(a => ({
      Código: a.codigo, Fecha: a.fechaTransaccion, Monto: a.valor,
      'Tipo Aporte': a.tipoAporte?.codigo || '', Estado: a.estado || 1,
      Glosa: a.glosa || ''
    }));
    const headers = ['Código', 'Fecha', 'Monto', 'Tipo Aporte', 'Estado', 'Glosa'];
    const dataKeys = ['Código', 'Fecha', 'Monto', 'Tipo Aporte', 'Estado', 'Glosa'];
    const filename = `aportes-entidad-${this.codigoEntidad}-${new Date().toISOString().split('T')[0]}`;
    this.exportService.exportToCSV(rows, filename, headers, dataKeys);
  }

  exportarPDF(): void {
    const rows = this.aportes().map(a => ({
      codigo: a.codigo.toString(),
      fecha: a.fechaTransaccion?.toString() || '',
      monto: (a.valor || 0).toString(),
      tipo: a.tipoAporte?.codigo?.toString() || '',
      estado: (a.estado || 1).toString()
    }));

    const headers = ['Código', 'Fecha', 'Monto', 'Tipo', 'Estado'];
    const dataKeys = ['codigo', 'fecha', 'monto', 'tipo', 'estado'];
    const titulo = `Aportes - ${this.entidad()?.razonSocial || 'Entidad'}`;
    const filename = `aportes-entidad-${this.codigoEntidad}-${new Date().toISOString().split('T')[0]}`;

    this.exportService.exportToPDF(rows, filename, titulo, headers, dataKeys);
  }

  private setupScrollDetection(): void {
    setTimeout(() => {
      if (this.dashContainer) {
        this.dashContainer.nativeElement.addEventListener('scroll', () => {
          this.isScrolled.set(this.dashContainer.nativeElement.scrollTop > 100);
        });
      }
    }, 100);
  }

  scrollToTop(): void {
    this.dashContainer?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getTipoPorcentaje(total: number): number {
    return this.totalAportes() > 0 ? (total / this.totalAportes()) * 100 : 0;
  }
}
