import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { ExportService } from '../../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { Banco } from '../../../model/banco';
import { Cheque } from '../../../model/cheque';
import { Chequera, ChequeraResumen } from '../../../model/chequera';
import { CuentaBancaria } from '../../../model/cuenta-bancaria';
import { BancoService } from '../../../service/banco.service';
import { ChequeService } from '../../../service/cheque.service';
import { ChequeraService } from '../../../service/chequera.service';
import { CuentaBancariaService } from '../../../service/cuenta-bancaria.service';
import { AnularChequeDialogComponent } from './anular-cheque-dialog.component';

/** Rubro 26: estado de cheque. Rubro 25: estado de chequera. Rubro 38: motivo de anulación de cheque. */
const RUBRO_ESTADO_CHEQUE = 26;
const RUBRO_ESTADO_CHEQUERA = 25;
const RUBRO_MOTIVO_ANULACION_CHEQUE = 38;
const ESTADO_CHEQUE_ACTIVO = 1;
const ESTADO_CHEQUERA_ACTIVA = 1;

@Component({
  selector: 'app-chequera',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './chequera.component.html',
  styleUrls: ['./chequera.component.scss'],
})
export class ChequeraComponent implements OnInit {
  // Catálogos
  bancos = signal<Banco[]>([]);
  cuentas = signal<CuentaBancaria[]>([]);
  estadosCheque = signal<DetalleRubro[]>([]);
  estadosChequera = signal<DetalleRubro[]>([]);
  /** Rubro 38, códigos 1 y 2: los únicos que se ofrecen al anular un cheque a mano. */
  motivosAnulacionCheque = signal<DetalleRubro[]>([]);

  // Filtros
  selectedBancoId = signal<number | null>(null);
  selectedCuentaId = signal<number | null>(null);

  // Tablas
  chequeras = signal<Chequera[]>([]);
  cheques = signal<Cheque[]>([]);
  resumen = signal<ChequeraResumen | null>(null);

  // Estados
  loading = signal<boolean>(false);
  loadingCheques = signal<boolean>(false);
  errorMsg = signal<string>('');
  successMsg = signal<string>('');

  // Selección
  chequeraSeleccionada = signal<Chequera | null>(null);

  chequerasColumns = [
    'fechaEntrega',
    'comienza',
    'finaliza',
    'estado',
    'acciones',
  ];
  chequesColumns = [
    'numero',
    'estado',
    'valor',
    'beneficiario',
    'fechaUso',
    'fechaImpresion',
    'fechaEntrega',
    'acciones',
  ];

  constructor(
    private exportService: ExportService,
    private bancoService: BancoService,
    private cuentaBancariaService: CuentaBancariaService,
    private chequeraService: ChequeraService,
    private chequeService: ChequeService,
    private detalleRubroService: DetalleRubroService,
    private appState: AppStateService,
    private funcionesDatos: FuncionesDatosService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarBancos();
    this.cargarCuentas();
    this.cargarRubros();
  }

  private cargarRubros(): void {
    this.estadosCheque.set(this.detalleRubroService.getDetallesByParent(RUBRO_ESTADO_CHEQUE));
    this.estadosChequera.set(this.detalleRubroService.getDetallesByParent(RUBRO_ESTADO_CHEQUERA));
    this.motivosAnulacionCheque.set(
      this.detalleRubroService
        .getDetallesByParent(RUBRO_MOTIVO_ANULACION_CHEQUE)
        .filter((m) => m.codigoAlterno === 1 || m.codigoAlterno === 2)
    );
  }

