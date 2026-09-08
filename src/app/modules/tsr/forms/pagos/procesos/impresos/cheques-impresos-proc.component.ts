import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppStateService } from '../../../../../../shared/services/app-state.service';
import { DetalleRubroService } from '../../../../../../shared/services/detalle-rubro.service';
import { ExportService } from '../../../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../../../shared/services/funciones-datos.service';
import { fechaCsv } from '../../../../../../shared/utils/fecha-csv.util';
import { ChequeListado, destinoVerPago } from '../../../../model/cheque-listado';
import { CuentaBancaria } from '../../../../model/cuenta-bancaria';
import { ChequeService } from '../../../../service/cheque.service';
import { CuentaBancariaService } from '../../../../service/cuenta-bancaria.service';

const RUBRO_ESTADO_CHEQUE = 26;
const ESTADO_IMPRESO = 4;

/**
 * Cheques ya impresos (estado 4) pendientes de entregar. Antes tenía filas
 * hardcodeadas; ahora consulta GET /dtch/listar.
 */
@Component({
  selector: 'app-cheques-impresos-proc',
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
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './cheques-impresos-proc.component.html',
  styleUrls: ['./cheques-impresos-proc.component.scss'],
})
export class ChequesImpresosProcComponent implements OnInit, AfterViewChecked {
  private chequeService = inject(ChequeService);
  private cuentaService = inject(CuentaBancariaService);
  private detalleRubroService = inject(DetalleRubroService);
  private appState = inject(AppStateService);
  private funcionesDatos = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private exportService = inject(ExportService);

  @ViewChild(MatSort) sort?: MatSort;
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  readonly dataSource = new MatTableDataSource<ChequeListado>([]);

  cuentas = signal<CuentaBancaria[]>([]);
  idCuentaFiltro = signal<number | null>(null);
  desde = signal<string>('');
  hasta = signal<string>('');

  rows = signal<ChequeListado[]>([]);
  loading = signal(false);
  marcando = signal(false);

  seleccionados = signal<Set<number>>(new Set());

  total = computed(() => this.rows().reduce((s, r) => s + (Number(r.valor) || 0), 0));
  todosSeleccionados = computed(() => this.rows().length > 0 && this.seleccionados().size === this.rows().length);

  readonly columnas = ['check', 'numero', 'beneficiario', 'cuenta', 'fecha', 'tipoPago', 'referencia', 'valor', 'estado', 'acciones'];

  constructor() {
    // Sincroniza la MatTableDataSource con el signal para que matSort y el
    // paginador funcionen (mismo patrón que mayor-analitico-v2.component.ts).
    effect(() => { this.dataSource.data = this.rows(); });

    this.dataSource.sortingDataAccessor = (row: ChequeListado, property: string) => {
      switch (property) {
        case 'fecha':     return this.fechaGiroTimestamp(row);
        case 'valor':     return Number(row.valor) || 0;
        case 'cuenta':    return this.cuentaBanco(row);
        case 'referencia': return row.referenciaPago || '';
        case 'tipoPago':  return this.etiquetaTipoPago(row.tipoPago);
        case 'estado':    return row.estado ?? 0;
        default:          return (row as any)[property] ?? '';
      }
    };
  }

  ngOnInit(): void {
    this.cargarCuentas();
    this.buscar();
  }

  ngAfterViewChecked(): void {
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
  }

  private cargarCuentas(): void {
    this.cuentaService.getAll().subscribe({
      next: (data) => this.cuentas.set(Array.isArray(data) ? (data as CuentaBancaria[]) : []),
      error: () => this.cuentas.set([]),
    });
  }

