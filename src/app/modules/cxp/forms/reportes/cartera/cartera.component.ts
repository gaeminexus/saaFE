import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
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

import { AppStateService } from '../../../../../shared/services/app-state.service';
import { empresaSesionCodigo } from '../../../../../shared/services/empresa-sesion';
import { ExportService } from '../../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { fechaCsv } from '../../../../../shared/utils/fecha-csv.util';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { Titular } from '../../../../tsr/model/titular';

import { DocumentoCartera, ReporteCartera, ResumenTitularCartera, TipoCartera, TramoCartera } from '../../../model/cartera';
import { AplicacionPagoCxpService } from '../../../service/aplicacion-pago-cxp.service';
import { AplicacionPagoCxcService } from '../../../../cxc/service/aplicacion-pago-cxc.service';

const ROL_PROVEEDOR = 2;
const ROL_CLIENTE = 1;

const TRAMO_LABELS: Record<TramoCartera, string> = {
  POR_VENCER: 'Por vencer',
  D1_30: '1-30 días',
  D31_60: '31-60 días',
  D61_90: '61-90 días',
  MAS_90: 'Más de 90 días',
};

interface DocumentoRow extends DocumentoCartera {
  fechaEmisionDate: Date | null;
  fechaVencimientoDate: Date | null;
}

/**
 * Cartera por pagar y por cobrar — pantalla única para las dos, con el modo elegido por
 * `data.tipo` de la ruta (docs/cxp/API-CARTERA-CXP-CXC.md §5.1, espejo idéntico en docs/cxc/).
 * Lee de las mismas aplicaciones que ya calculan `/aplp/saldo` y `/aplc/saldo` — no es un
 * segundo cálculo del saldo, solo lo agrega por titular y por antigüedad (§6.1).
 */
