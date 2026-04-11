import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';

import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import {
  FuncionesDatosService,
  TipoFormatoFechaBackend,
} from '../../../../../shared/services/funciones-datos.service';
import { EstadoPrestamo } from '../../../model/estado-prestamo';
import { EstadoParticipe } from '../../../model/estado-participe';
import { CargaArchivo } from '../../../model/carga-archivo';
import { Aporte } from '../../../model/aporte';
import { Entidad } from '../../../model/entidad';
import { EntidadResumenConsolidadoDTO } from '../../../model/entidad-dashboard';
import {
  AporteDashFiltros,
  AporteKpiDTO,
  AporteResumenTipoDTO,
  AporteTopEntidadDTO,
  AporteTopMovimientoDTO,
} from '../../../model/aporte-dashboard';
import { Prestamo } from '../../../model/prestamo';
import { Producto } from '../../../model/producto';
import { AporteService } from '../../../service/aporte.service';
import { CargaArchivoService } from '../../../service/carga-archivo.service';
import { EntidadService } from '../../../service/entidad.service';

import { EstadoPrestamoService } from '../../../service/estado-prestamo.service';
import { NovedadParticipeCargaService } from '../../../service/novedad-participe-carga.service';
import { PrestamoService } from '../../../service/prestamo.service';
import { ProductoService } from '../../../service/producto.service';
import { NovedadParticipeCarga } from '../../../model/novedad-participe-carga';

type ChartWidgetId = 'cantidad' | 'valor' | 'saldo';

interface EstadoPrestamoResumen {
  key: string;
  label: string;
  color: string;
  count: number;
  totalValor: number;
  totalSaldo: number;
  totalMora: number;
  totalVencido: number;
  promedioTicket: number;
  porcentajeCantidad: number;
  porcentajeValor: number;
  porcentajeSaldo: number;
  prestamos: Prestamo[];
}

interface KpiCard {
  label: string;
  value: string;
  helper: string;
  icon: string;
  tone: string;
}

interface ChartSlice {
  key: string;
  label: string;
  color: string;
  value: number;
  percentage: number;
  displayValue: string;
  dasharray: string;
  dashoffset: number;
}

interface ChartWidget {
  id: ChartWidgetId;
  title: string;
  subtitle: string;
  totalLabel: string;
  totalValue: string;
  icon: string;
  slices: ChartSlice[];
}

interface RankingItem {
  label: string;
  secondary: string;
  value: number;
  displayValue: string;
}

interface OpcionFiltro {
  value: number;
  label: string;
}

interface CargaResumenSlice {
  key: 'recaudado' | 'novedades' | 'pendiente';
  label: string;
  color: string;
  value: number;
  percentage: number;
  displayValue: string;
  dasharray: string;
  dashoffset: number;
}

interface NovedadCargaResumen {
  tipoNovedad: number;
  descripcion: string;
  cantidad: number;
  montoEsperado: number;
  montoRecibido: number;
  montoDiferencia: number;
  color: string;
}

interface UltimaCargaResumen {
  carga: CargaArchivo;
  totalSolicitado: number;
  totalRecaudado: number;
  totalNovedades: number;
  totalPendiente: number;
  totalNoRecaudado: number;
  eficiencia: number;
  registrosNovedad: number;
  slices: CargaResumenSlice[];
  novedades: NovedadCargaResumen[];
}

interface AporteTipoResumen {
  key: string;
  label: string;
  color: string;
  movimientos: number;
  montoMas: number;
  montoMenos: number;
  saldoNeto: number;
}

interface AporteRepresentativo {
  key: string;
  label: string;
  secondary: string;
  saldoNeto: number;
  displayValue: string;
}

interface NovedadDetalleResumen {
  promedioDiferencia: number;
  porcentajeSobreNovedades: number;
  porcentajeSobreSolicitado: number;
}

type EntidadChartWidgetId = 'participes' | 'prestamos' | 'aportes';

interface EstadoEntidadResumen {
  key: string;
  label: string;
  color: string;
  participes: number;
  totalPrestamos: number;
  totalAportes: number;
}

interface EntidadChartWidget {
  id: EntidadChartWidgetId;
  title: string;
  subtitle: string;
  totalLabel: string;
  totalValue: string;
  icon: string;
  slices: ChartSlice[];
}
type DashboardPanelId = 'resumen' | 'prestamos' | 'entidades' | 'cargas' | 'aportes';

const ESTADO_PALETTE = [
  '#667eea',
  '#764ba2',
  '#17a2b8',
  '#f6ad55',
  '#28a745',
  '#dc3545',
  '#8b5cf6',
  '#06b6d4',
];

const DONUT_RADIUS = 42;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