  buscar(): void {
    const idEmpresa = this.appState.getEmpresa()?.codigo;
    if (!idEmpresa) {
      this.rows.set([]);
      this.snackBar.open('No se pudo determinar la empresa de la sesión', 'Cerrar', { duration: 6000 });
      return;
    }

    this.loading.set(true);
    this.seleccionados.set(new Set());
    this.chequeService
      .listar({
        idEmpresa,
        idCuenta: this.idCuentaFiltro() ?? undefined,
        estado: ESTADO_IMPRESO,
        desde: this.desde() || undefined,
        hasta: this.hasta() || undefined,
      })
      .subscribe({
        next: (data) => {
          this.rows.set(Array.isArray(data) ? data : []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.rows.set([]);
          this.snackBar.open(ChequeService.mensajeError(err), 'Cerrar', { duration: 6000 });
        },
      });
  }

  limpiarFiltros(): void {
    this.idCuentaFiltro.set(null);
    this.desde.set('');
    this.hasta.set('');
    this.buscar();
  }

  estaSeleccionado(row: ChequeListado): boolean {
    return this.seleccionados().has(row.idCheque);
  }

  alternarSeleccion(row: ChequeListado): void {
    const set = new Set(this.seleccionados());
    if (set.has(row.idCheque)) set.delete(row.idCheque);
    else set.add(row.idCheque);
    this.seleccionados.set(set);
  }

  alternarTodos(): void {
    this.seleccionados.set(this.todosSeleccionados() ? new Set() : new Set(this.rows().map((r) => r.idCheque)));
  }

  marcarEntregados(): void {
    const ids = Array.from(this.seleccionados());
    if (!ids.length) return;

    this.marcando.set(true);
    this.chequeService.entregar(ids, this.appState.getIdUsuario()).subscribe({
      next: () => {
        this.marcando.set(false);
        this.snackBar.open(`✓ ${ids.length} cheque(s) marcado(s) como entregados`, 'Cerrar', {
          duration: 4000,
          panelClass: ['snackbar-success'],
        });
        this.buscar();
      },
      error: (err) => {
        this.marcando.set(false);
        this.snackBar.open(ChequeService.mensajeError(err), 'Cerrar', { duration: 6000 });
      },
    });
  }

  etiquetaEstado(estado: number): string {
    return this.detalleRubroService.getDescripcionByParentAndAlterno(RUBRO_ESTADO_CHEQUE, estado) || `Estado ${estado}`;
  }

  etiquetaTipoPago(tipo: ChequeListado['tipoPago']): string {
    switch (tipo) {
      case 'FACTURA': return 'Factura';
      case 'EGRESO': return 'Egreso';
      case 'ANTICIPO': return 'Anticipo';
      case 'EXTERNO': return 'Externo';
      default: return '—';
    }
  }

  fechaGiro(row: ChequeListado): string {
    const fecha = this.fechaGiroRaw(row);
    if (!fecha) return '—';
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA);
  }

  private fechaGiroRaw(row: ChequeListado): unknown {
    return row.fechaUso ?? row.fechaImpresion ?? row.fechaEntrega ?? null;
  }

  /** Valor crudo (timestamp) para que matSort ordene por la fecha real, no por el string formateado. */
  private fechaGiroTimestamp(row: ChequeListado): number {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(this.fechaGiroRaw(row));
    return d ? d.getTime() : 0;
  }

  cuentaBanco(row: ChequeListado): string {
    return [row.numeroCuenta, row.banco].filter((v) => !!v).join(' — ') || '—';
  }

  /** true cuando "Ver pago" tiene a dónde navegar (no aplica a EXTERNO). */
  tieneDestinoVerPago(row: ChequeListado): boolean {
    return destinoVerPago(row.tipoPago, row.idDocumento) != null;
  }

  verPago(row: ChequeListado): void {
    const destino = destinoVerPago(row.tipoPago, row.idDocumento);
    if (!destino) return;
    this.router.navigate([destino.ruta], { queryParams: destino.queryParams });
  }

  /** Exporta lo que se está viendo — ya filtrado en el servidor por cuenta/fecha/estado IMPRESO. */
  exportarCSV(): void {
    const rows = this.rows();
    if (!rows.length) {
      this.snackBar.open('No hay cheques para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    const plano = rows.map((r) => ({
      numero: r.numero,
      beneficiario: r.beneficiario || '',
      cuenta: this.cuentaBanco(r),
      fecha: fechaCsv(this.funcionesDatos.convertirFechaDesdeBackend(this.fechaGiroRaw(r))),
      tipoPago: this.etiquetaTipoPago(r.tipoPago),
      referencia: r.referenciaPago || '',
      valor: Number(r.valor || 0),
      estado: this.etiquetaEstado(r.estado),
    }));

    const headers = ['Número', 'Beneficiario', 'Cuenta', 'Fecha', 'Tipo de pago', 'Referencia', 'Valor', 'Estado'];
    const keys = ['numero', 'beneficiario', 'cuenta', 'fecha', 'tipoPago', 'referencia', 'valor', 'estado'];
    this.exportService.exportToCSV(plano, `cheques_impresos_${fechaCsv(new Date())}`, headers, keys);
  }
}
