import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { FacturaEmitirService } from '../../service/emitir/factura-emitir.service';
import { MatTableDataSource } from '@angular/material/table';

interface ResultadoAgrupado {
  clave: string;
  label: string;
  subtotal: number;
  valorIVA: number;
  total: number;
  cantidad?: number;
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

interface ComparativaMetrica {
  label: string;
  value: number;
  displayValue: string;
  color: string;
  width: number;
}

const DONUT_RADIUS = 42;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const SAA_COLORS = [
  '#667eea',
  '#764ba2',
  '#f6ad55',
  '#17a2b8',
  '#8b5cf6',
  '#4f46e5',
  '#0ea5e9',
  '#a855f7',
  '#6366f1',
  '#7c3aed'
];

@Component({
  selector: 'app-dash-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  providers: [DatePipe],
  templateUrl: './dash-ventas.component.html',
  styleUrl: './dash-ventas.component.scss'
})
export class DashVentasComponent implements OnInit {
  private readonly facturaService = inject(FacturaEmitirService);
  private readonly datePipe = inject(DatePipe);

  anioSeleccionado: number = new Date().getFullYear();
  aniosDisponibles: number[] = [];
  fechaDesde: Date | null = null;
  fechaHasta: Date | null = null;
  tipoAgrupacion: 'mes' | 'cliente' | 'total' | 'semana' = 'mes';

  loading = signal<boolean>(false);
  datosOriginales: any[] = [];

  resultados: ResultadoAgrupado[] = [];
  dataSource = new MatTableDataSource<ResultadoAgrupado>([]);
  displayedColumns: string[] = ['label', 'cantidad', 'subtotal', 'valorIVA', 'total'];

  totalGeneral = {
    subtotal: 0,
    valorIVA: 0,
    total: 0,
    cantidad: 0
  };

  donutSlices: ChartSlice[] = [];
  comparativaMetricas: ComparativaMetrica[] = [];

  ngOnInit(): void {
    this.generarAniosDisponibles();
    this.fechaDesde = new Date(this.anioSeleccionado, 0, 1);
    this.fechaHasta = new Date(this.anioSeleccionado, 11, 31);
  }

  generarAniosDisponibles(): void {
    const anioActual = new Date().getFullYear();
    for (let i = anioActual + 1; i >= anioActual - 5; i--) {
      this.aniosDisponibles.push(i);
    }
  }

  onAnioChange(): void {
    this.fechaDesde = new Date(this.anioSeleccionado, 0, 1);
    this.fechaHasta = new Date(this.anioSeleccionado, 11, 31);
  }

  buscarDatos(): void {
    if (!this.fechaDesde || !this.fechaHasta) {
      alert('Debe seleccionar un rango de fechas');
      return;
    }

    if (this.fechaDesde > this.fechaHasta) {
      alert('La fecha inicial no puede ser mayor a la fecha final');
      return;
    }

    this.loading.set(true);
    this.facturaService.getAll().subscribe({
      next: (facturas) => {
        this.datosOriginales = (facturas || []).filter(factura => {
          const fecha = this.asDate(factura.fecha);
          return fecha && fecha >= this.fechaDesde! && fecha <= this.fechaHasta!;
        });

        this.agruparDatos();
      },
      error: (error) => {
        console.error('Error al buscar facturas:', error);
        alert('Error al cargar los datos: ' + (error.message || error));
        this.loading.set(false);
      }
    });
  }

  agruparDatos(): void {
    let agrupados: Map<string, ResultadoAgrupado> = new Map();

    switch (this.tipoAgrupacion) {
      case 'mes':
        agrupados = this.agruparPorMes();
        break;
      case 'cliente':
        agrupados = this.agruparPorCliente();
        break;
      case 'semana':
        agrupados = this.agruparPorSemana();
        break;
      case 'total':
        agrupados = this.agruparTotal();
        break;
    }

    this.resultados = Array.from(agrupados.values());
    this.dataSource.data = this.resultados;

    this.calcularTotalesGenerales();
    this.prepararVisualizaciones();
    this.loading.set(false);
  }

