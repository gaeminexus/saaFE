import { Component, OnInit, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { ContratoService } from '../../../service/contrato.service';
import { EntidadService } from '../../../service/entidad.service';
import { AporteService } from '../../../service/aporte.service';
import { ExportService } from '../../../../../shared/services/export.service';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../shared/services/funciones-datos.service';
import { Contrato } from '../../../model/contrato';
import { Entidad } from '../../../model/entidad';
import { Aporte } from '../../../model/aporte';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

interface ContratoMetrics {
  soloIndividual: number;
  soloJubilacion: number;
  ambos: number;
  total: number;
}

interface EntidadConAportes {
  entidad: Entidad;
  aportes: Aporte[];
  totalAportes: number;
  expanded: boolean;
}

interface TipoContratos {
  tipo: 'soloIndividual' | 'soloJubilacion' | 'ambos';
  contratos: Contrato[];
  entidades: EntidadConAportes[];
  expanded: boolean;
}

@Component({
  selector: 'app-contrato-dash',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatTooltipModule
  ],
  templateUrl: './contrato-dash.component.html',
  styleUrls: ['./contrato-dash.component.scss']
})
export class ContratoDashComponent implements OnInit {
  @ViewChild('dashContainer') dashContainer!: ElementRef;

  // Signals
  loading = signal<boolean>(false);
  error = signal<string>('');
  contratos = signal<Contrato[]>([]);
  metrics = signal<ContratoMetrics>({ soloIndividual: 0, soloJubilacion: 0, ambos: 0, total: 0 });

  // Tipos de contratos con entidades
  soloIndividualData = signal<TipoContratos>({ tipo: 'soloIndividual', contratos: [], entidades: [], expanded: false });
  soloJubilacionData = signal<TipoContratos>({ tipo: 'soloJubilacion', contratos: [], entidades: [], expanded: false });
  ambosData = signal<TipoContratos>({ tipo: 'ambos', contratos: [], entidades: [], expanded: false });

  isScrolled = signal<boolean>(false);

  // Formulario de filtros de fecha
  rangoFechas = new FormGroup({
    inicio: new FormControl<Date | null>(null),
    fin: new FormControl<Date | null>(null)
  });

  // Columnas de tabla
  displayedColumns = ['codigo', 'nombre', 'filial', 'fechaInicio', 'estado', 'acciones'];