@Component({
  selector: 'app-cartera',
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
    MatExpansionModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatTabsModule,
    MatDialogModule,
  ],
  templateUrl: './cartera.component.html',
  styleUrls: ['./cartera.component.scss'],
})
export class CarteraComponent implements OnInit {
  private pagoCxpS = inject(AplicacionPagoCxpService);
  private pagoCxcS = inject(AplicacionPagoCxcService);
  private appState = inject(AppStateService);
  private funcionesDatos = inject(FuncionesDatosService);
  private exportService = inject(ExportService);
  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);

  readonly tipo: TipoCartera = (this.route.snapshot.data['tipo'] as TipoCartera) ?? 'POR_PAGAR';
  readonly esCxp = this.tipo === 'POR_PAGAR';
  readonly titulo = this.esCxp ? 'Cuentas por Pagar' : 'Cuentas por Cobrar';
  readonly etiquetaRolTitular = this.esCxp ? 'Proveedor' : 'Cliente';
  private readonly rolTitular = this.esCxp ? ROL_PROVEEDOR : ROL_CLIENTE;
  private readonly prefijoArchivo = this.esCxp ? 'cartera-por-pagar' : 'cartera-por-cobrar';

  readonly tramoOptions = (Object.entries(TRAMO_LABELS) as [TramoCartera, string][]).map(
    ([codigo, texto]) => ({ codigo, texto }),
  );

  fechaCorte = signal<string>(this.hoyISO());
  titularFiltro = signal<Titular | null>(null);

  cargando = signal(false);
  error = signal('');
  consultaHecha = signal(false);
  reporte = signal<ReporteCartera | null>(null);

  /** 200 con todo vacío: no es un error, es que no hay documentos pendientes a esa fecha (§5.2). */
  sinDocumentos = computed(() => {
    const r = this.reporte();
    return !!r && r.documentos.length === 0;
  });

  // ── Resumen por titular ────────────────────────────────────────────
  filtroTextoResumen = signal('');
  @ViewChild('sortResumen') set sortResumenRef(ms: MatSort) {
    if (ms) this.resumenDataSource.sort = ms;
  }
  @ViewChild('paginatorResumen') set paginatorResumenRef(mp: MatPaginator) {
    if (mp) this.resumenDataSource.paginator = mp;
  }
  resumenDataSource = new MatTableDataSource<ResumenTitularCartera>([]);
  readonly columnasResumen = [
    'expand', 'identificacion', 'titular', 'documentos', 'total', 'aplicado', 'saldo',
    'porVencer', 'd1a30', 'd31a60', 'd61a90', 'mas90', 'anticiposDisponibles', 'saldoNeto',
  ];
  titularExpandido = signal<number | null>(null);

  // ── Documentos ──────────────────────────────────────────────────────
  filtroTextoDocs = signal('');
  filtroTramoDocs = signal<TramoCartera | null>(null);
  @ViewChild('sortDocs') set sortDocsRef(ms: MatSort) {
    if (ms) this.documentosDataSource.sort = ms;
  }
  @ViewChild('paginatorDocs') set paginatorDocsRef(mp: MatPaginator) {
    if (mp) this.documentosDataSource.paginator = mp;
  }
  documentosDataSource = new MatTableDataSource<DocumentoRow>([]);
  readonly columnasDocumentos = [
    'tipoDocumento', 'numeroDocumento', 'titular', 'identificacion',
    'fechaEmision', 'fechaVencimiento', 'diasVencido', 'tramo', 'total', 'saldo',
  ];

  constructor() {
    this.resumenDataSource.filterPredicate = (row, filtro) => {
      const t = filtro.trim().toLowerCase();
      if (!t) return true;
      return (row.identificacion || '').toLowerCase().includes(t)
        || (row.titular || '').toLowerCase().includes(t);
    };

    this.documentosDataSource.filterPredicate = (row, filtroJson) => {
      let criterios: { texto: string; tramo: TramoCartera | null };
      try {
        criterios = JSON.parse(filtroJson);
      } catch {
        criterios = { texto: '', tramo: null };
      }
      if (criterios.tramo && row.tramo !== criterios.tramo) return false;
      const t = criterios.texto.trim().toLowerCase();
      if (!t) return true;
      return (row.numeroDocumento || '').toLowerCase().includes(t)
        || (row.titular || '').toLowerCase().includes(t)
        || (row.identificacion || '').toLowerCase().includes(t);
    };

    this.documentosDataSource.sortingDataAccessor = (row: DocumentoRow, columnaId: string) => {
      if (columnaId === 'fechaEmision') return row.fechaEmisionDate?.getTime() ?? 0;
      if (columnaId === 'fechaVencimiento') return row.fechaVencimientoDate?.getTime() ?? 0;
      return (row as unknown as Record<string, string | number>)[columnaId];
    };
  }

  ngOnInit(): void {
    this.consultar();
  }

  private hoyISO(): string {
    const hoy = new Date();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    return `${hoy.getFullYear()}-${m}-${d}`;
  }

  etiquetaTitularFiltro(): string {
    const t = this.titularFiltro();
    if (!t) return '';
    return t.razonSocial || t.nombre || t.identificacion || `Titular ${t.codigo}`;
  }

  buscarTitular(): void {
    this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: {
        rolCodigo: this.rolTitular,
        rolNombre: this.etiquetaRolTitular.toUpperCase(),
        titulo: `Buscar ${this.etiquetaRolTitular}`,
      },
    }).afterClosed().subscribe((titular: Titular | null) => {
      if (titular) this.titularFiltro.set(titular);
    });
  }

  quitarTitular(): void {
    this.titularFiltro.set(null);
  }

  consultar(): void {
    const idEmpresa = empresaSesionCodigo() ?? this.appState.getEmpresa()?.codigo ?? null;
    if (!idEmpresa) {
      this.error.set('No se pudo determinar la empresa de la sesión');
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.titularExpandido.set(null);

    const params = {
      idEmpresa,
      fechaCorte: this.fechaCorte() || undefined,
      idTitular: this.titularFiltro()?.codigo ?? undefined,
    };

    const llamada = this.esCxp ? this.pagoCxpS.carteraPorPagar(params) : this.pagoCxcS.carteraPorCobrar(params);

    llamada.subscribe({
      next: (resp) => {
        this.cargando.set(false);
        this.consultaHecha.set(true);
        this.reporte.set(resp);
        this.resumenDataSource.data = resp.resumen ?? [];
        this.documentosDataSource.data = this.mapearDocumentos(resp.documentos ?? []);
        if (this.resumenDataSource.paginator) this.resumenDataSource.paginator.firstPage();
        if (this.documentosDataSource.paginator) this.documentosDataSource.paginator.firstPage();
      },
      error: (err: Error) => {
        this.cargando.set(false);
        this.consultaHecha.set(true);
        this.reporte.set(null);
        this.resumenDataSource.data = [];
        this.documentosDataSource.data = [];
        this.error.set(mensajeDeError(err, 'No se pudo consultar la cartera'));
      },
    });
  }

  private mapearDocumentos(documentos: DocumentoCartera[]): DocumentoRow[] {
    return documentos.map((d) => ({
      ...d,
      fechaEmisionDate: this.funcionesDatos.convertirFechaDesdeBackend(d.fechaEmision),
      fechaVencimientoDate: this.funcionesDatos.convertirFechaDesdeBackend(d.fechaVencimiento),
    }));
  }

  // ── Resumen: filtro y fila expandible ───────────────────────────────

  aplicarFiltroResumen(valor: string): void {
    this.filtroTextoResumen.set(valor);
    this.resumenDataSource.filter = valor;
    if (this.resumenDataSource.paginator) this.resumenDataSource.paginator.firstPage();
  }

  toggleTitular(idTitular: number): void {
    this.titularExpandido.set(this.titularExpandido() === idTitular ? null : idTitular);
  }

  /** Documentos de ese titular, filtrados en el cliente de lo que ya llegó — sin otra llamada (§5.2). */
  documentosDeTitular(idTitular: number): DocumentoRow[] {
    return this.documentosDataSource.data.filter((d) => d.idTitular === idTitular);
  }

  // ── Documentos: filtros ─────────────────────────────────────────────

  private aplicarFiltrosDocumentos(): void {
    this.documentosDataSource.filter = JSON.stringify({
      texto: this.filtroTextoDocs(),
      tramo: this.filtroTramoDocs(),
    });
    if (this.documentosDataSource.paginator) this.documentosDataSource.paginator.firstPage();
  }

  onCambioFiltroTextoDocs(valor: string): void {
    this.filtroTextoDocs.set(valor);
    this.aplicarFiltrosDocumentos();
  }

  onCambioFiltroTramoDocs(valor: TramoCartera | null): void {
    this.filtroTramoDocs.set(valor);
    this.aplicarFiltrosDocumentos();
  }

  /** Clave real de un documento — nunca el id solo: FCTC y LQCC tienen ids independientes (§6.6). */
  claveDocumento(d: DocumentoCartera): string {
    return `${d.tipoDocumento}-${d.idDocumento}`;
  }

  trackByDocumento = (_: number, d: DocumentoCartera): string => this.claveDocumento(d);

  etiquetaTramo(tramo: TramoCartera): string {
    return TRAMO_LABELS[tramo] ?? tramo;
  }

  // ── CSV — todas las filas filtradas, todas las columnas del DTO ─────

  exportarResumenCSV(): void {
    const rows = this.resumenDataSource.filteredData;
    if (!rows.length) return;
    const headers = [
      'ID titular', 'Identificación', 'Titular', 'Documentos', 'Total', 'Aplicado', 'Saldo',
      'Por vencer', '1-30 días', '31-60 días', '61-90 días', 'Más de 90 días',
      'Anticipos disponibles', 'Saldo neto',
    ];
    const keys = [
      'idTitular', 'identificacion', 'titular', 'documentos', 'total', 'aplicado', 'saldo',
      'porVencer', 'd1a30', 'd31a60', 'd61a90', 'mas90', 'anticiposDisponibles', 'saldoNeto',
    ];
    this.exportService.exportToCSV(rows, `${this.prefijoArchivo}-resumen-${this.fechaCorte()}`, headers, keys);
  }

  exportarDetalleCSV(): void {
    const rows = this.documentosDataSource.filteredData;
    if (!rows.length) return;
    const headers = [
      'Tipo de documento', 'ID documento', 'N° documento', 'F. emisión', 'Plazo (días)',
      'F. vencimiento', 'Días vencido', 'Tramo', 'ID titular', 'Identificación', 'Titular',
      'Total', 'Pagado', 'Notas de crédito', 'Retenciones', 'Anticipos', 'Notas de débito',
      'Caja chica', 'Aplicado', 'Saldo', 'Sobrepagado', 'Intermediario',
    ];
    const keys = [
      'tipoDocumento', 'idDocumento', 'numeroDocumento', 'fechaEmisionCsv', 'plazoDias',
      'fechaVencimientoCsv', 'diasVencido', 'tramo', 'idTitular', 'identificacion', 'titular',
      'total', 'pagado', 'notasCredito', 'retenciones', 'anticipos', 'notasDebito',
      'cajaChica', 'aplicado', 'saldo', 'sobrepagado', 'intermediario',
    ];
    const plano = rows.map((r) => ({
      tipoDocumento: r.tipoDocumento,
      idDocumento: r.idDocumento,
      numeroDocumento: r.numeroDocumento,
      fechaEmisionCsv: fechaCsv(r.fechaEmisionDate),
      plazoDias: r.plazoDias ?? '',
      fechaVencimientoCsv: fechaCsv(r.fechaVencimientoDate),
      diasVencido: r.diasVencido,
      tramo: this.etiquetaTramo(r.tramo),
      idTitular: r.idTitular,
      identificacion: r.identificacion,
      titular: r.titular,
      total: r.total,
      pagado: r.pagado,
      notasCredito: r.notasCredito,
      retenciones: r.retenciones,
      anticipos: r.anticipos,
      notasDebito: r.notasDebito,
      cajaChica: r.cajaChica ?? '',
      aplicado: r.aplicado,
      saldo: r.saldo,
      sobrepagado: r.sobrepagado,
      intermediario: r.intermediario ?? '',
    }));
    this.exportService.exportToCSV(plano, `${this.prefijoArchivo}-detalle-${this.fechaCorte()}`, headers, keys);
  }
}