  private agruparPorMes(): Map<string, ResultadoAgrupado> {
    const agrupados = new Map<string, ResultadoAgrupado>();

    this.datosOriginales.forEach(factura => {
      const fecha = this.asDate(factura.fecha);
      if (!fecha) return;

      const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const label = fecha.toLocaleDateString('es-EC', { year: 'numeric', month: 'long' });
      this.acumularValores(agrupados, clave, label, factura);
    });

    return agrupados;
  }

  private agruparPorCliente(): Map<string, ResultadoAgrupado> {
    const agrupados = new Map<string, ResultadoAgrupado>();

    this.datosOriginales.forEach(factura => {
      if (!factura.titular) return;

      const clave = factura.titular.identificacion || factura.titular.id || 'sin-cliente';
      const label = `${factura.titular.razonSocial || factura.titular.nombre || 'Sin cliente'} (${clave})`;
      this.acumularValores(agrupados, clave, label, factura);
    });

    return agrupados;
  }

  private agruparPorSemana(): Map<string, ResultadoAgrupado> {
    const agrupados = new Map<string, ResultadoAgrupado>();

    this.datosOriginales.forEach(factura => {
      const fecha = this.asDate(factura.fecha);
      if (!fecha) return;

      const numeroSemana = this.getWeekNumber(fecha);
      const clave = `${fecha.getFullYear()}-W${String(numeroSemana).padStart(2, '0')}`;
      const label = `Semana ${numeroSemana} - ${fecha.getFullYear()}`;
      this.acumularValores(agrupados, clave, label, factura);
    });

    return agrupados;
  }

  private agruparTotal(): Map<string, ResultadoAgrupado> {
    const agrupados = new Map<string, ResultadoAgrupado>();
    const clave = 'total';
    const label = 'Total General';

    this.datosOriginales.forEach(factura => {
      this.acumularValores(agrupados, clave, label, factura);
    });

    return agrupados;
  }

  private acumularValores(
    agrupados: Map<string, ResultadoAgrupado>,
    clave: string,
    label: string,
    factura: any
  ): void {
    if (!agrupados.has(clave)) {
      agrupados.set(clave, {
        clave,
        label,
        subtotal: 0,
        valorIVA: 0,
        total: 0,
        cantidad: 0
      });
    }

    const grupo = agrupados.get(clave)!;
    grupo.subtotal += this.toNumber(factura.subtotal);
    grupo.valorIVA += this.toNumber(factura.vIVA || factura.pIVA || 0);
    grupo.total += this.toNumber(factura.total);
    grupo.cantidad = (grupo.cantidad || 0) + 1;
  }

  private calcularTotalesGenerales(): void {
    this.totalGeneral = { subtotal: 0, valorIVA: 0, total: 0, cantidad: 0 };

    this.resultados.forEach(item => {
      this.totalGeneral.subtotal += item.subtotal;
      this.totalGeneral.valorIVA += item.valorIVA;
      this.totalGeneral.total += item.total;
      this.totalGeneral.cantidad += (item.cantidad || 0);
    });
  }

