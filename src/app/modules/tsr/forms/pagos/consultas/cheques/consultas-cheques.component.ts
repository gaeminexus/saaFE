import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
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
import { DetalleRubro } from '../../../../../../shared/model/detalle-rubro';
import { DetalleRubroService } from '../../../../../../shared/services/detalle-rubro.service';
import { ExportService } from '../../../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../../../shared/services/funciones-datos.service';
import { fechaCsv } from '../../../../../../shared/utils/fecha-csv.util';
import { ChequeListado, destinoVerPago } from '../../../../model/cheque-listado';
import { CuentaBancaria } from '../../../../model/cuenta-bancaria';
import { ChequeService } from '../../../../service/cheque.service';
import { CuentaBancariaService } from '../../../../service/cuenta-bancaria.service';

const RUBRO_ESTADO_CHEQUE = 26;

/**
 * Consulta de cheques en cualquier estado, con filtros de cuenta, estado y
 * rango de fechas. Antes tenía filas hardcodeadas; ahora consulta
 * GET /dtch/listar.
 */
@Component({
  selector: 'app-consultas-cheques',
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
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './consultas-cheques.component.html',
  styleUrls: ['./consultas-cheques.component.scss'],
})
export class ConsultasChequesComponent implements OnInit, AfterViewChecked {
  private chequeService = inject(ChequeService);
  private cuentaService = inject(CuentaBancariaService);
  private detalleRubroService = inject(DetalleRubroService);
  private appState = inject(AppStateService);
  private funcionesDatos = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private exportService = inject(ExportService);

  cuentas = signal<CuentaBancaria[]>([]);
  estados = signal<DetalleRubro[]>([]);

  idCuentaFiltro = signal<number | null>(null);
  estadoFiltro = signal<number | null>(null);
  desde = signal<string>('');
  hasta = signal<string>('');

  rows = signal<ChequeListado[]>([]);
  loading = signal(false);

  total = computed(() => this.rows().reduce((s, r) => s + (Number(r.valor) || 0), 0));

  readonly columnas = ['numero', 'beneficiario', 'cuenta', 'fecha', 'tipoPago', 'referencia', 'valor', 'estado', 'acciones'];

  readonly dataSource = new MatTableDataSource<ChequeListado>([]);
  @ViewChild(MatSort) sort?: MatSort;
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  constructor() {
    // Mantiene la MatTableDataSource sincronizada con el signal — matSort/paginator
    // siguen funcionando sin depender de dataSource.filter (el filtro real ya lo
    // aplica el backend en buscar()).
    effect(() => { this.dataSource.data = this.rows(); });

    this.dataSource.sortingDataAccessor = (item: ChequeListado, property: string) => {
      switch (property) {
        case 'fecha': {
          const raw = (item as any).fechaUso ?? (item as any).fechaImpresion ?? (item as any).fechaEntrega ?? null;
          const d = this.funcionesDatos.convertirFechaDesdeBackend(raw);
          return d ? d.getTime() : 0;
        }
        case 'cuenta': return this.cuentaBanco(item);
        case 'referencia': return (item as any).referenciaPago || '';
        case 'estado': return this.etiquetaEstado(item.estado);
        case 'tipoPago': return this.etiquetaTipoPago(item.tipoPago);
        default: return (item as any)[property] ?? '';
      }
    };
  }

  ngAfterViewChecked(): void {
    if (this.sort && this.dataSource.sort !== this.sort) this.dataSource.sort = this.sort;
    if (this.paginator && this.dataSource.paginator !== this.paginator) this.dataSource.paginator = this.paginator;
  }

  ngOnInit(): void {
    this.cargarCuentas();
    this.estados.set(this.detalleRubroService.getDetallesByParent(RUBRO_ESTADO_CHEQUE));
    this.buscar();
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
    this.chequeService
      .listar({
        idEmpresa,
        idCuenta: this.idCuentaFiltro() ?? undefined,
        estado: this.estadoFiltro() ?? undefined,
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
    this.estadoFiltro.set(null);
    this.desde.set('');
    this.hasta.set('');
    this.buscar();
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
    const fecha = row.fechaUso ?? row.fechaImpresion ?? row.fechaEntrega ?? null;
    if (!fecha) return '—';
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA);
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

  /** Exporta lo que se está viendo — ya filtrado en el servidor por cuenta/fecha/estado elegidos. */
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
      fecha: fechaCsv(this.funcionesDatos.convertirFechaDesdeBackend(r.fechaUso ?? r.fechaImpresion ?? r.fechaEntrega ?? null)),
      tipoPago: this.etiquetaTipoPago(r.tipoPago),
      referencia: r.referenciaPago || '',
      valor: Number(r.valor || 0),
      estado: this.etiquetaEstado(r.estado),
    }));

    const headers = ['Número', 'Beneficiario', 'Cuenta', 'Fecha', 'Tipo de pago', 'Referencia', 'Valor', 'Estado'];
    const keys = ['numero', 'beneficiario', 'cuenta', 'fecha', 'tipoPago', 'referencia', 'valor', 'estado'];
    this.exportService.exportToCSV(plano, `consulta_cheques_${fechaCsv(new Date())}`, headers, keys);
  }
}
