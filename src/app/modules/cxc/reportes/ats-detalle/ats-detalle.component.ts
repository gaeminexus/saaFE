import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppStateService } from '../../../../shared/services/app-state.service';
import { ExportService } from '../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { fechaCsv } from '../../../../shared/utils/fecha-csv.util';
import { mensajeDeError } from '../../../../shared/utils/mensaje-error.util';
import { Facturador } from '../../model/facturador';
import { FacturadorService } from '../../service/facturador.service';
import { CompraAts, DetalleAts } from '../../model/ats';
import { AtsService } from '../../service/ats.service';

interface CompraRow extends CompraAts {
  fechaEmisionDate: Date | null;
  fechaRegistroDate: Date | null;
  fechaRetencionDate: Date | null;
}

/**
 * Detalle del ATS en pantalla, para comparar contra el archivo antes de generarlo —
 * docs/cxc/API-DETALLE-ATS.md. Muestra exactamente lo que arma `generarAts` (el mismo recorrido,
 * descartando el XML): no es un segundo cálculo del período, por eso comparte cifras y avisos con
 * `/ats/generar`. Se llega aquí en frío (URL directa) o desde el botón "Ver detalle" de la
 * pantalla del ATS, que precarga facturador y período por queryParams.
 */
@Component({
  selector: 'app-ats-detalle',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTabsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
  ],
  templateUrl: './ats-detalle.component.html',
  styleUrls: ['./ats-detalle.component.scss'],
})
export class AtsDetalleComponent implements OnInit {
  private facturadorS = inject(FacturadorService);
  private atsS = inject(AtsService);
  private appState = inject(AppStateService);
  private funcionesDatos = inject(FuncionesDatosService);
  private exportService = inject(ExportService);
  private route = inject(ActivatedRoute);

  /** Setters: la tabla de Compras solo existe en el DOM después de la primera consulta
   *  (`@if consultaHecha()`), así que el `ViewChild` normal llegaría `undefined` en
   *  `ngAfterViewInit`. Con setter, Angular reasigna en cuanto el elemento aparece. */
  @ViewChild(MatSort) set sortRef(ms: MatSort) {
    if (ms) this.comprasDataSource.sort = ms;
  }
  @ViewChild(MatPaginator) set paginatorRef(mp: MatPaginator) {
    if (mp) this.comprasDataSource.paginator = mp;
  }

  facturadores = signal<Facturador[]>([]);
  facturadorSeleccionado = signal<Facturador | null>(null);
  /** "yyyy-MM" del input type="month" — mismo criterio que ats.component. */
  periodoMes = signal<string>(this.mesAnteriorISO());

  anio = computed(() => Number(this.periodoMes().split('-')[0]) || 0);
  mes = computed(() => Number(this.periodoMes().split('-')[1]) || 0);
  private periodoValido = computed(() => this.anio() > 0 && this.mes() >= 1 && this.mes() <= 12);
  puedeConsultar = computed(() => !!this.facturadorSeleccionado() && this.periodoValido() && !this.cargando());

  cargando = signal(false);
  error = signal('');
  consultaHecha = signal(false);
  detalle = signal<DetalleAts | null>(null);

  /** 200 con todas las listas vacías: no es un error, es un período sin documentos. */
  sinDocumentos = computed(() => {
    const d = this.detalle();
    if (!d) return false;
    return d.compras.length === 0 && d.ventas.length === 0 && d.anulados.length === 0
      && d.excluidas.length === 0 && d.retencionesNoEnlazadas.length === 0;
  });

  filtroCompras = signal('');
  comprasDataSource = new MatTableDataSource<CompraRow>([]);
  readonly columnasCompras = [
    'expand', 'tipoComprobante', 'numeroDocumento', 'proveedor', 'idProv',
    'fechaEmision', 'fechaRegistro', 'baseNoGraIva', 'baseImponible', 'baseImpGrav',
    'baseImpExe', 'montoIva', 'montoIce', 'total', 'retencionIva', 'retencionRenta', 'numeroRetencion',
  ];
  filaExpandida = signal<CompraRow | null>(null);