  private cargarBancos(): void {
    this.bancoService.getAll().subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : [];
        items.sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.bancos.set(items);
      },
      error: (err) => {
        console.error('Error al cargar bancos', err);
        this.bancos.set([]);
      },
    });
  }

  private cargarCuentas(): void {
    this.cuentaBancariaService.getAll().subscribe({
      next: (data) => {
        const items: CuentaBancaria[] = Array.isArray(data) ? (data as CuentaBancaria[]) : [];
        this.cuentas.set(items);
      },
      error: (err) => {
        console.error('Error al cargar cuentas bancarias', err);
        this.cuentas.set([]);
      },
    });
  }

  onBancoChange(id: number | null): void {
    this.selectedBancoId.set(id);
    this.selectedCuentaId.set(null);
    this.chequeras.set([]);
    this.cheques.set([]);
    this.chequeraSeleccionada.set(null);
    this.resumen.set(null);
  }

  onCuentaChange(id: number | null): void {
    this.selectedCuentaId.set(id);
    this.chequeraSeleccionada.set(null);
    this.cheques.set([]);
    this.resumen.set(null);
    if (id) this.buscarChequeras();
  }

  buscarChequeras(): void {
    const idCuenta = this.selectedCuentaId();
    if (!idCuenta) {
      this.snackBar.open('Debe seleccionar un banco y una cuenta', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    this.chequeraService.porCuenta(idCuenta).subscribe({
      next: (data) => {
        this.loading.set(false);
        const items = Array.isArray(data) ? data : [];
        this.chequeras.set(items);
        if (!items.length) {
          this.cheques.set([]);
          this.errorMsg.set('No se encontraron chequeras para esta cuenta');
        }
      },
      error: (err) => {
        console.error('Error al buscar chequeras:', err);
        this.loading.set(false);
        this.errorMsg.set(ChequeraService.mensajeError(err));
      },
    });
  }

  limpiarBusqueda(): void {
    this.selectedBancoId.set(null);
    this.selectedCuentaId.set(null);
    this.chequeras.set([]);
    this.cheques.set([]);
    this.errorMsg.set('');
    this.successMsg.set('');
    this.chequeraSeleccionada.set(null);
    this.resumen.set(null);
  }

  seleccionarChequera(chequera: Chequera): void {
    this.chequeraSeleccionada.set(chequera);
    this.cargarCheques(chequera.codigo);
    this.cargarResumen(chequera.codigo);
  }

  private cargarResumen(idChequera: number): void {
    this.chequeraService.resumen(idChequera).subscribe({
      next: (r) => this.resumen.set(r),
      error: (err) => {
        console.error('Error al cargar resumen de chequera', err);
        this.resumen.set(null);
      },
    });
  }

  cargarCheques(idChequera: number): void {
    const datosBusqueda: DatosBusqueda[] = [];

    const dbChequera = new DatosBusqueda();
    dbChequera.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'chequera',
      'codigo',
      idChequera.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    dbChequera.setNumeroCampoRepetido(0);
    datosBusqueda.push(dbChequera);

    this.loadingCheques.set(true);

    this.chequeService.selectByCriteria(datosBusqueda).subscribe({
      next: (data) => {
        this.loadingCheques.set(false);
        const items = Array.isArray(data) ? data : [];
        items.sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));
        this.cheques.set(items);
      },
      error: (err) => {
        console.error('Error al cargar cheques:', err);
        this.loadingCheques.set(false);
        this.cheques.set([]);
      },
    });
  }

  private idUsuario(): number {
    return this.appState.getUsuario()?.codigo ?? Number(sessionStorage.getItem('idUsuario')) ?? 0;
  }

  chequeraEstaActiva(chequera: Chequera): boolean {
    return chequera.rubroEstadoChequeraH === ESTADO_CHEQUERA_ACTIVA;
  }

  anularChequera(chequera: Chequera): void {
    if (!this.chequeraEstaActiva(chequera)) {
      this.snackBar.open('Solo se pueden anular chequeras ACTIVAS', 'Cerrar', { duration: 3000 });
      return;
    }

    const data: MotivoDialogData = {
      titulo: `Anular chequera (cheques ${chequera.comienza}–${chequera.finaliza})`,
      advertencia: 'Se anulará la chequera y todos los cheques que aún estén disponibles en ella.',
      textoConfirmar: 'Sí, anular chequera',
    };

    this.dialog.open(MotivoDialogComponent, { width: '480px', data }).afterClosed().subscribe((motivo) => {
      if (!motivo) return;

      this.loading.set(true);
      this.chequeraService.anular(chequera.codigo, motivo, this.idUsuario()).subscribe({
        next: () => {
          this.loading.set(false);
          this.snackBar.open('✓ Chequera anulada correctamente', 'Cerrar', {
            duration: 3000,
            panelClass: ['snackbar-success'],
          });
          this.buscarChequeras();
          if (this.chequeraSeleccionada()?.codigo === chequera.codigo) {
            this.cargarCheques(chequera.codigo);
            this.cargarResumen(chequera.codigo);
          }
        },
        error: (err) => {
          console.error('Error al anular chequera:', err);
          this.loading.set(false);
          this.snackBar.open('✗ ' + ChequeraService.mensajeError(err), 'Cerrar', {
            duration: 6000,
            panelClass: ['snackbar-error'],
          });
        },
      });
    });
  }

  chequeEstaActivo(cheque: Cheque): boolean {
    return cheque.rubroEstadoChequeH === ESTADO_CHEQUE_ACTIVO;
  }

  anularCheque(cheque: Cheque): void {
    if (!this.chequeEstaActivo(cheque)) {
      this.snackBar.open('Solo se pueden anular cheques ACTIVOS', 'Cerrar', { duration: 3000 });
      return;
    }

    this.dialog
      .open(AnularChequeDialogComponent, {
        width: '440px',
        data: { numeroCheque: cheque.numero, motivos: this.motivosAnulacionCheque() },
      })
      .afterClosed()
      .subscribe((motivo: number | null) => {
        if (motivo == null) return;

        this.chequeService.anular(cheque.codigo, motivo, this.idUsuario()).subscribe({
          next: () => {
            this.snackBar.open('✓ Cheque anulado correctamente', 'Cerrar', {
              duration: 3000,
              panelClass: ['snackbar-success'],
            });
            const chequera = this.chequeraSeleccionada();
            if (chequera) {
              this.cargarCheques(chequera.codigo);
              this.cargarResumen(chequera.codigo);
            }
          },
          error: (err) => {
            console.error('Error al anular cheque:', err);
            this.snackBar.open('✗ ' + ChequeService.mensajeError(err), 'Cerrar', {
              duration: 6000,
              panelClass: ['snackbar-error'],
            });
          },
        });
      });
  }

  etiquetaEstadoChequera(chequera: Chequera): string {
    const found = this.estadosChequera().find((e) => e.codigoAlterno === chequera.rubroEstadoChequeraH);
    return found?.descripcion ?? `Estado ${chequera.rubroEstadoChequeraH ?? '—'}`;
  }

  etiquetaEstadoCheque(cheque: Cheque): string {
    const found = this.estadosCheque().find((e) => e.codigoAlterno === cheque.rubroEstadoChequeH);
    return found?.descripcion ?? `Estado ${cheque.rubroEstadoChequeH ?? '—'}`;
  }

  formatearFecha(fecha: any): string {
    if (!fecha) return '—';
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA);
  }

  // Exportaciones
  exportChequesCSV(): void {
    const headers = ['Cheque', 'Estado', 'Valor', 'Beneficiario', 'F. Uso', 'F. Impresión', 'F. Entrega'];
    const rows = this.cheques().map((r) => ({
      numero: r.numero ?? '',
      estado: this.etiquetaEstadoCheque(r),
      valor: r.valor ?? '',
      beneficiario: r.beneficiario ?? '',
      fechaUso: this.formatearFecha(r.fechaUso),
      fechaImpresion: this.formatearFecha(r.fechaImpresion),
      fechaEntrega: this.formatearFecha(r.fechaEntrega),
    }));
    this.exportService.exportToCSV(rows, 'cheques', headers, [
      'numero',
      'estado',
      'valor',
      'beneficiario',
      'fechaUso',
      'fechaImpresion',
      'fechaEntrega',
    ]);
  }

  exportChequesPDF(): void {
    const headers = ['Cheque', 'Estado', 'Valor', 'Beneficiario', 'F. Uso', 'F. Impresión', 'F. Entrega'];
    const rows = this.cheques().map((r) => ({
      numero: r.numero ?? '',
      estado: this.etiquetaEstadoCheque(r),
      valor: r.valor ?? '',
      beneficiario: r.beneficiario ?? '',
      fechaUso: this.formatearFecha(r.fechaUso),
      fechaImpresion: this.formatearFecha(r.fechaImpresion),
      fechaEntrega: this.formatearFecha(r.fechaEntrega),
    }));
    this.exportService.exportToPDF(rows, 'cheques', 'Cheques', headers, [
      'numero',
      'estado',
      'valor',
      'beneficiario',
      'fechaUso',
      'fechaImpresion',
      'fechaEntrega',
    ]);
  }
}