@Component({
  selector: 'app-prestamo-dash.component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './prestamo-dash.component.html',
  styleUrl: './prestamo-dash.component.scss',
})
export class PrestamoDashComponent implements OnInit {
  private readonly aporteService = inject(AporteService);
  private readonly cargaArchivoService = inject(CargaArchivoService);
  private readonly entidadService = inject(EntidadService);
  private readonly estadoPrestamoService = inject(EstadoPrestamoService);
  private readonly novedadParticipeCargaService = inject(NovedadParticipeCargaService);
  private readonly productoService = inject(ProductoService);
  private readonly prestamoService = inject(PrestamoService);
  private readonly funcionesDatos = inject(FuncionesDatosService);
  private readonly router = inject(Router);
  private readonly compactFormatter = new Intl.NumberFormat('es-EC', {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  private readonly numberFormatter = new Intl.NumberFormat('es-EC', {
    maximumFractionDigits: 0,
  });

  readonly loading = signal<boolean>(false);
  readonly error = signal<string>('');
  readonly prestamos = signal<Prestamo[]>([]);
  readonly aporteKpi = signal<AporteKpiDTO | null>(null);
  readonly resumenPorTipoData = signal<AporteResumenTipoDTO[]>([]);
  readonly topEntidadesData = signal<AporteTopEntidadDTO[]>([]);
  readonly topMovimientosData = signal<AporteTopMovimientoDTO[]>([]);
  readonly resumenConsolidadoEntidades = signal<EntidadResumenConsolidadoDTO[]>([]);
  readonly estadosParticipeOptions = signal<EstadoParticipe[]>([]);
  readonly ultimaCarga = signal<CargaArchivo | null>(null);
  readonly cargasRecientes = signal<CargaArchivo[]>([]);
  readonly novedadesUltimaCarga = signal<NovedadParticipeCarga[]>([]);
  readonly novedadesPorCarga = signal<Record<number, NovedadParticipeCarga[]>>({});
  readonly estadosOptions = signal<EstadoPrestamo[]>([]);
  readonly productosOptions = signal<Producto[]>([]);
  readonly loadingUltimaCarga = signal<boolean>(false);
  readonly loadingAportes = signal<boolean>(false);
  readonly loadingEntidades = signal<boolean>(false);
  readonly errorUltimaCarga = signal<string>('');
  readonly errorAportes = signal<string>('');
  readonly errorEntidades = signal<string>('');
  readonly selectedWidgetId = signal<ChartWidgetId>('cantidad');
  readonly selectedEstadoKey = signal<string | null>(null);
  readonly selectedTipoAporteKey = signal<string | null>(null);
  readonly selectedTiposAporteKeys = signal<string[]>([]);
  readonly selectedNovedadTipo = signal<number | null>(null);
  readonly selectedCargaCodigo = signal<number | null>(null);
  readonly fechaActualizacion = signal<Date | null>(null);
  readonly panelesAbiertos = signal<Record<DashboardPanelId, boolean>>({
    resumen: true,
    prestamos: true,
    entidades: true,
    cargas: true,
    aportes: true,
  });

  readonly filtrosForm = new FormGroup({
    fechaDesde: new FormControl<Date | null>(null),
    fechaHasta: new FormControl<Date | null>(null),
    estadoPrestamo: new FormControl<number | null>(null),
    producto: new FormControl<number | null>(null),
  });

  readonly filtrosFormValue = signal(this.filtrosForm.getRawValue());

  readonly futureWidgets = [
    {
      key: 'aportes',
      title: 'Aportes',
      subtitle: 'Espacio reservado para futura lectura de aportes por composición y concentración.',
      icon: 'pie_chart',
    },
    {
      key: 'entidades',
      title: 'Entidades',
      subtitle: 'Espacio reservado para futura lectura de entidades con vista ejecutiva y drill-down.',
      icon: 'apartment',
    },
  ];

  readonly hasData = computed(() => this.prestamos().length > 0);

    readonly resumenEntidadesPorEstado = computed<EstadoEntidadResumen[]>(() => {
      const estados = this.estadosParticipeOptions();
      const resumen = this.resumenConsolidadoEntidades();

      return resumen
        .map((item, idx) => {
          const estado = estados.find((e) => e.codigo === item.estadoId || e.codigoExterno === item.estadoId || e.idEstado === item.estadoId);
          const label = estado?.nombre || `Estado ${item.estadoId}`;
          return {
            key: this.normalizarKey(label),
            label,
            color: ESTADO_PALETTE[idx % ESTADO_PALETTE.length],
            participes: this.aNumero(item.totalEntidades),
            totalPrestamos: this.aNumero(item.totalPrestamos),
            totalAportes: this.aNumero(item.totalAportes),
          };
        })
        .sort((a, b) => b.participes - a.participes || b.totalPrestamos - a.totalPrestamos);
    });

    readonly entidadEstadoWidgets = computed<EntidadChartWidget[]>(() => {
      const resumen = this.resumenEntidadesPorEstado();
      return [
        this.construirWidgetEntidadEstado(
          'participes',
          'Partícipes por estado',
          'Distribución de entidades-partícipes según su estado actual.',
          'groups',
          resumen,
        ),
        this.construirWidgetEntidadEstado(
          'prestamos',
          'Préstamos por estado de partícipe',
          'Suma de valores de préstamos agrupados por estado de partícipe.',
          'paid',
          resumen,
        ),
        this.construirWidgetEntidadEstado(
          'aportes',
          'Aportes por estado de partícipe',
          'Suma de valores de aportes agrupados por estado de partícipe.',
          'savings',
          resumen,
        ),
      ];
    });

    readonly entidadesKpi = computed(() => {
      const resumen = this.resumenEntidadesPorEstado();
      const totalParticipes = resumen.reduce((acc, item) => acc + item.participes, 0);
      const totalPrestamos = resumen.reduce((acc, item) => acc + item.totalPrestamos, 0);
      const totalAportes = resumen.reduce((acc, item) => acc + item.totalAportes, 0);

      return {
        totalParticipes,
        estados: resumen.length,
        totalPrestamos,
        totalAportes,
      };
    });
  readonly activeFiltersCount = computed(() => {
    const filtros = this.filtrosFormValue();
    return [filtros.fechaDesde, filtros.fechaHasta, filtros.estadoPrestamo, filtros.producto].filter(
      (item) => item !== null && item !== undefined,
    ).length;
  });

  readonly filtroResumen = computed(() => {
    const filtros = this.filtrosFormValue();
    const resumen: string[] = [];

    if (filtros.estadoPrestamo !== null && filtros.estadoPrestamo !== undefined) {
      resumen.push(`Estado: ${this.obtenerLabelEstadoFiltro(filtros.estadoPrestamo)}`);
    }

    if (filtros.producto !== null && filtros.producto !== undefined) {
      resumen.push(`Producto: ${this.obtenerLabelProductoFiltro(filtros.producto)}`);
    }

    if (filtros.fechaDesde || filtros.fechaHasta) {
      resumen.push(`Fecha: ${this.obtenerRangoFechaTexto(filtros.fechaDesde, filtros.fechaHasta)}`);
    }

    return resumen;
  });

  readonly latestLoadSummaries = computed<UltimaCargaResumen[]>(() => {
    const cargas = this.cargasRecientes();
    const novedadesPorCarga = this.novedadesPorCarga();

    return cargas.map((carga) =>
      this.construirResumenCarga(carga, novedadesPorCarga[carga.codigo] ?? []),
    );
  });

  readonly latestLoadSummary = computed<UltimaCargaResumen | null>(
    () => this.latestLoadSummaries()[0] ?? null,
  );

  readonly latestLoadSummaryConsolidado = computed<UltimaCargaResumen | null>(() => {
    const summaries = this.latestLoadSummaries();
    if (!summaries.length) {
      return null;
    }

    const totalSolicitado = summaries.reduce((acc, item) => acc + item.totalSolicitado, 0);
    const totalRecaudado = summaries.reduce((acc, item) => acc + item.totalRecaudado, 0);
    const totalNovedades = summaries.reduce((acc, item) => acc + item.totalNovedades, 0);
    const totalNoRecaudado = summaries.reduce((acc, item) => acc + item.totalNoRecaudado, 0);
    const recaudadoComposicion = Math.min(totalRecaudado, totalSolicitado);
    const novedadesComposicion = Math.min(totalNovedades, Math.max(totalSolicitado - recaudadoComposicion, 0));
    const pendienteComposicion = Math.max(totalSolicitado - recaudadoComposicion - novedadesComposicion, 0);

    const novedadesRaw = Object.values(this.novedadesPorCarga()).flat();
    const novedades = this.agruparNovedadesUltimaCarga(novedadesRaw);

    return {
      carga: summaries[0].carga,
      totalSolicitado,
      totalRecaudado,
      totalNovedades,
      totalPendiente: totalNoRecaudado,
      totalNoRecaudado,
      eficiencia: totalSolicitado > 0 ? (totalRecaudado / totalSolicitado) * 100 : 0,
      registrosNovedad: novedadesRaw.length,
      slices: this.construirSlicesCarga([
        {
          key: 'recaudado',
          label: 'Recaudado',
          color: '#28a745',
          value: recaudadoComposicion,
        },
        {
          key: 'novedades',
          label: 'En novedades',
          color: '#f6ad55',
          value: novedadesComposicion,
        },
        {
          key: 'pendiente',
          label: 'No recaudado',
          color: '#dc3545',
          value: pendienteComposicion,
        },
      ]),
      novedades,
    };
  });

  readonly selectedLoadSummary = computed<UltimaCargaResumen | null>(() => {
    const summaries = this.latestLoadSummaries();
    if (!summaries.length) {
      return null;
    }

    const selectedCodigo = this.selectedCargaCodigo();
    if (selectedCodigo === null || selectedCodigo === undefined) {
      return this.latestLoadSummaryConsolidado();
    }

    return summaries.find((item) => item.carga.codigo === selectedCodigo) ?? this.latestLoadSummaryConsolidado();
  });

  readonly resumenAportesPorTipo = computed<AporteTipoResumen[]>(() =>
    this.resumenPorTipoData().map((dto, idx) => ({
      key: dto.tipoAporteId.toString(),
      label: dto.tipoAporteNombre?.trim() || `Tipo ${dto.tipoAporteId}`,
      color: ESTADO_PALETTE[idx % ESTADO_PALETTE.length],
      movimientos: dto.movimientos,
      montoMas: dto.montoMas,
      montoMenos: dto.montoMenos,
      saldoNeto: dto.saldoNeto,
    }))
  );

  readonly aporteWidget = computed<ChartWidget>(() => {
    const resumenSeleccionado = this.resumenAportesPorTipoSeleccionados();
    const resumen = resumenSeleccionado;
    const totalNeto = resumen.reduce((acc, item) => acc + item.saldoNeto, 0);
    const totalMagnitudNeta = resumen.reduce((acc, item) => acc + Math.abs(item.saldoNeto), 0);

    return {
      id: 'saldo',
      title: 'Composición por tipo de aporte',
      subtitle: 'La dona usa magnitud neta de movimientos (+/-) por tipo.',
      totalLabel: 'Saldo neto total',
      totalValue: this.formatearMonedaCompacta(totalNeto),
      icon: 'account_tree',
      slices: this.construirSlicesAporte(
        resumen.map((item) => ({
          key: item.key,
          label: item.label,
          color: item.color,
          value: Math.abs(item.saldoNeto),
        })),
        totalMagnitudNeta,
      ),
    };
  });

  readonly aporteWidgetBase = computed<ChartWidget>(() => {
    const resumen = this.resumenAportesPorTipo();
    const totalNeto = resumen.reduce((acc, item) => acc + item.saldoNeto, 0);
    const totalMagnitudNeta = resumen.reduce((acc, item) => acc + Math.abs(item.saldoNeto), 0);

    return {
      id: 'saldo',
      title: 'Composición por tipo de aporte',
      subtitle: 'La dona usa magnitud neta de movimientos (+/-) por tipo.',
      totalLabel: 'Saldo neto total',
      totalValue: this.formatearMonedaCompacta(totalNeto),
      icon: 'account_tree',
      slices: this.construirSlicesAporte(
        resumen.map((item) => ({
          key: item.key,
          label: item.label,
          color: item.color,
          value: Math.abs(item.saldoNeto),
        })),
        totalMagnitudNeta,
      ),
    };
  });

  readonly resumenAportesPorTipoSeleccionados = computed<AporteTipoResumen[]>(() => {
    const resumen = this.resumenAportesPorTipo();
    const seleccion = new Set(this.selectedTiposAporteKeys());

    if (!seleccion.size) {
      return [];
    }

    return resumen.filter((item) => seleccion.has(item.key));
  });

  readonly selectedAporteTipoResumen = computed<AporteTipoResumen | null>(() => {
    const resumen = this.resumenAportesPorTipo();
    if (!resumen.length) {
      return null;
    }

    const key = this.selectedTipoAporteKey();
    return resumen.find((item) => item.key === key) ?? resumen[0];
  });

  readonly aportesRepresentativos = computed<AporteRepresentativo[]>(() => {
    const tipo = this.selectedAporteTipoResumen();
    if (!tipo) {
      return [];
    }

    const tipoId = Number(tipo.key);
    return this.topEntidadesData()
      .filter((dto) => dto.tipoAporteId === tipoId)
      .sort((a, b) => Math.abs(b.saldoNeto) - Math.abs(a.saldoNeto))
      .slice(0, 6)
      .map((dto) => ({
        key: dto.entidadId.toString(),
        label: dto.entidadNombre?.trim() || `Entidad ${dto.entidadId}`,
        secondary: `Movimientos en ${tipo.label}`,
        saldoNeto: dto.saldoNeto,
        displayValue: this.formatearMoneda(dto.saldoNeto),
      }));
  });

  readonly resumenKpiAportes = computed(() => {
    const kpi = this.aporteKpi();
    return {
      tipos: kpi?.tiposAporte ?? 0,
      movimientos: kpi?.movimientos ?? 0,
      totalMas: kpi?.montoMas ?? 0,
      totalMenos: kpi?.montoMenos ?? 0,
      saldoNeto: kpi?.saldoNeto ?? 0,
    };
  });

  readonly selectedNovedadResumen = computed<NovedadCargaResumen | null>(() => {
    const resumen = this.selectedLoadSummary();
    if (!resumen?.novedades.length) {
      return null;
    }

    const tipo = this.selectedNovedadTipo();
    return resumen.novedades.find((item) => item.tipoNovedad === tipo) ?? resumen.novedades[0];
  });

  readonly selectedNovedadDetalle = computed<NovedadDetalleResumen | null>(() => {
    const detalle = this.selectedNovedadResumen();
    const carga = this.selectedLoadSummary();

    if (!detalle || !carga) {
      return null;
    }

    return {
      promedioDiferencia: detalle.cantidad > 0 ? detalle.montoDiferencia / detalle.cantidad : 0,
      porcentajeSobreNovedades:
        carga.totalNovedades > 0 ? (detalle.montoDiferencia / carga.totalNovedades) * 100 : 0,
      porcentajeSobreSolicitado:
        carga.totalSolicitado > 0 ? (detalle.montoDiferencia / carga.totalSolicitado) * 100 : 0,
    };
  });

  readonly resumenEstados = computed<EstadoPrestamoResumen[]>(() => {
    const source = this.prestamos();
    if (!source.length) {
      return [];
    }

    const agrupados = new Map<string, EstadoPrestamoResumen>();

    for (const prestamo of source) {
      const label = this.obtenerEstado(prestamo);
      const key = this.normalizarKey(label);
      const current = agrupados.get(key);

      if (current) {
        current.count += 1;
        current.totalValor += this.obtenerValorPrestamo(prestamo);
        current.totalSaldo += this.obtenerSaldoPrestamo(prestamo);
        current.totalMora += this.obtenerMoraPrestamo(prestamo);
        current.totalVencido += this.obtenerVencidoPrestamo(prestamo);
        current.prestamos.push(prestamo);
      } else {
        agrupados.set(key, {
          key,
          label,
          color: ESTADO_PALETTE[agrupados.size % ESTADO_PALETTE.length],
          count: 1,
          totalValor: this.obtenerValorPrestamo(prestamo),
          totalSaldo: this.obtenerSaldoPrestamo(prestamo),
          totalMora: this.obtenerMoraPrestamo(prestamo),
          totalVencido: this.obtenerVencidoPrestamo(prestamo),
          promedioTicket: 0,
          porcentajeCantidad: 0,
          porcentajeValor: 0,
          porcentajeSaldo: 0,
          prestamos: [prestamo],
        });
      }
    }

    const totalCantidad = source.length;
    const totalValor = source.reduce((acc, item) => acc + this.obtenerValorPrestamo(item), 0);
    const totalSaldo = source.reduce((acc, item) => acc + this.obtenerSaldoPrestamo(item), 0);

    return Array.from(agrupados.values())
      .map((item) => ({
        ...item,
        promedioTicket: item.count > 0 ? item.totalValor / item.count : 0,
        porcentajeCantidad: totalCantidad > 0 ? (item.count / totalCantidad) * 100 : 0,
        porcentajeValor: totalValor > 0 ? (item.totalValor / totalValor) * 100 : 0,
        porcentajeSaldo: totalSaldo > 0 ? (item.totalSaldo / totalSaldo) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count || b.totalSaldo - a.totalSaldo);
  });

  readonly kpiCards = computed<KpiCard[]>(() => {
    const prestamos = this.prestamos();
    const totalValor = prestamos.reduce((acc, item) => acc + this.obtenerValorPrestamo(item), 0);
    const totalSaldo = prestamos.reduce((acc, item) => acc + this.obtenerSaldoPrestamo(item), 0);
    const totalMora = prestamos.reduce((acc, item) => acc + this.obtenerMoraPrestamo(item), 0);
    const vencidos = prestamos.filter(
      (item) => this.obtenerVencidoPrestamo(item) > 0 || this.obtenerDiasVencido(item) > 0,
    ).length;

    return [
      {
        label: 'Préstamos vigentes en lectura',
        value: this.formatearNumero(prestamos.length),
        helper: `${this.resumenEstados().length} estados representados`,
        icon: 'account_balance',
        tone: 'primary',
      },
      {
        label: 'Valor colocado',
        value: this.formatearMonedaCompacta(totalValor),
        helper: `Ticket promedio ${this.formatearMonedaCompacta(prestamos.length ? totalValor / prestamos.length : 0)}`,
        icon: 'paid',
        tone: 'secondary',
      },
      {
        label: 'Saldo pendiente',
        value: this.formatearMonedaCompacta(totalSaldo),
        helper: `${this.obtenerPorcentaje(totalSaldo, totalValor)} del valor colocado`,
        icon: 'savings',
        tone: 'info',
      },
      {
        label: 'Operaciones con señal de vencimiento',
        value: this.formatearNumero(vencidos),
        helper: `Mora acumulada ${this.formatearMonedaCompacta(totalMora)}`,
        icon: 'warning',
        tone: 'warning',
      },
    ];
  });

  readonly chartWidgets = computed<ChartWidget[]>(() => {
    const resumen = this.resumenEstados();

    return [
      this.construirWidget(
        'cantidad',
        'Participación por estado',
        'Cuántos préstamos componen cada estado operativo.',
        'donut_large',
        resumen,
      ),
      this.construirWidget(
        'valor',
        'Valor colocado por estado',
        'Distribución del monto total originado según el estado del préstamo.',
        'payments',
        resumen,
      ),
      this.construirWidget(
        'saldo',
        'Saldo pendiente por estado',
        'Concentración actual del saldo vivo para seguimiento ejecutivo.',
        'monitoring',
        resumen,
      ),
    ];
  });

  readonly selectedWidget = computed<ChartWidget | null>(
    () => this.chartWidgets().find((item) => item.id === this.selectedWidgetId()) ?? null,
  );

  readonly selectedResumen = computed<EstadoPrestamoResumen | null>(() => {
    const resumen = this.resumenEstados();
    if (!resumen.length) {
      return null;
    }

    const seleccionado = this.selectedEstadoKey();
    return resumen.find((item) => item.key === seleccionado) ?? resumen[0];
  });

  readonly detallePrestamos = computed<Prestamo[]>(() => {
    const resumen = this.selectedResumen();
    const widget = this.selectedWidgetId();

    if (!resumen) {
      return [];
    }

    return [...resumen.prestamos]
      .sort((a, b) => this.obtenerValorPorWidget(b, widget) - this.obtenerValorPorWidget(a, widget))
      .slice(0, 10);
  });

  readonly topEntidades = computed<RankingItem[]>(() => {
    const resumen = this.selectedResumen();
    if (!resumen) {
      return [];
    }

    const agrupados = new Map<number, RankingItem>();

    for (const prestamo of resumen.prestamos) {
      const codigoEntidad = prestamo.entidad?.codigo ?? -1;
      const valor = this.obtenerSaldoPrestamo(prestamo);
      const existente = agrupados.get(codigoEntidad);

      if (existente) {
        existente.value += valor;
        existente.displayValue = this.formatearMonedaCompacta(existente.value);
        existente.secondary = `${existente.secondary.split('·')[0].trim()} · ${this.formatearNumero(
          this.contarPrestamosEntidad(resumen.prestamos, codigoEntidad),
        )} préstamos`;
      } else {
        agrupados.set(codigoEntidad, {
          label: this.obtenerEntidad(prestamo),
          secondary: `${this.obtenerProducto(prestamo)} · ${this.formatearNumero(
            this.contarPrestamosEntidad(resumen.prestamos, codigoEntidad),
          )} préstamos`,
          value: valor,
          displayValue: this.formatearMonedaCompacta(valor),
        });
      }
    }

    return Array.from(agrupados.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  });

  readonly topProductos = computed<RankingItem[]>(() => {
    const resumen = this.selectedResumen();
    if (!resumen) {
      return [];
    }

    const agrupados = new Map<string, RankingItem>();

    for (const prestamo of resumen.prestamos) {
      const producto = this.obtenerProducto(prestamo);
      const valor = this.obtenerValorPrestamo(prestamo);
      const existente = agrupados.get(producto);

      if (existente) {
        existente.value += valor;
        existente.displayValue = this.formatearMonedaCompacta(existente.value);
      } else {
        agrupados.set(producto, {
          label: producto,
          secondary: this.obtenerEstado(prestamo),
          value: valor,
          displayValue: this.formatearMonedaCompacta(valor),
        });
      }
    }

    return Array.from(agrupados.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  });

  ngOnInit(): void {
    this.filtrosForm.valueChanges.subscribe(() => {
      this.filtrosFormValue.set(this.filtrosForm.getRawValue());
    });
    this.cargarCatalogos();
  }

  cargarCatalogos(): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      estados: this.estadoPrestamoService.getAll(),
      productos: this.productoService.getAll(),
      cargas: this.cargaArchivoService.getAll(),
    }).subscribe({
      next: ({ estados, productos, cargas }) => {
        this.estadosOptions.set((estados ?? []).sort((a, b) => a.nombre.localeCompare(b.nombre)));
        this.productosOptions.set((productos ?? []).sort((a, b) => a.nombre.localeCompare(b.nombre)));
        this.prepararUltimaCarga(cargas ?? []);
        this.cargarResumenEntidades();
        this.cargarAportes();
        this.cargarDatos();
      },
      error: (err) => {
        console.error('Error al cargar catálogos del dashboard de préstamos', err);
        this.error.set('No fue posible cargar los catálogos de filtros del dashboard.');
        this.loading.set(false);
      },
    });
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.error.set('');

    const criterios = this.buildCriterios();
    const consulta$ = this.debeConsultarConCriteria(criterios)
      ? this.prestamoService.selectByCriteria(criterios)
      : this.prestamoService.getAll();

    consulta$.subscribe({
      next: (data) => {
        const normalizados = (data ?? []).map((item) => this.normalizarPrestamo(item));
        this.prestamos.set(this.aplicarFiltroFechaLocal(normalizados));
        this.fechaActualizacion.set(new Date());
        this.sincronizarSeleccion();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar dashboard de préstamos', err);
        this.error.set('No fue posible cargar el resumen gerencial de préstamos.');
        this.loading.set(false);
      },
    });
  }

  aplicarFiltros(): void {
    this.cargarDatos();
    this.cargarAportes();
  }

  seleccionarNovedadTipo(tipoNovedad: number): void {
    this.selectedNovedadTipo.set(tipoNovedad);
  }

  togglePanel(panelId: DashboardPanelId): void {
    this.panelesAbiertos.update((state) => ({
      ...state,
      [panelId]: !state[panelId],
    }));
  }

  isPanelOpen(panelId: DashboardPanelId): boolean {
    return this.panelesAbiertos()[panelId];
  }

  limpiarFiltros(): void {
    this.filtrosForm.setValue({
      fechaDesde: null,
      fechaHasta: null,
      estadoPrestamo: null,
      producto: null,
    });
    this.filtrosFormValue.set(this.filtrosForm.getRawValue());
    this.filtrosForm.markAsPristine();
    this.filtrosForm.markAsUntouched();
    this.selectedEstadoKey.set(null);
    this.selectedTipoAporteKey.set(null);
    this.cargarDatos();
    this.cargarAportes();
  }

  seleccionarDetalle(widgetId: ChartWidgetId, estadoKey: string): void {
    this.selectedWidgetId.set(widgetId);
    this.selectedEstadoKey.set(estadoKey);
  }

  irAConsulta(): void {
    this.router.navigate(['/menucreditos/prestamo-consulta']);
  }

  exportarReportesPDF(): void {
    this.exportarSeccionPDF('reportes-pasteles-export', 'Dashboard ejecutivo de préstamos · Reporte general');
  }

  exportarTabPDF(sectionId: string, title: string): void {
    this.exportarSeccionPDF(sectionId, title);
  }

  private exportarSeccionPDF(containerId: string, title: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`No se encontró el contenedor para exportar: ${containerId}`);
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1280,height=900');
    if (!printWindow) {
      console.error('No fue posible abrir la ventana de impresión.');
      return;
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n');

    const fecha = new Intl.DateTimeFormat('es-EC', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          ${styles}
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { background: #ffffff !important; margin: 0; }
            .pdf-header { margin: 0 0 12px 0; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 10px; }
            .pdf-header h1 { margin: 0 0 6px 0; font-size: 18px; }
            .pdf-header p { margin: 0; font-size: 12px; color: #475569; }
            .collapsible-panel { break-inside: avoid; page-break-inside: avoid; }
            .panel-content, .widget-card, .latest-load-panel { break-inside: avoid; page-break-inside: avoid; }
            .panel-toggle { pointer-events: none; }
          </style>
        </head>
        <body>
          <section class="pdf-header">
            <h1>${title}</h1>
            <p>Generado: ${fecha}</p>
          </section>
          ${container.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();

    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  obtenerEtiquetaWidgetSeleccionado(): string {
    return this.selectedWidget()?.title ?? 'Resumen por estado';
  }

  esSeleccionado(widgetId: ChartWidgetId, estadoKey: string): boolean {
    return this.selectedWidgetId() === widgetId && this.selectedEstadoKey() === estadoKey;
  }

  trackByPrestamo(index: number, item: Prestamo): number {
    return item.codigo ?? index;
  }

  obtenerEntidad(prestamo: Prestamo): string {
    return (
      prestamo.entidad?.razonSocial?.trim() ||
      prestamo.entidad?.nombreComercial?.trim() ||
      `Entidad ${prestamo.entidad?.codigo ?? 'N/D'}`
    );
  }

  obtenerProducto(prestamo: Prestamo): string {
    return prestamo.producto?.nombre?.trim() || `Producto ${prestamo.producto?.codigo ?? 'N/D'}`;
  }

  obtenerEstado(prestamo: Prestamo): string {
    const estadoCatalogo = this.resolverEstadoCatalogo(prestamo);
    if (estadoCatalogo?.nombre?.trim()) {
      return estadoCatalogo.nombre.trim();
    }

    const nombreDirecto = prestamo.estadoPrestamo?.nombre?.trim();
    if (nombreDirecto) {
      return nombreDirecto;
    }

    return `Estado ${prestamo.idEstado ?? 'N/D'}`;
  }

  obtenerDiasVencido(prestamo: Prestamo): number {
    return this.aNumero(prestamo.diasVencido);
  }

  obtenerMoraTexto(prestamo: Prestamo): string {
    return this.formatearMoneda(this.obtenerMoraPrestamo(prestamo));
  }

  obtenerSaldoTexto(prestamo: Prestamo): string {
    return this.formatearMoneda(this.obtenerSaldoPrestamo(prestamo));
  }

  obtenerValorTexto(prestamo: Prestamo): string {
    return this.formatearMoneda(this.obtenerValorPrestamo(prestamo));
  }

  obtenerFechaActualizacionTexto(): string {
    const fecha = this.fechaActualizacion();
    if (!fecha) {
      return 'Sin actualización reciente';
    }

    return new Intl.DateTimeFormat('es-EC', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(fecha);
  }

  obtenerFechaUltimaCargaTexto(): string {
    return this.obtenerFechaCargaTexto(this.ultimaCarga());
  }

  obtenerFechaCargaTexto(carga: CargaArchivo | null): string {
    const fecha = this.convertirFecha(carga?.fechaCarga);

    if (!fecha) {
      return 'Sin registro reciente';
    }

    return new Intl.DateTimeFormat('es-EC', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(fecha);
  }

  obtenerPeriodoUltimaCargaTexto(): string {
    return this.obtenerPeriodoCargaTexto(this.ultimaCarga());
  }

  obtenerPeriodoCargaTexto(carga: CargaArchivo | null): string {
    if (!carga) {
      return 'Período no disponible';
    }

    const mes = new Intl.DateTimeFormat('es-EC', { month: 'long' }).format(
      new Date(carga.anioAfectacion || new Date().getFullYear(), Math.max((carga.mesAfectacion || 1) - 1, 0), 1),
    );

    return `${mes} ${carga.anioAfectacion}`;
  }

  obtenerEstadoCargaTexto(estado: number): string {
    if (estado === 1) {
      return 'Ingresada';
    }

    if (estado === 3) {
      return 'Procesada';
    }

    return String(estado);
  }

  obtenerUsuarioUltimaCargaTexto(): string {
    return this.obtenerUsuarioCargaTexto(this.ultimaCarga());
  }

  obtenerUsuarioCargaTexto(carga: CargaArchivo | null): string {
    const usuario = carga?.usuarioCarga;
    return usuario?.nombre || (usuario?.codigo ? `Usuario ${usuario.codigo}` : 'Usuario no disponible');
  }

  seleccionarCargaResumen(codigoCarga: number): void {
    this.selectedCargaCodigo.set(codigoCarga);

    const selected = this.latestLoadSummaries().find((item) => item.carga.codigo === codigoCarga);
    const tipoNovedad = selected?.novedades[0]?.tipoNovedad ?? null;
    this.selectedNovedadTipo.set(tipoNovedad);
    this.scrollToCargaResumen();
  }

  limpiarSeleccionCarga(): void {
    this.selectedCargaCodigo.set(null);
    const tipoNovedad = this.selectedLoadSummary()?.novedades[0]?.tipoNovedad ?? null;
    this.selectedNovedadTipo.set(tipoNovedad);
    this.scrollToCargaResumen();
  }

  esCargaSeleccionada(codigoCarga: number): boolean {
    const selected = this.selectedLoadSummary();
    return selected ? selected.carga.codigo === codigoCarga : false;
  }

  esNovedadSeleccionada(tipoNovedad: number): boolean {
    return this.selectedNovedadTipo() === tipoNovedad;
  }

  seleccionarTipoAporte(tipoKey: string): void {
    const seleccionActual = this.selectedTiposAporteKeys();
    const existe = seleccionActual.includes(tipoKey);
    const nuevaSeleccion = existe
      ? seleccionActual.filter((key) => key !== tipoKey)
      : [...seleccionActual, tipoKey];

    this.selectedTiposAporteKeys.set(nuevaSeleccion);

    if (!existe) {
      this.selectedTipoAporteKey.set(tipoKey);
      return;
    }

    if (this.selectedTipoAporteKey() === tipoKey) {
      this.selectedTipoAporteKey.set(nuevaSeleccion[0] ?? null);
    }
  }

  esTipoAporteSeleccionado(tipoKey: string): boolean {
    return this.selectedTiposAporteKeys().includes(tipoKey);
  }

  limpiarSeleccionTiposAporte(): void {
    const resumen = this.resumenAportesPorTipo();
    const todas = resumen.map((item) => item.key);
    this.selectedTiposAporteKeys.set(todas);
    this.selectedTipoAporteKey.set(todas[0] ?? null);
  }

  quitarSeleccionesTiposAporte(): void {
    this.selectedTiposAporteKeys.set([]);
    this.selectedTipoAporteKey.set(null);
  }

  obtenerParticipacionTipoAporte(tipoKey: string): number {
    return this.aporteWidgetBase().slices.find((item) => item.key === tipoKey)?.percentage ?? 0;
  }

  obtenerEstadoFiltroOptions(): OpcionFiltro[] {
    return this.estadosOptions().map((item) => ({
      value: item.codigoExterno ?? item.idEstado ?? item.codigo,
      label: item.nombre,
    }));
  }

  obtenerProductoFiltroOptions(): OpcionFiltro[] {
    return this.productosOptions().map((item) => ({
      value: item.codigo,
      label: item.nombre,
    }));
  }

  private buildCriterios(): DatosBusqueda[] {
    const criterios: DatosBusqueda[] = [];
    const filtros = this.filtrosForm.getRawValue();

    if (filtros.estadoPrestamo !== null && filtros.estadoPrestamo !== undefined) {
      const criterioEstado = new DatosBusqueda();
      criterioEstado.asignaUnCampoSinTrunc(
        TipoDatos.LONG,
        'idEstado',
        String(filtros.estadoPrestamo),
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(criterioEstado);
    }

    if (filtros.producto) {
      const criterioProducto = new DatosBusqueda();
      criterioProducto.asignaValorConCampoPadre(
        TipoDatos.LONG,
        'producto',
        'codigo',
        String(filtros.producto),
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(criterioProducto);
    }

    const orderFecha = new DatosBusqueda();
    orderFecha.orderBy('fecha');
    orderFecha.setTipoOrden(DatosBusqueda.ORDER_DESC);
    criterios.push(orderFecha);

    const orderCodigo = new DatosBusqueda();
    orderCodigo.orderBy('codigo');
    orderCodigo.setTipoOrden(DatosBusqueda.ORDER_DESC);
    criterios.push(orderCodigo);

    return criterios;
  }

  private prepararUltimaCarga(cargas: CargaArchivo[]): void {
    if (!cargas.length) {
      this.ultimaCarga.set(null);
      this.cargasRecientes.set([]);
      this.novedadesUltimaCarga.set([]);
      this.novedadesPorCarga.set({});
      this.selectedCargaCodigo.set(null);
      this.selectedNovedadTipo.set(null);
      this.loadingUltimaCarga.set(false);
      this.errorUltimaCarga.set('');
      return;
    }

    const ordenadas = [...cargas].sort((a, b) => {
      const fechaA = this.convertirFecha(a.fechaCarga)?.getTime() || 0;
      const fechaB = this.convertirFecha(b.fechaCarga)?.getTime() || 0;
      return fechaB - fechaA || this.aNumero(b.codigo) - this.aNumero(a.codigo);
    });

    const recientes = ordenadas.slice(0, 3);
    this.ultimaCarga.set(recientes[0]);
    this.cargasRecientes.set(recientes);
    this.selectedCargaCodigo.set(null);
    this.cargarNovedadesCargasRecientes(recientes);
  }

  /** IDs de los 3 estados de partícipe que se muestran en los pasteles de entidades. */
  private static readonly ESTADOS_ENTIDAD_IDS = [10, 2, 30] as const;

  /** Catálogo fijo de los 3 estados conocidos (evita llamada al backend). */
  private static readonly ESTADOS_ENTIDAD_FIJOS: EstadoParticipe[] = [
    { codigo: 10, nombre: 'Activo', codigoExterno: 10, idEstado: 10 },
    { codigo: 2, nombre: 'Cesante', codigoExterno: 2, idEstado: 2 },
    { codigo: 30, nombre: 'Jubilado', codigoExterno: 30, idEstado: 30 },
  ];

  private cargarResumenEntidades(): void {
    this.loadingEntidades.set(true);
    this.errorEntidades.set('');

    // Hardcodeamos los 3 estados — sin llamada al backend
    this.estadosParticipeOptions.set(PrestamoDashComponent.ESTADOS_ENTIDAD_FIJOS);

    this.entidadService
      .getResumenConsolidadoPorEstado({
        estados: PrestamoDashComponent.ESTADOS_ENTIDAD_IDS.join(','),
      })
      .pipe(
        catchError((err) => {
          console.error('Error al cargar resumen consolidado de entidades', err);
          return of([] as EntidadResumenConsolidadoDTO[]);
        }),
      )
      .subscribe({
      next: (resumen) => {
        this.resumenConsolidadoEntidades.set(resumen ?? []);
        this.loadingEntidades.set(false);
      },
      error: (err) => {
        console.error('Error en resumen de entidades-partícipes', err);
        this.errorEntidades.set('No fue posible cargar el resumen de entidades-partícipes.');
        this.loadingEntidades.set(false);
      },
    });
  }

  /**
   * Construye criterios para selectByCriteria de Entidad filtrando por
   * idEstado IN estadoIds usando OR entre paréntesis.
   */
  private buildCriteriosEntidadesPorEstados(estadoIds: number[]): DatosBusqueda[] {
    const criterios: DatosBusqueda[] = [];

    const dbOpen = new DatosBusqueda();
    dbOpen.usaParentesis(TipoComandosBusqueda.ABRE_PARENTESIS);
    criterios.push(dbOpen);

    estadoIds.forEach((id, index) => {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(
        TipoDatos.LONG,
        'idEstado',
        String(id),
        TipoComandosBusqueda.IGUAL,
      );
      if (index > 0) {
        c.setTipoOperadorLogico(TipoComandosBusqueda.OR);
      }
      criterios.push(c);
    });

    const dbClose = new DatosBusqueda();
    dbClose.usaParentesis(TipoComandosBusqueda.CIERRA_PARENTESIS);
    criterios.push(dbClose);

    return criterios;
  }

  /**
   * Construye criterios para selectByCriteria de Aporte filtrando por
   * entidad.codigo IN entidadCodigos usando OR entre paréntesis.
   * Retorna null cuando la lista está vacía.
   */
  private buildCriteriosAportesPorEntidades(entidadCodigos: number[]): DatosBusqueda[] | null {
    if (entidadCodigos.length === 0) return null;

    const criterios: DatosBusqueda[] = [];

    const dbOpen = new DatosBusqueda();
    dbOpen.usaParentesis(TipoComandosBusqueda.ABRE_PARENTESIS);
    criterios.push(dbOpen);

    entidadCodigos.forEach((codigo, index) => {
      const c = new DatosBusqueda();
      c.asignaValorConCampoPadre(
        TipoDatos.LONG,
        'entidad',
        'codigo',
        String(codigo),
        TipoComandosBusqueda.IGUAL,
      );
      if (index > 0) {
        c.setTipoOperadorLogico(TipoComandosBusqueda.OR);
      }
      criterios.push(c);
    });

    const dbClose = new DatosBusqueda();
    dbClose.usaParentesis(TipoComandosBusqueda.CIERRA_PARENTESIS);
    criterios.push(dbClose);

    return criterios;
  }

  private cargarAportes(): void {
    this.loadingAportes.set(true);
    this.errorAportes.set('');
    const filtros = this.buildAporteFiltros();

    forkJoin({
      kpis: this.aporteService.getKpisGlobales(filtros).pipe(
        catchError((err) => {
          console.error('Error al cargar KPIs de aportes', err);
          return of(null);
        }),
      ),
      resumen: this.aporteService.getResumenPorTipo(filtros).pipe(
        catchError((err) => {
          console.error('Error al cargar resumen por tipo de aporte', err);
          return of([] as AporteResumenTipoDTO[]);
        }),
      ),
      entidades: this.aporteService.getTopEntidades({ ...filtros, topN: 50 }).pipe(
        catchError((err) => {
          console.error('Error al cargar top entidades de aporte', err);
          return of([] as AporteTopEntidadDTO[]);
        }),
      ),
      movimientos: this.aporteService.getTopMovimientos({ ...filtros, topN: 50 }).pipe(
        catchError((err) => {
          console.error('Error al cargar top movimientos de aporte', err);
          return of([] as AporteTopMovimientoDTO[]);
        }),
      ),
    }).subscribe({
      next: ({ kpis, resumen, entidades, movimientos }) => {
        this.aporteKpi.set(kpis);
        this.resumenPorTipoData.set(resumen ?? []);
        this.topEntidadesData.set(entidades ?? []);
        this.topMovimientosData.set(movimientos ?? []);
        this.sincronizarSeleccionAporte();
        this.loadingAportes.set(false);
      },
      error: (err) => {
        console.error('Error al cargar el dashboard de aportes', err);
        this.errorAportes.set('No fue posible cargar el resumen de aportes.');
        this.aporteKpi.set(null);
        this.resumenPorTipoData.set([]);
        this.topEntidadesData.set([]);
        this.topMovimientosData.set([]);
        this.loadingAportes.set(false);
      },
    });
  }

  private buildAporteFiltros(): AporteDashFiltros {
    const { fechaDesde, fechaHasta } = this.filtrosForm.getRawValue();
    const filtros: AporteDashFiltros = {
      estadoAporte: 1,
    };

    if (fechaDesde) {
      const value = this.funcionesDatos.formatearFechaParaBackend(
        fechaDesde,
        TipoFormatoFechaBackend.SOLO_FECHA,
      );
      if (value) {
        filtros.fechaDesde = value;
      }
    }

    if (fechaHasta) {
      const value = this.funcionesDatos.formatearFechaParaBackend(
        fechaHasta,
        TipoFormatoFechaBackend.SOLO_FECHA,
      );
      if (value) {
        filtros.fechaHasta = value;
      }
    }

    return filtros;
  }

  private sincronizarSeleccionAporte(): void {
    const resumen = this.resumenAportesPorTipo();
    if (!resumen.length) {
      this.selectedTipoAporteKey.set(null);
      this.selectedTiposAporteKeys.set([]);
      return;
    }

    const actual = this.selectedTipoAporteKey();
    const existe = actual ? resumen.some((item) => item.key === actual) : false;

    if (!existe) {
      this.selectedTipoAporteKey.set(resumen[0].key);
    }

    const keysValidas = new Set(resumen.map((item) => item.key));
    const seleccionFiltrada = this.selectedTiposAporteKeys().filter((key) => keysValidas.has(key));

    if (!seleccionFiltrada.length) {
      const base = this.selectedTipoAporteKey() ?? resumen[0].key;
      this.selectedTiposAporteKeys.set([base]);
      return;
    }

    this.selectedTiposAporteKeys.set(seleccionFiltrada);
  }

  private cargarNovedadesCargasRecientes(cargas: CargaArchivo[]): void {
    this.loadingUltimaCarga.set(true);
    this.errorUltimaCarga.set('');

    forkJoin(
      cargas.map((carga) =>
        this.consultarNovedadesCarga(carga.codigo).pipe(
          catchError((err) => {
            console.error(`Error al cargar novedades de la carga ${carga.codigo}`, err);
            return of([] as NovedadParticipeCarga[]);
          }),
        ),
      ),
    ).subscribe({
      next: (respuestas) => {
        const mapa: Record<number, NovedadParticipeCarga[]> = {};

        respuestas.forEach((data, idx) => {
          const codigoCarga = cargas[idx].codigo;
          mapa[codigoCarga] = (data ?? []).filter((item) => Number(item.tipoNovedad || 0) > 3);
        });

        this.novedadesPorCarga.set(mapa);
        const selectedCodigo = this.selectedCargaCodigo();
        const novedadesSeleccionadas =
          selectedCodigo !== null && selectedCodigo !== undefined
            ? (mapa[selectedCodigo] ?? [])
            : Object.values(mapa).flat();
        this.novedadesUltimaCarga.set(mapa[cargas[0].codigo] ?? []);
        this.selectedNovedadTipo.set(novedadesSeleccionadas[0]?.tipoNovedad ?? null);
        this.loadingUltimaCarga.set(false);
      },
      error: (err) => {
        console.error('Error al cargar novedades de las cargas recientes', err);
        this.errorUltimaCarga.set('No fue posible obtener el detalle de novedades de las cargas recientes.');
        this.novedadesUltimaCarga.set([]);
        this.novedadesPorCarga.set({});
        this.selectedNovedadTipo.set(null);
        this.loadingUltimaCarga.set(false);
      },
    });
  }

  private consultarNovedadesCarga(codigoCargaArchivo: number): Observable<NovedadParticipeCarga[]> {
    const criterios: DatosBusqueda[] = [];
    const criterioCarga = new DatosBusqueda();
    criterioCarga.asignaUnCampoSinTrunc(
      TipoDatos.LONG,
      'codigoCargaArchivo',
      String(codigoCargaArchivo),
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(criterioCarga);

    return this.novedadParticipeCargaService.selectByCriteria(criterios).pipe(map((data) => data ?? []));
  }

  private construirResumenCarga(
    carga: CargaArchivo,
    novedadesCarga: NovedadParticipeCarga[],
  ): UltimaCargaResumen {
    const totalSolicitado = this.aNumero(carga.totalDescontar);
    const totalRecaudado = this.aNumero(carga.totalDescontado);
    const novedades = this.agruparNovedadesUltimaCarga(novedadesCarga);
    const totalNovedades = novedades.reduce((acc, item) => acc + item.montoDiferencia, 0);
    const recaudadoComposicion = Math.min(totalRecaudado, totalSolicitado);
    const novedadesComposicion = Math.min(totalNovedades, Math.max(totalSolicitado - recaudadoComposicion, 0));
    const pendienteComposicion = Math.max(totalSolicitado - recaudadoComposicion - novedadesComposicion, 0);
    const totalNoRecaudado = Math.max(totalSolicitado - totalRecaudado, 0);

    return {
      carga,
      totalSolicitado,
      totalRecaudado,
      totalNovedades,
      totalPendiente: totalNoRecaudado,
      totalNoRecaudado,
      eficiencia: totalSolicitado > 0 ? (totalRecaudado / totalSolicitado) * 100 : 0,
      registrosNovedad: novedadesCarga.length,
      slices: this.construirSlicesCarga([
        {
          key: 'recaudado',
          label: 'Recaudado',
          color: '#28a745',
          value: recaudadoComposicion,
        },
        {
          key: 'novedades',
          label: 'En novedades',
          color: '#f6ad55',
          value: novedadesComposicion,
        },
        {
          key: 'pendiente',
          label: 'No recaudado',
          color: '#dc3545',
          value: pendienteComposicion,
        },
      ]),
      novedades,
    };
  }

  private agruparNovedadesUltimaCarga(novedades: NovedadParticipeCarga[]): NovedadCargaResumen[] {
    const colores = ['#f6ad55', '#ef4444', '#8b5cf6', '#06b6d4', '#14b8a6', '#f97316'];
    const grupos = new Map<number, NovedadCargaResumen>();

    for (const novedad of novedades) {
      const tipo = Number(novedad.tipoNovedad || 0);
      const existente = grupos.get(tipo);
      const montoEsperado = this.aNumero(novedad.montoEsperado);
      const montoRecibido = this.aNumero(novedad.montoRecibido);
      const montoDiferencia = Math.abs(this.aNumero(novedad.montoDiferencia));

      if (existente) {
        existente.cantidad += 1;
        existente.montoEsperado += montoEsperado;
        existente.montoRecibido += montoRecibido;
        existente.montoDiferencia += montoDiferencia;
      } else {
        grupos.set(tipo, {
          tipoNovedad: tipo,
          descripcion: novedad.descripcion?.trim() || `Novedad ${tipo}`,
          cantidad: 1,
          montoEsperado,
          montoRecibido,
          montoDiferencia,
          color: colores[grupos.size % colores.length],
        });
      }
    }

    return Array.from(grupos.values()).sort((a, b) => b.montoDiferencia - a.montoDiferencia);
  }

  private construirSlicesCarga(
    slices: Array<Pick<CargaResumenSlice, 'key' | 'label' | 'color' | 'value'>>,
  ): CargaResumenSlice[] {
    const total = slices.reduce((acc, item) => acc + item.value, 0);
    let acumulado = 0;

    return slices.map((item) => {
      const ratio = total > 0 ? item.value / total : 0;
      const segment = ratio * DONUT_CIRCUMFERENCE;
      const slice: CargaResumenSlice = {
        ...item,
        percentage: ratio * 100,
        displayValue: this.formatearMonedaCompacta(item.value),
        dasharray: `${segment} ${Math.max(DONUT_CIRCUMFERENCE - segment, 0)}`,
        dashoffset: -acumulado,
      };
      acumulado += segment;
      return slice;
    });
  }

  private construirSlicesAporte(
    slices: Array<Pick<ChartSlice, 'key' | 'label' | 'color' | 'value'>>,
    total: number,
  ): ChartSlice[] {
    let acumulado = 0;

    return slices.map((item) => {
      const ratio = total > 0 ? item.value / total : 0;
      const segment = ratio * DONUT_CIRCUMFERENCE;
      const slice: ChartSlice = {
        ...item,
        percentage: ratio * 100,
        displayValue: this.formatearMonedaCompacta(item.value),
        dasharray: `${segment} ${Math.max(DONUT_CIRCUMFERENCE - segment, 0)}`,
        dashoffset: -acumulado,
      };
      acumulado += segment;
      return slice;
    });
  }

  private debeConsultarConCriteria(criterios: DatosBusqueda[]): boolean {
    const filtros = this.filtrosForm.getRawValue();
    const hasEstado = filtros.estadoPrestamo !== null && filtros.estadoPrestamo !== undefined;
    const hasProducto = filtros.producto !== null && filtros.producto !== undefined;
    return hasEstado || hasProducto || criterios.length > 2;
  }

  private aplicarFiltroFechaLocal(prestamos: Prestamo[]): Prestamo[] {
    const { fechaDesde, fechaHasta } = this.filtrosForm.getRawValue();

    if (!fechaDesde && !fechaHasta) {
      return prestamos;
    }

    const desde = fechaDesde ? this.inicioDelDia(fechaDesde) : null;
    const hasta = fechaHasta ? this.finDelDia(fechaHasta) : null;

    return prestamos.filter((prestamo) => {
      const fechaPrestamo = this.convertirFecha(prestamo.fecha) ?? this.convertirFecha(prestamo.fechaInicio);

      if (!fechaPrestamo) {
        return false;
      }

      const timestamp = fechaPrestamo.getTime();
      if (desde && timestamp < desde.getTime()) {
        return false;
      }

      if (hasta && timestamp > hasta.getTime()) {
        return false;
      }

      return true;
    });
  }

  private agregarRangoFechas(
    criterios: DatosBusqueda[],
    desde: Date | null,
    hasta: Date | null,
  ): void {
    if (desde && hasta) {
      const fechaDesde = this.funcionesDatos.formatearFechaParaBackend(
        desde,
        TipoFormatoFechaBackend.SOLO_FECHA,
      );
      const fechaHasta = this.funcionesDatos.formatearFechaParaBackend(
        hasta,
        TipoFormatoFechaBackend.SOLO_FECHA,
      );

      if (fechaDesde && fechaHasta) {
        const criterio = new DatosBusqueda();
        criterio.asignaUnCampoConBetween(
          'fecha',
          TipoDatos.DATE,
          fechaDesde,
          TipoComandosBusqueda.BETWEEN,
          fechaHasta,
        );
        criterios.push(criterio);
      }
      return;
    }

    if (desde) {
      const fechaDesde = this.funcionesDatos.formatearFechaParaBackend(
        desde,
        TipoFormatoFechaBackend.SOLO_FECHA,
      );

      if (fechaDesde) {
        const criterio = new DatosBusqueda();
        criterio.asignaUnCampoSinTrunc(
          TipoDatos.DATE,
          'fecha',
          fechaDesde,
          TipoComandosBusqueda.MAYOR_IGUAL,
        );
        criterios.push(criterio);
      }
    }

    if (hasta) {
      const fechaHasta = this.funcionesDatos.formatearFechaParaBackend(
        hasta,
        TipoFormatoFechaBackend.SOLO_FECHA,
      );

      if (fechaHasta) {
        const criterio = new DatosBusqueda();
        criterio.asignaUnCampoSinTrunc(
          TipoDatos.DATE,
          'fecha',
          fechaHasta,
          TipoComandosBusqueda.MENOR_IGUAL,
        );
        criterios.push(criterio);
      }
    }
  }

  private normalizarPrestamo(prestamo: Prestamo): Prestamo {
    return {
      ...prestamo,
      fecha: this.convertirFecha(prestamo.fecha) || prestamo.fecha,
      fechaInicio: this.convertirFecha(prestamo.fechaInicio) || prestamo.fechaInicio,
      fechaFin: this.convertirFecha(prestamo.fechaFin) || prestamo.fechaFin,
      fechaRegistro: this.convertirFecha(prestamo.fechaRegistro) || prestamo.fechaRegistro,
      fechaModificacion: this.convertirFecha(prestamo.fechaModificacion) || prestamo.fechaModificacion,
      fechaAprobacion: this.convertirFecha(prestamo.fechaAprobacion) || prestamo.fechaAprobacion,
      fechaAdjudicacion: this.convertirFecha(prestamo.fechaAdjudicacion) || prestamo.fechaAdjudicacion,
      fechaRechazo: this.convertirFecha(prestamo.fechaRechazo) || prestamo.fechaRechazo,
      fechaLegalizacion: this.convertirFecha(prestamo.fechaLegalizacion) || prestamo.fechaLegalizacion,
      fechaAcreditacion: this.convertirFecha(prestamo.fechaAcreditacion) || prestamo.fechaAcreditacion,
    };
  }

  private convertirFecha(fecha: unknown): Date | null {
    if (!fecha) {
      return null;
    }

    if (fecha instanceof Date) {
      return fecha;
    }

    if (Array.isArray(fecha) && fecha.length >= 3) {
      const [year, month, day, hours = 0, minutes = 0, seconds = 0] = fecha;
      return new Date(year, month - 1, day, hours, minutes, seconds);
    }

    const parsed = new Date(String(fecha));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private obtenerLabelEstadoFiltro(codigo: number): string {
    return this.obtenerEstadoFiltroOptions().find((item) => item.value === codigo)?.label ?? 'Todos';
  }

  private resolverEstadoCatalogo(prestamo: Prestamo): EstadoPrestamo | undefined {
    const idEstado = prestamo.idEstado;
    const codigoEstado = prestamo.estadoPrestamo?.codigo;
    const idEstadoDetalle = prestamo.estadoPrestamo?.idEstado;
    const codigoExternoDetalle = prestamo.estadoPrestamo?.codigoExterno;

    return this.estadosOptions().find(
      (item) =>
        (idEstado != null && (item.codigoExterno === idEstado || item.idEstado === idEstado)) ||
        (idEstadoDetalle != null && (item.codigoExterno === idEstadoDetalle || item.idEstado === idEstadoDetalle)) ||
        (codigoExternoDetalle != null && item.codigoExterno === codigoExternoDetalle) ||
        (codigoEstado != null && item.codigo === codigoEstado),
    );
  }

  private obtenerLabelProductoFiltro(codigo: number): string {
    return this.obtenerProductoFiltroOptions().find((item) => item.value === codigo)?.label ?? 'Todos';
  }

  private obtenerRangoFechaTexto(desde: Date | null, hasta: Date | null): string {
    const format = (fecha: Date | null) =>
      fecha
        ? new Intl.DateTimeFormat('es-EC', {
            dateStyle: 'medium',
          }).format(fecha)
        : '...';

    return `${format(desde)} - ${format(hasta)}`;
  }

  private inicioDelDia(fecha: Date): Date {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0, 0);
  }

  private finDelDia(fecha: Date): Date {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59, 999);
  }

  private sincronizarSeleccion(): void {
    const resumen = this.resumenEstados();

    if (!resumen.length) {
      this.selectedEstadoKey.set(null);
      return;
    }

    const existeSeleccion = resumen.some((item) => item.key === this.selectedEstadoKey());
    if (!existeSeleccion) {
      this.selectedEstadoKey.set(resumen[0].key);
    }
  }

  private construirWidget(
    id: ChartWidgetId,
    title: string,
    subtitle: string,
    icon: string,
    resumen: EstadoPrestamoResumen[],
  ): ChartWidget {
    const total = resumen.reduce((acc, item) => acc + this.obtenerValorResumenPorWidget(item, id), 0);

    return {
      id,
      title,
      subtitle,
      totalLabel: id === 'cantidad' ? 'Total operaciones' : 'Total consolidado',
      totalValue: id === 'cantidad' ? this.formatearNumero(total) : this.formatearMonedaCompacta(total),
      icon,
      slices: this.construirSlices(resumen, id, total),
    };
  }

  private construirSlices(
    resumen: EstadoPrestamoResumen[],
    widgetId: ChartWidgetId,
    total: number,
  ): ChartSlice[] {
    let acumulado = 0;

    return resumen.map((item) => {
      const value = this.obtenerValorResumenPorWidget(item, widgetId);
      const ratio = total > 0 ? value / total : 0;
      const segment = ratio * DONUT_CIRCUMFERENCE;
      const slice: ChartSlice = {
        key: item.key,
        label: item.label,
        color: item.color,
        value,
        percentage: ratio * 100,
        displayValue:
          widgetId === 'cantidad' ? this.formatearNumero(value) : this.formatearMonedaCompacta(value),
        dasharray: `${segment} ${Math.max(DONUT_CIRCUMFERENCE - segment, 0)}`,
        dashoffset: -acumulado,
      };

      acumulado += segment;
      return slice;
    });
  }

  private obtenerValorResumenPorWidget(item: EstadoPrestamoResumen, widgetId: ChartWidgetId): number {
    if (widgetId === 'valor') {
      return item.totalValor;
    }

    if (widgetId === 'saldo') {
      return item.totalSaldo;
    }

    return item.count;
  }

  private construirWidgetEntidadEstado(
    id: EntidadChartWidgetId,
    title: string,
    subtitle: string,
    icon: string,
    resumen: EstadoEntidadResumen[],
  ): EntidadChartWidget {
    const total = resumen.reduce((acc, item) => acc + this.obtenerValorEntidadPorWidget(item, id), 0);

    return {
      id,
      title,
      subtitle,
      totalLabel: id === 'participes' ? 'Total partícipes' : 'Total consolidado',
      totalValue: id === 'participes' ? this.formatearNumero(total) : this.formatearMonedaCompacta(total),
      icon,
      slices: this.construirSlicesEntidadEstado(resumen, id, total),
    };
  }

  private construirSlicesEntidadEstado(
    resumen: EstadoEntidadResumen[],
    widgetId: EntidadChartWidgetId,
    total: number,
  ): ChartSlice[] {
    let acumulado = 0;

    return resumen.map((item) => {
      const value = this.obtenerValorEntidadPorWidget(item, widgetId);
      const ratio = total > 0 ? value / total : 0;
      const segment = ratio * DONUT_CIRCUMFERENCE;
      const slice: ChartSlice = {
        key: item.key,
        label: item.label,
        color: item.color,
        value,
        percentage: ratio * 100,
        displayValue:
          widgetId === 'participes' ? this.formatearNumero(value) : this.formatearMonedaCompacta(value),
        dasharray: `${segment} ${Math.max(DONUT_CIRCUMFERENCE - segment, 0)}`,
        dashoffset: -acumulado,
      };

      acumulado += segment;
      return slice;
    });
  }

  private obtenerValorEntidadPorWidget(item: EstadoEntidadResumen, widgetId: EntidadChartWidgetId): number {
    if (widgetId === 'prestamos') {
      return item.totalPrestamos;
    }

    if (widgetId === 'aportes') {
      return item.totalAportes;
    }

    return item.participes;
  }

  private resolverEstadoEntidad(
    entidad: Entidad,
    estados: EstadoParticipe[],
  ): EstadoParticipe | undefined {
    const idEstado = entidad.idEstado;

    return estados.find(
      (item) =>
        (idEstado != null && item.codigo === idEstado) ||
        (idEstado != null && item.codigoExterno === idEstado) ||
        (idEstado != null && item.idEstado === idEstado),
    );
  }

  private aplicarFiltroFechaAportes(aportes: Aporte[]): Aporte[] {
    const { fechaDesde, fechaHasta } = this.filtrosFormValue();

    if (!fechaDesde && !fechaHasta) {
      return aportes;
    }

    const desde = fechaDesde ? this.inicioDelDia(fechaDesde) : null;
    const hasta = fechaHasta ? this.finDelDia(fechaHasta) : null;

    return aportes.filter((aporte) => {
      const fechaAporte = this.convertirFecha(aporte.fechaTransaccion);
      if (!fechaAporte) {
        return false;
      }

      const timestamp = fechaAporte.getTime();
      if (desde && timestamp < desde.getTime()) {
        return false;
      }
      if (hasta && timestamp > hasta.getTime()) {
        return false;
      }
      return true;
    });
  }

  private obtenerValorPorWidget(prestamo: Prestamo, widgetId: ChartWidgetId): number {
    if (widgetId === 'valor') {
      return this.obtenerValorPrestamo(prestamo);
    }

    if (widgetId === 'saldo') {
      return this.obtenerSaldoPrestamo(prestamo);
    }

    return this.obtenerMoraPrestamo(prestamo);
  }

  private obtenerValorPrestamo(prestamo: Prestamo): number {
    return this.aNumero(prestamo.totalPrestamo) || this.aNumero(prestamo.montoSolicitado);
  }

  private obtenerSaldoPrestamo(prestamo: Prestamo): number {
    return this.aNumero(prestamo.saldoTotal) || this.aNumero(prestamo.saldoCapital);
  }

  private obtenerMoraPrestamo(prestamo: Prestamo): number {
    return this.aNumero(prestamo.totalMora) || this.aNumero(prestamo.moraCalculada);
  }

  private obtenerVencidoPrestamo(prestamo: Prestamo): number {
    return this.aNumero(prestamo.saldoVencido);
  }

  private contarPrestamosEntidad(prestamos: Prestamo[], codigoEntidad: number): number {
    return prestamos.filter((item) => (item.entidad?.codigo ?? -1) === codigoEntidad).length;
  }

  private aNumero(valor: number | null | undefined): number {
    return Number.isFinite(Number(valor)) ? Number(valor) : 0;
  }

  private normalizarKey(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[^\w\s-]/g, '')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
  }

  private formatearNumero(valor: number): string {
    return this.numberFormatter.format(valor);
  }

  formatearMonedaCompacta(valor: number): string {
    return `$ ${this.compactFormatter.format(valor)}`;
  }

  formatearMoneda(valor: number): string {
    return `$ ${new Intl.NumberFormat('es-EC', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor)}`;
  }

  private obtenerPorcentaje(parte: number, total: number): string {
    if (!total) {
      return '0%';
    }

    return `${((parte / total) * 100).toFixed(1)}%`;
  }

  private scrollToCargaResumen(): void {
    const target = document.getElementById('carga-resumen-bloque');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

}