  constructor() {
    this.comprasDataSource.filterPredicate = (row, filtro) => {
      const term = filtro.trim().toLowerCase();
      if (!term) return true;
      return (
        (row.proveedor || '').toLowerCase().includes(term)
        || (row.idProv || '').toLowerCase().includes(term)
        || (row.numeroDocumento || '').toLowerCase().includes(term)
      );
    };
    this.comprasDataSource.sortingDataAccessor = (row: CompraRow, columnaId: string) => {
      if (columnaId === 'fechaEmision') return row.fechaEmisionDate?.getTime() ?? 0;
      if (columnaId === 'fechaRegistro') return row.fechaRegistroDate?.getTime() ?? 0;
      return (row as unknown as Record<string, string | number>)[columnaId];
    };
  }

  ngOnInit(): void {
    this.cargarFacturadores();
  }

  /** Mismo criterio que "Cargar Extracto"/"Tablero de Cumplimiento": el mes anterior al actual, el que casi siempre se declara. */
  private mesAnteriorISO(): string {
    const hoy = new Date();
    let mes = hoy.getMonth(); // 0-based: mes actual - 1, ya "anterior"
    let anio = hoy.getFullYear();
    if (mes === 0) {
      mes = 12;
      anio -= 1;
    }
    return `${anio}-${String(mes).padStart(2, '0')}`;
  }

  private cargarFacturadores(): void {
    const idEmpresa = this.appState.getEmpresa()?.codigo;
    this.facturadorS.getAll().subscribe({
      next: (data) => {
        const todos = Array.isArray(data) ? data : [];
        const filtrados = idEmpresa != null
          ? todos.filter((f) => f.empresa?.codigo === idEmpresa)
          : todos;
        this.facturadores.set(filtrados.length > 0 ? filtrados : todos);
        this.precargarDesdeQueryParams();
      },
      error: () => this.facturadores.set([]),
    });
  }

  /** Si llegó desde "Ver detalle" (pantalla del ATS), precarga facturador/período y consulta sola. */
  private precargarDesdeQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const idFacturadorParam = params.get('idFacturador');
    const periodoParam = params.get('periodo');
    const lista = this.facturadores();

    let facturadorPrecargado: Facturador | null = null;
    if (idFacturadorParam) {
      facturadorPrecargado = lista.find((f) => f.id === Number(idFacturadorParam)) ?? null;
      if (facturadorPrecargado) this.facturadorSeleccionado.set(facturadorPrecargado);
    }
    if (periodoParam && /^\d{4}-\d{2}$/.test(periodoParam)) {
      this.periodoMes.set(periodoParam);
    }