  private prepararVisualizaciones(): void {
    const top10 = [...this.resultados]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const total = top10.reduce((acc, item) => acc + item.total, 0);
    let acumulado = 0;

    this.donutSlices = top10.map((item, index) => {
      const percentage = total > 0 ? (item.total / total) * 100 : 0;
      const segmento = (percentage / 100) * DONUT_CIRCUMFERENCE;
      const slice: ChartSlice = {
        key: item.clave,
        label: item.label,
        color: SAA_COLORS[index % SAA_COLORS.length],
        value: item.total,
        percentage,
        displayValue: `$${item.total.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        dasharray: `${segmento} ${DONUT_CIRCUMFERENCE - segmento}`,
        dashoffset: -acumulado
      };

      acumulado += segmento;
      return slice;
    });

    const metricasBase = [
      { label: 'Subtotal', value: this.totalGeneral.subtotal, color: '#667eea' },
      { label: 'IVA', value: this.totalGeneral.valorIVA, color: '#764ba2' },
      { label: 'Total', value: this.totalGeneral.total, color: '#f6ad55' }
    ];

    const maxValue = Math.max(...metricasBase.map(item => item.value), 1);

    this.comparativaMetricas = metricasBase.map(item => ({
      label: item.label,
      value: item.value,
      displayValue: `$${item.value.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: item.color,
      width: (item.value / maxValue) * 100
    }));
  }

  getWeekNumber(date: Date): number {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    return Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  exportarExcel(): void {
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      alert('Error: Librería XLSX no está cargada');
      return;
    }

    const nombreEmpresa = localStorage.getItem('empresaName') || 'Empresa';
    const fechaDesdeStr = this.datePipe.transform(this.fechaDesde, 'dd/MM/yyyy');
    const fechaHastaStr = this.datePipe.transform(this.fechaHasta, 'dd/MM/yyyy');
    const tipoTexto = this.obtenerTextoAgrupacion();

    const headerData = [
      ['Dashboard de Ventas'],
      [nombreEmpresa],
      [''],
      [`Período: ${fechaDesdeStr} - ${fechaHastaStr}`],
      [`Agrupación: ${tipoTexto}`],
      [''],
      ['Resumen General'],
      ['Facturas', 'Subtotal', 'IVA', 'Total'],
      [
        this.totalGeneral.cantidad.toString(),
        `$${this.totalGeneral.subtotal.toFixed(2)}`,
        `$${this.totalGeneral.valorIVA.toFixed(2)}`,
        `$${this.totalGeneral.total.toFixed(2)}`
      ],
      [''],
      ['Detalle por Categoría'],
      ['Categoría', 'Cantidad', 'Subtotal', 'IVA', 'Total']
    ];

    const datos = this.resultados.map(r => [
      r.label,
      (r.cantidad || 0).toString(),
      parseFloat(r.subtotal.toFixed(2)),
      parseFloat(r.valorIVA.toFixed(2)),
      parseFloat(r.total.toFixed(2))
    ]);

    datos.push([
      'TOTALES',
      this.totalGeneral.cantidad,
      parseFloat(this.totalGeneral.subtotal.toFixed(2)),
      parseFloat(this.totalGeneral.valorIVA.toFixed(2)),
      parseFloat(this.totalGeneral.total.toFixed(2))
    ]);

    const ws = XLSX.utils.aoa_to_sheet([...headerData, ...datos]);
    ws['!cols'] = [{ wch: 40 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dashboard');

    const fechaStr = this.datePipe.transform(this.fechaDesde, 'dd-MM-yyyy');
    XLSX.writeFile(wb, `dashboard-ventas-${fechaStr}.xlsx`);
  }

  private obtenerTextoAgrupacion(): string {
    const tipos: Record<string, string> = {
      mes: 'Por Mes',
      semana: 'Por Semana',
      cliente: 'Por Cliente',
      total: 'Total General'
    };
    return tipos[this.tipoAgrupacion] || this.tipoAgrupacion;
  }

  limpiar(): void {
    this.fechaDesde = new Date(this.anioSeleccionado, 0, 1);
    this.fechaHasta = new Date(this.anioSeleccionado, 11, 31);
    this.tipoAgrupacion = 'mes';
    this.resultados = [];
    this.dataSource.data = [];
    this.datosOriginales = [];
    this.totalGeneral = { subtotal: 0, valorIVA: 0, total: 0, cantidad: 0 };
    this.donutSlices = [];
    this.comparativaMetricas = [];
  }

  private asDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
