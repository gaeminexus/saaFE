import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppStateService } from '../../../../../../shared/services/app-state.service';
import { DetalleRubroService } from '../../../../../../shared/services/detalle-rubro.service';
import { FuncionesDatosService } from '../../../../../../shared/services/funciones-datos.service';
import { ChequeListado } from '../../../../model/cheque-listado';
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
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './cheques-impresos-proc.component.html',
  styleUrls: ['./cheques-impresos-proc.component.scss'],
})
export class ChequesImpresosProcComponent implements OnInit {
  private chequeService = inject(ChequeService);
  private cuentaService = inject(CuentaBancariaService);
  private detalleRubroService = inject(DetalleRubroService);
  private appState = inject(AppStateService);
  private funcionesDatos = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);

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

  ngOnInit(): void {
    this.cargarCuentas();
    this.buscar();
  }

  private cargarCuentas(): void {
    this.cuentaService.getAll().subscribe({
      next: (data) => this.cuentas.set(Array.isArray(data) ? (data as CuentaBancaria[]) : []),
      error: () => this.cuentas.set([]),
    });
  }

  buscar(): void {
    this.loading.set(true);
    this.seleccionados.set(new Set());
    this.chequeService
      .listar({
        idEmpresa: this.appState.getEmpresa()?.codigo ?? undefined,
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

  private idUsuario(): number {
    return this.appState.getUsuario()?.codigo ?? Number(sessionStorage.getItem('idUsuario')) ?? 0;
  }

  marcarEntregados(): void {
    const ids = Array.from(this.seleccionados());
    if (!ids.length) return;

    this.marcando.set(true);
    this.chequeService.entregar(ids, this.idUsuario()).subscribe({
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
    const fecha = row.fechaUso ?? row.fechaImpresion ?? row.fechaEntrega ?? null;
    if (!fecha) return '—';
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA);
  }

  cuentaBanco(row: ChequeListado): string {
    return [row.numeroCuenta, row.banco].filter((v) => !!v).join(' — ') || '—';
  }
}