    if (facturadorPrecargado && periodoParam) {
      this.consultar();
    } else {
      this.preseleccionarFacturador();
    }
  }

  /** Precarga el facturador de la sesión actual (mismo que usan las pantallas de emisión) si está en la lista. */
  private preseleccionarFacturador(): void {
    const raw = sessionStorage.getItem('facturador') || localStorage.getItem('facturador');
    let idSesion: number | null = null;
    if (raw) {
      try {
        idSesion = (JSON.parse(raw) as Facturador)?.id ?? null;
      } catch {
        idSesion = null;
      }
    }
    const lista = this.facturadores();
    const encontrado = idSesion != null ? lista.find((f) => f.id === idSesion) : null;
    this.facturadorSeleccionado.set(encontrado ?? lista[0] ?? null);
  }

  etiquetaFacturador(f: Facturador): string {
    return `${f.razonSocial || f.nombre} — ${f.numDoc}`;
  }

  consultar(): void {
    const facturador = this.facturadorSeleccionado();
    if (!this.puedeConsultar() || !facturador) return;

    this.cargando.set(true);
    this.error.set('');
    this.filaExpandida.set(null);

    this.atsS.detalle({ idFacturador: facturador.id, anio: this.anio(), mes: this.mes() }).subscribe({
      next: (resp) => {
        this.cargando.set(false);
        this.consultaHecha.set(true);
        this.detalle.set(resp);
        this.comprasDataSource.data = this.mapearCompras(resp.compras);
        if (this.comprasDataSource.paginator) this.comprasDataSource.paginator.firstPage();
      },
      error: (err: Error) => {
        this.cargando.set(false);
        this.consultaHecha.set(true);
        this.detalle.set(null);
        this.comprasDataSource.data = [];
        this.error.set(mensajeDeError(err, 'No se pudo consultar el detalle del ATS'));
      },
    });
  }

  private mapearCompras(compras: CompraAts[]): CompraRow[] {
    return (compras || []).map((c) => ({
      ...c,
      fechaEmisionDate: this.funcionesDatos.convertirFechaDesdeBackend(c.fechaEmision),
      fechaRegistroDate: this.funcionesDatos.convertirFechaDesdeBackend(c.fechaRegistro),
      fechaRetencionDate: this.funcionesDatos.convertirFechaDesdeBackend(c.fechaRetencion),
    }));
  }

  aplicarFiltroCompras(valor: string): void {
    this.filtroCompras.set(valor);
    this.comprasDataSource.filter = valor;
    if (this.comprasDataSource.paginator) this.comprasDataSource.paginator.firstPage();
  }

  toggleFila(row: CompraRow, evento?: Event): void {
    evento?.stopPropagation();
    this.filaExpandida.set(this.filaExpandida() === row ? null : row);
  }

  etiquetaFormasPago(row: CompraAts): string {
    return row.formasPago && row.formasPago.length > 0 ? row.formasPago.join(', ') : '—';
  }

  /** Para las tablas simples (Excluidas) que no pre-mapean sus fechas como las de Compras. */
  formatearFecha(fecha: unknown): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  // ---------- CSV — todas las filas filtradas, todas las columnas de §4.3, clave técnica en el encabezado ----------

  exportarComprasCSV(): void {
    const rows = this.comprasDataSource.filteredData;
    if (!rows.length) return;

    const headers = [
      'Origen', 'ID documento', 'Tipo comprobante (tipoComprobante)', 'Cod. sustento (codSustento)',
      'Tipo ID prov. (tpIdProv)', 'ID proveedor (idProv)', 'Proveedor', 'N° documento',
      'Establecimiento', 'Punto emisión', 'Secuencial', 'Autorización (autorizacion)',
      'F. emisión (fechaEmision)', 'F. registro (fechaRegistro)', 'F. registro capturada',
      'No objeto (baseNoGraIva)', 'Base 0% (baseImponible)', 'Base gravada (baseImpGrav)',
      'Exento (baseImpExe)', 'ICE (montoIce)', 'IVA (montoIva)', 'Total',
      'Ret. bienes 10% (valRetBien10)', 'Ret. servicios 20% (valRetServ20)',
      'Ret. bienes 30% (valorRetBienes)', 'Ret. servicios 50% (valRetServ50)',
      'Ret. servicios 70% (valorRetServicios)', 'Ret. servicios 100% (valRetServ100)',
      'Ret. IVA (retencionIva)', 'Ret. renta (retencionRenta)', 'N° retención (numeroRetencion)',
      'Autorización retención (autorizacionRetencion)', 'F. retención (fechaRetencion)',
      'Formas de pago (formasPago)', 'Formas de pago declaradas',
    ];
    const keys = [
      'origen', 'idDocumento', 'tipoComprobante', 'codSustento', 'tpIdProv', 'idProv', 'proveedor',
      'numeroDocumento', 'establecimiento', 'puntoEmision', 'secuencial', 'autorizacion',
      'fechaEmision', 'fechaRegistro', 'fechaRegistroCapturada', 'baseNoGraIva', 'baseImponible',
      'baseImpGrav', 'baseImpExe', 'montoIce', 'montoIva', 'total', 'valRetBien10', 'valRetServ20',
      'valorRetBienes', 'valRetServ50', 'valorRetServicios', 'valRetServ100', 'retencionIva',
      'retencionRenta', 'numeroRetencion', 'autorizacionRetencion', 'fechaRetencion', 'formasPago',
      'formasPagoDeclaradas',
    ];
    const plano = rows.map((r) => ({
      origen: r.origen,
      idDocumento: r.idDocumento,
      tipoComprobante: r.tipoComprobante,
      codSustento: r.codSustento,
      tpIdProv: r.tpIdProv,
      idProv: r.idProv,
      proveedor: r.proveedor,
      numeroDocumento: r.numeroDocumento,
      establecimiento: r.establecimiento,
      puntoEmision: r.puntoEmision,
      secuencial: r.secuencial,
      autorizacion: r.autorizacion,
      fechaEmision: fechaCsv(r.fechaEmisionDate),
      fechaRegistro: fechaCsv(r.fechaRegistroDate),
      fechaRegistroCapturada: r.fechaRegistroCapturada,
      baseNoGraIva: r.baseNoGraIva,
      baseImponible: r.baseImponible,
      baseImpGrav: r.baseImpGrav,
      baseImpExe: r.baseImpExe,
      montoIce: r.montoIce,
      montoIva: r.montoIva,
      total: r.total,
      valRetBien10: r.valRetBien10,
      valRetServ20: r.valRetServ20,
      valorRetBienes: r.valorRetBienes,
      valRetServ50: r.valRetServ50,
      valorRetServicios: r.valorRetServicios,
      valRetServ100: r.valRetServ100,
      retencionIva: r.retencionIva,
      retencionRenta: r.retencionRenta,
      numeroRetencion: r.numeroRetencion || '',
      autorizacionRetencion: r.autorizacionRetencion || '',
      fechaRetencion: fechaCsv(r.fechaRetencionDate),
      formasPago: (r.formasPago || []).join(' | '),
      formasPagoDeclaradas: r.formasPagoDeclaradas,
    }));
    this.exportService.exportToCSV(plano, `ATS-compras-${this.periodoMes()}`, headers, keys);
  }

  exportarVentasCSV(): void {
    const ventas = this.detalle()?.ventas ?? [];
    if (!ventas.length) return;
    const headers = [
      'Tipo ID cliente (tpIdCliente)', 'ID cliente (idCliente)', 'Cliente',
      'Tipo comprobante (tipoComprobante)', 'N° comprobantes (numeroComprobantes)',
      'No objeto (baseNoGraIva)', 'Base imponible (baseImponible)', 'Base gravada (baseImpGrav)',
      'IVA (montoIva)', 'ICE (montoIce)', 'Ret. IVA (valorRetIva)', 'Ret. renta (valorRetRenta)',
    ];
    const keys = [
      'tpIdCliente', 'idCliente', 'cliente', 'tipoComprobante', 'numeroComprobantes',
      'baseNoGraIva', 'baseImponible', 'baseImpGrav', 'montoIva', 'montoIce', 'valorRetIva', 'valorRetRenta',
    ];
    this.exportService.exportToCSV(ventas, `ATS-ventas-${this.periodoMes()}`, headers, keys);
  }

  exportarAnuladosCSV(): void {
    const anulados = this.detalle()?.anulados ?? [];
    if (!anulados.length) return;
    const headers = ['Tipo comprobante', 'Establecimiento', 'Punto emisión', 'Secuencial', 'Autorización'];
    const keys = ['tipoComprobante', 'establecimiento', 'puntoEmision', 'secuencial', 'autorizacion'];
    this.exportService.exportToCSV(anulados, `ATS-anulados-${this.periodoMes()}`, headers, keys);
  }

  exportarExcluidasCSV(): void {
    const excluidas = this.detalle()?.excluidas ?? [];
    if (!excluidas.length) return;
    const headers = [
      'ID documento', 'Tipo comprobante', 'ID proveedor', 'Proveedor', 'N° documento',
      'F. emisión', 'Subtotal', 'IVA', 'Total', 'Motivo', 'N° retención',
    ];
    const keys = [
      'idDocumento', 'tipoComprobante', 'idProv', 'proveedor', 'numeroDocumento',
      'fechaEmisionCsv', 'subtotal', 'montoIva', 'total', 'motivo', 'numeroRetencionCsv',
    ];
    const plano = excluidas.map((e) => ({
      ...e,
      fechaEmisionCsv: fechaCsv(this.funcionesDatos.convertirFechaDesdeBackend(e.fechaEmision)),
      numeroRetencionCsv: e.numeroRetencion || '',
    }));
    this.exportService.exportToCSV(plano, `ATS-excluidas-${this.periodoMes()}`, headers, keys);
  }

  exportarNoEnlazadasCSV(): void {
    const noEnlazadas = this.detalle()?.retencionesNoEnlazadas ?? [];
    if (!noEnlazadas.length) return;
    const headers = ['N° retención', 'Documento sustento', 'Autorización'];
    const keys = ['numeroRetencion', 'documentoSustento', 'autorizacion'];
    this.exportService.exportToCSV(noEnlazadas, `ATS-retenciones-no-enlazadas-${this.periodoMes()}`, headers, keys);
  }

  exportarAvisosCSV(): void {
    const avisos = this.detalle()?.avisos ?? [];
    if (!avisos.length) return;
    const plano = avisos.map((a) => ({ aviso: a }));
    this.exportService.exportToCSV(plano, `ATS-avisos-${this.periodoMes()}`, ['Aviso'], ['aviso']);
  }
}
