import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { ExportService } from '../../../../../shared/services/export.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { HoraExtra } from '../../../model/hora-extra';
import { PeriodoNomina } from '../../../model/periodo-nomina';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { HoraExtraService } from '../../../service/hora-extra.service';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import {
  aniosDisponibles,
  filtrarPorAnio,
  criteriosPorEmpresa,
} from '../../parametrizacion/utiles-parametrizacion';
import { APROBACION_HORAS_EXTRA_DISPONIBLE } from '../compuertas';
import { opcionesAviso } from '../../comunes/avisos';

/**
 * Bandeja de aprobación de horas extra (RHH.HREX).
 *
 * Solo las aprobadas entran en el cálculo del período. Las que exceden el tope legal —máximos
 * por día y por semana, parametrizados en `RHH.PRNM`— llegan marcadas por el backend y se
 * destacan aquí: aprobarlas es una decisión excepcional y debe verse como tal.
 *
 * **La aprobación está tras compuerta**: `POST /rest/hrex/aprobar` es de la fase 7 y hoy el
 * backend solo expone el CRUD de `hrex`. Consultar y revisar sí funciona.
 */
@Component({
  selector: 'app-horas-extra',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './horas-extra.component.html',
  styleUrls: ['./horas-extra.component.scss'],
})
export class HorasExtraComponent implements OnInit {
  columnas = ['seleccion', 'empleado', 'fecha', 'tipo', 'horas', 'valor', 'estado'];

  anios = aniosDisponibles();
  anio = signal<number>(new Date().getFullYear());
  periodos = signal<PeriodoNomina[]>([]);
  periodoSeleccionado = signal<number | null>(null);
  horas = signal<any[]>([]);
  seleccionadas = signal<Set<number>>(new Set());
  cargando = signal<boolean>(false);
  ocupado = signal<boolean>(false);

  pendientes = computed(() => this.horas().filter((h) => h.aprobada !== 'S'));
  excedenTope = computed(() => this.horas().filter((h) => h.excedeTope === 'S').length);
  haySeleccion = computed(() => this.seleccionadas().size > 0);

  /** Expuesto a la plantilla: sin el endpoint, aprobar solo produciría un 404. */
  aprobacionDisponible = APROBACION_HORAS_EXTRA_DISPONIBLE;

  constructor(
    private horaExtraService: HoraExtraService,
    private periodoService: PeriodoNominaService,
    private detalleRubroService: DetalleRubroService,
    private exportService: ExportService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarPeriodos();
  }

  onAnioChange(anio: number): void {
    this.anio.set(anio);
    this.periodoSeleccionado.set(null);
    this.horas.set([]);
    this.cargarPeriodos();
  }

  private cargarPeriodos(): void {
    this.periodoService.selectByCriteria(criteriosPorEmpresa('mes')).subscribe({
      next: (data) => this.periodos.set(filtrarPorAnio(data, this.anio())),
      error: () => {
        this.periodos.set([]);
        this.avisar('No se pudieron cargar los períodos de nómina', true);
      },
    });
  }

  onPeriodoChange(codigo: number | null): void {
    this.periodoSeleccionado.set(codigo);
    this.seleccionadas.set(new Set());

    if (codigo === null) {
      this.horas.set([]);
      return;
    }

    this.cargando.set(true);
    this.horaExtraService.selectByCriteria(this.criterios(codigo)).subscribe({
      next: (data) => {
        this.cargando.set(false);
        this.horas.set(this.formatear(data ?? []));
      },
      error: () => {
        this.cargando.set(false);
        this.horas.set([]);
        this.avisar('No se pudieron cargar las horas extra del período', true);
      },
    });
  }

  private criterios(idPeriodo: number): DatosBusqueda[] {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'periodoNomina',
      'codigo',
      idPeriodo.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    const orden = new DatosBusqueda();
    orden.orderBy('fecha');
    return [db, orden];
  }

  private formatear(registros: HoraExtra[]): any[] {
    return registros.map((row) => ({
      ...row,
      empleadoLabel: this.etiquetaEmpleado(row.empleado as any),
      tipoLabel:
        this.detalleRubroService.getDescripcionByParentAndAlterno(
          RubrosRrh.TIPO_HORA_EXTRA,
          row.tipoHoraExtra,
        ) || '—',
      aprobadaLabel: row.aprobada === 'S' ? 'Aprobada' : 'Pendiente',
    }));
  }

  alternarSeleccion(fila: any): void {
    const seleccion = new Set(this.seleccionadas());
    if (seleccion.has(fila.codigo)) {
      seleccion.delete(fila.codigo);
    } else {
      seleccion.add(fila.codigo);
    }
    this.seleccionadas.set(seleccion);
  }

  estaSeleccionada(fila: any): boolean {
    return this.seleccionadas().has(fila.codigo);
  }

  seleccionarPendientes(): void {
    this.seleccionadas.set(new Set(this.pendientes().map((h) => h.codigo)));
  }

  limpiarSeleccion(): void {
    this.seleccionadas.set(new Set());
  }

  aprobarSeleccionadas(): void {
    const ids = [...this.seleccionadas()];
    if (ids.length === 0 || !this.aprobacionDisponible) return;

    this.ocupado.set(true);
    this.horaExtraService.aprobar(ids).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.avisar(`${ids.length} hora(s) extra aprobadas.`);
        this.onPeriodoChange(this.periodoSeleccionado());
      },
      error: (err) => {
        this.ocupado.set(false);
        this.avisar(mensajeDeError(err, 'No se pudo aprobar'), true);
      },
    });
  }

  exportarCsv(): void {
    this.exportService.exportToCSV(
      this.horas(),
      'horas-extra',
      ['Colaborador', 'Fecha', 'Tipo', 'Horas', 'Valor', 'Estado'],
      ['empleadoLabel', 'fecha', 'tipoLabel', 'horas', 'valor', 'aprobadaLabel'],
    );
  }

  etiquetaEmpleado(empleado: any): string {
    if (!empleado) return '—';
    return `${empleado.identificacion ?? ''} — ${empleado.apellidos ?? ''} ${empleado.nombres ?? ''}`.trim();
  }

  etiquetaPeriodo(periodo: PeriodoNomina): string {
    return `${periodo.mes}/${periodo.anio}`;
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      ...opcionesAviso(esError, mensaje),
    });
  }
}