  constructor(
    private contratoService: ContratoService,
    private entidadService: EntidadService,
    private aporteService: AporteService,
    private exportService: ExportService,
    private funcionesDatos: FuncionesDatosService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
    this.setupScrollDetection();
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.error.set('');

    const criterios = this.buildCriterios();

    this.contratoService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        // Convertir fechas que puedan venir en formato array desde el backend
        const contratosConFechas = (data || []).map(contrato => ({
          ...contrato,
          fechaInicio: this.convertirFecha(contrato.fechaInicio) || contrato.fechaInicio,
          fechaTerminacion: this.convertirFecha(contrato.fechaTerminacion) || contrato.fechaTerminacion,
          fechaAprobacion: this.convertirFecha(contrato.fechaAprobacion) || contrato.fechaAprobacion,
          fechaReporte: this.convertirFecha(contrato.fechaReporte) || contrato.fechaReporte,
          fechaRegistro: this.convertirFecha(contrato.fechaRegistro) || contrato.fechaRegistro
        }));

        this.contratos.set(contratosConFechas);
        this.clasificarContratos(contratosConFechas);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar contratos:', err);
        this.error.set('Error al cargar datos de contratos');
        this.loading.set(false);
      }
    });
  }

  private buildCriterios(): DatosBusqueda[] {
    const criterios: DatosBusqueda[] = [];

    const inicio = this.rangoFechas.value.inicio;
    const fin = this.rangoFechas.value.fin;

    if (inicio && fin) {
      const fechaInicioFormateada = this.funcionesDatos.formatearFechaParaBackend(
        inicio,
        TipoFormatoFechaBackend.SOLO_FECHA
      );
      const fechaFinFormateada = this.funcionesDatos.formatearFechaParaBackend(
        fin,
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
    } else if (inicio) {
      const fechaInicioFormateada = this.funcionesDatos.formatearFechaParaBackend(
        inicio,
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
    } else if (fin) {
      const fechaFinFormateada = this.funcionesDatos.formatearFechaParaBackend(
        fin,
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
  }  private clasificarContratos(contratos: Contrato[]): void {
    const soloIndividual: Contrato[] = [];
    const soloJubilacion: Contrato[] = [];
    const ambos: Contrato[] = [];

    contratos.forEach(contrato => {
      const tieneIndividual = (contrato.porcentajeAporteIndividual || 0) > 0;
      const tieneJubilacion = (contrato.porcentajeAporteJubilacion || 0) > 0;

      if (tieneIndividual && tieneJubilacion) {
        ambos.push(contrato);
      } else if (tieneIndividual) {
        soloIndividual.push(contrato);
      } else if (tieneJubilacion) {
        soloJubilacion.push(contrato);
      }
    });

    this.metrics.set({
      soloIndividual: soloIndividual.length,
      soloJubilacion: soloJubilacion.length,
      ambos: ambos.length,
      total: contratos.length
    });

    this.soloIndividualData.set({ tipo: 'soloIndividual', contratos: soloIndividual, entidades: [], expanded: false });
    this.soloJubilacionData.set({ tipo: 'soloJubilacion', contratos: soloJubilacion, entidades: [], expanded: false });
    this.ambosData.set({ tipo: 'ambos', contratos: ambos, entidades: [], expanded: false });
  }

  async toggleExpand(tipo: 'soloIndividual' | 'soloJubilacion' | 'ambos'): Promise<void> {
    const dataSignal = tipo === 'soloIndividual' ? this.soloIndividualData :
                       tipo === 'soloJubilacion' ? this.soloJubilacionData :
                       this.ambosData;

    const currentData = dataSignal();

    if (!currentData.expanded && currentData.entidades.length === 0) {
      // Cargar entidades y aportes
      await this.cargarEntidadesYAportes(tipo);
    }

    dataSignal.set({ ...currentData, expanded: !currentData.expanded });
  }

  private async cargarEntidadesYAportes(tipo: 'soloIndividual' | 'soloJubilacion' | 'ambos'): Promise<void> {
    const dataSignal = tipo === 'soloIndividual' ? this.soloIndividualData :
                       tipo === 'soloJubilacion' ? this.soloJubilacionData :
                       this.ambosData;

    const currentData = dataSignal();
    const codigosEntidad = [...new Set(currentData.contratos.map(c => c.entidad.codigo))];

    try {
      const entidadesPromises = codigosEntidad.map(codigo =>
        this.entidadService.getById(codigo.toString()).toPromise()
      );

      const entidades = (await Promise.all(entidadesPromises)).filter(e => e != null) as Entidad[];

      const entidadesConAportes: EntidadConAportes[] = [];

      for (const entidad of entidades) {
        const criterios: DatosBusqueda[] = [];
        const db = new DatosBusqueda();
        db.asignaUnCampoSinTrunc(
          TipoDatos.LONG,
          'entidad.codigo',
          entidad.codigo.toString(),
          TipoComandosBusqueda.IGUAL
        );
        criterios.push(db);

        const aportesRaw = await this.aporteService.selectByCriteria(criterios).toPromise() || [];

        // Convertir fechas de aportes
        const aportes = aportesRaw.map(aporte => ({
          ...aporte,
          fechaTransaccion: this.convertirFecha(aporte.fechaTransaccion) || aporte.fechaTransaccion,
          fechaRegistro: this.convertirFecha(aporte.fechaRegistro) || aporte.fechaRegistro
        }));

        entidadesConAportes.push({
          entidad,
          aportes,
          totalAportes: aportes.length,
          expanded: false
        });
      }

      dataSignal.set({ ...currentData, entidades: entidadesConAportes });
    } catch (error) {
      console.error('Error al cargar entidades y aportes:', error);
      this.error.set('Error al cargar detalles de entidades');
    }
  }

  toggleEntidadExpand(tipo: 'soloIndividual' | 'soloJubilacion' | 'ambos', index: number): void {
    const dataSignal = tipo === 'soloIndividual' ? this.soloIndividualData :
                       tipo === 'soloJubilacion' ? this.soloJubilacionData :
                       this.ambosData;

    const currentData = dataSignal();
    const entidades = [...currentData.entidades];
    entidades[index] = { ...entidades[index], expanded: !entidades[index].expanded };

    dataSignal.set({ ...currentData, entidades });
  }

  verAportes(codigoEntidad: number): void {
    this.router.navigate(['/menucontabilidad/menucreditos/aportes-dash', codigoEntidad]);
  }

  editarContrato(codigo: number): void {
    this.router.navigate(['/menucontabilidad/menucreditos/contrato-edit', codigo]);
  }

  aplicarFiltros(): void {
    this.cargarDatos();
  }

  limpiarFiltros(): void {
    this.rangoFechas.reset();
    this.cargarDatos();
  }

  exportarCSV(tipo: 'soloIndividual' | 'soloJubilacion' | 'ambos'): void {
    const dataSignal = tipo === 'soloIndividual' ? this.soloIndividualData :
                       tipo === 'soloJubilacion' ? this.soloJubilacionData :
                       this.ambosData;

    const data = dataSignal().contratos;

    const rows = data.map(c => ({
      Código: c.codigo,
      'Código Entidad': c.entidad.codigo,
      'Fecha Inicio': c.fechaInicio,
      'Fecha Fin': c.fechaTerminacion || 'N/A',
      'Filial': c.filial?.nombre || 'N/A',
      '% Individual': c.porcentajeAporteIndividual || 0,
      '% Jubilación': c.porcentajeAporteJubilacion || 0,
      Estado: c.estado || 'Activo',
      Observación: c.observacion || ''
    }));

    const headers = ['Código', 'Código Entidad', 'Fecha Inicio', 'Fecha Fin', 'Filial', '% Individual', '% Jubilación', 'Estado', 'Observación'];
    const dataKeys = ['Código', 'Código Entidad', 'Fecha Inicio', 'Fecha Fin', 'Filial', '% Individual', '% Jubilación', 'Estado', 'Observación'];
    const filename = `contratos-${tipo}-${new Date().toISOString().split('T')[0]}`;
    this.exportService.exportToCSV(rows, filename, headers, dataKeys);
  }

  exportarPDF(tipo: 'soloIndividual' | 'soloJubilacion' | 'ambos'): void {
    const dataSignal = tipo === 'soloIndividual' ? this.soloIndividualData :
                       tipo === 'soloJubilacion' ? this.soloJubilacionData :
                       this.ambosData;

    const data = dataSignal().contratos;
    const rows = data.map(c => ({
      codigo: c.codigo.toString(),
      entidad: c.entidad.codigo.toString(),
      inicio: c.fechaInicio || '',
      filial: c.filial?.nombre || 'N/A',
      individual: (c.porcentajeAporteIndividual || 0).toString(),
      jubilacion: (c.porcentajeAporteJubilacion || 0).toString(),
      estado: c.estado || 'Activo'
    }));

    const titulo = tipo === 'soloIndividual' ? 'Contratos Solo Aporte Individual' :
                   tipo === 'soloJubilacion' ? 'Contratos Solo Aporte Jubilación' :
                   'Contratos Ambos Aportes';

    const filename = `contratos-${tipo}-${new Date().toISOString().split('T')[0]}`;
    const headers = ['Código', 'Cód. Entidad', 'Fecha Inicio', 'Filial', '% Ind.', '% Jub.', 'Estado'];
    const dataKeys = ['codigo', 'entidad', 'inicio', 'filial', 'individual', 'jubilacion', 'estado'];

    this.exportService.exportToPDF(rows, filename, titulo, headers, dataKeys);
  }

  private setupScrollDetection(): void {
    setTimeout(() => {
      if (this.dashContainer) {
        const container = this.dashContainer.nativeElement;
        container.addEventListener('scroll', () => {
          const scrollTop = container.scrollTop;
          this.isScrolled.set(scrollTop > 100);
        });
      }
    }, 100);
  }

  scrollToTop(): void {
    if (this.dashContainer) {
      this.dashContainer.nativeElement.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
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
      const [year, month, day, hour = 0, minute = 0, second = 0, nanoseconds = 0] = fecha;
      // Convertir nanosegundos a milisegundos
      const ms = Math.floor(nanoseconds / 1000000);
      // Nota: los meses en JavaScript Date van de 0-11, pero el backend envía 1-12
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
