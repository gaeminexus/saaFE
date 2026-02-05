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
import { ExportService } from '../../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { Banco } from '../../../model/banco';
import { Cheque } from '../../../model/cheque';
import { Chequera } from '../../../model/chequera';
import { CuentaBancaria } from '../../../model/cuenta-bancaria';
import { BancoService } from '../../../service/banco.service';
import { ChequeService } from '../../../service/cheque.service';
import { ChequeraService } from '../../../service/chequera.service';
import { CuentaBancariaService } from '../../../service/cuenta-bancaria.service';

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

  // Filtros
  selectedBancoId = signal<number | null>(null);
  selectedCuentaId = signal<number | null>(null);

  // Tablas
  chequeras = signal<Chequera[]>([]);
  cheques = signal<Cheque[]>([]);

  // Estados
  loading = signal<boolean>(false);
  loadingCheques = signal<boolean>(false);
  errorMsg = signal<string>('');
  successMsg = signal<string>('');

  // Selección
  chequeraSeleccionada: Chequera | null = null;
  chequeSeleccionado: Cheque | null = null;

  // Estados de rubros (constantes del backend)
  readonly ESTADO_ACTIVA = 1;
  readonly ESTADO_SOLICITADA = 3;
  readonly ESTADO_ANULADA = 2;
  readonly ESTADO_CHEQUE_ACTIVO = 1;
  readonly ESTADO_CHEQUE_ANULADO = 2;
  readonly MOTIVO_CHEQUERA_ANULADA = 2;

  chequerasColumns = [
    'fechaSolicitud',
    'fechaEntrega',
    'numeroCheques',
    'comienza',
    'finaliza',
    'estado',
    'acciones',
  ];
  chequesColumns = [
    'cheque',
    'egreso',
    'fechaUso',
    'fechaImpresion',
    'fechaEntrega',
    'asiento',
    'beneficiario',
    'monto',
    'fechaCaduca',
    'fechaAnulacion',
    'estado',
    'acciones',
  ];

  constructor(
    private exportService: ExportService,
    private bancoService: BancoService,
    private cuentaBancariaService: CuentaBancariaService,
    private chequeraService: ChequeraService,
    private chequeService: ChequeService,
    private funcionesDatos: FuncionesDatosService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarBancos();
    this.cargarCuentas();
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
  }

  onCuentaChange(id: number | null): void {
    this.selectedCuentaId.set(id);
  }

  buscarChequeras(): void {
    if (!this.selectedCuentaId()) {
      this.snackBar.open('Debe seleccionar un banco y una cuenta', 'Cerrar', { duration: 3000 });
      return;
    }

    const datosBusqueda: DatosBusqueda[] = [];

    // Filtro por cuenta bancaria
    const dbCuenta = new DatosBusqueda();
    dbCuenta.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'cuentaBancaria',
      'codigo',
      this.selectedCuentaId()!.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    dbCuenta.setNumeroCampoRepetido(0);
    datosBusqueda.push(dbCuenta);

    this.loading.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    this.chequeraService.selectByCriteria(datosBusqueda).subscribe({
      next: (data) => {
        this.loading.set(false);
        if (data && data.length > 0) {
          this.chequeras.set(data);
          this.successMsg.set(`Se encontraron ${data.length} chequeras`);
        } else {
          this.chequeras.set([]);
          this.cheques.set([]);
          this.errorMsg.set('No se encontraron chequeras para esta cuenta');
        }
      },
      error: (err) => {
        console.error('Error al buscar chequeras:', err);
        this.loading.set(false);
        this.errorMsg.set('Error al buscar chequeras');
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
    this.chequeraSeleccionada = null;
    this.chequeSeleccionado = null;
  }

  seleccionarChequera(chequera: Chequera): void {
    this.chequeraSeleccionada = chequera;
    this.chequeSeleccionado = null;
    this.cargarCheques(chequera.codigo);
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
        if (data && data.length > 0) {
          this.cheques.set(data);
        } else {
          this.cheques.set([]);
        }
      },
      error: (err) => {
        console.warn('[Chequera] selectByCriteria falló, usando getAll()', err);
        // Fallback: getAll y filtrado local
        this.chequeService.getAll().subscribe({
          next: (allData) => {
            this.loadingCheques.set(false);
            if (allData && allData.length > 0) {
              const filtered = allData.filter((ch) => ch.chequera?.codigo === idChequera);
              this.cheques.set(filtered);
            } else {
              this.cheques.set([]);
            }
          },
          error: (err2) => {
            console.error('Error al cargar todos los cheques:', err2);
            this.loadingCheques.set(false);
            this.cheques.set([]);
          },
        });
      },
    });
  }

  anularChequera(chequera: Chequera): void {
    // Validar que esté ACTIVA
    if (chequera.rubroEstadoChequeraH !== this.ESTADO_ACTIVA) {
      this.snackBar.open('Solo se pueden anular chequeras ACTIVAS', 'Cerrar', { duration: 3000 });
      return;
    }

    // Confirmar anulación
    if (
      !confirm(
        '¿Está seguro de anular esta chequera? Esta acción anulará todos los cheques asociados.',
      )
    ) {
      return;
    }

    const payload = {
      codigo: chequera.codigo,
      rubroEstadoChequeraH: this.ESTADO_ANULADA,
      cuentaBancaria: chequera.cuentaBancaria,
      fechaSolicitud: chequera.fechaSolicitud,
      numeroCheques: chequera.numeroCheques,
      comienza: chequera.comienza,
      finaliza: chequera.finaliza,
    };

    this.loading.set(true);

    this.chequeraService.update(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.snackBar.open('✓ Chequera anulada correctamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-success'],
        });

        // Anular todos los cheques de la chequera
        this.anularTodosCheques(chequera.codigo);

        // Recargar tabla
        if (this.selectedCuentaId()) {
          this.buscarChequeras();
        }
      },
      error: (err) => {
        console.error('Error al anular chequera:', err);
        this.loading.set(false);
        this.snackBar.open('✗ Error al anular chequera', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-error'],
        });
      },
    });
  }

  anularTodosCheques(idChequera: number): void {
    // Obtener todos los cheques de la chequera
    const datosBusqueda: DatosBusqueda[] = [];
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'chequera',
      'codigo',
      idChequera.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    db.setNumeroCampoRepetido(0);
    datosBusqueda.push(db);

    this.chequeService.selectByCriteria(datosBusqueda).subscribe({
      next: (cheques) => {
        if (cheques && cheques.length > 0) {
          // Anular cada cheque
          cheques.forEach((cheque) => {
            if (cheque.rubroEstadoChequeH === this.ESTADO_CHEQUE_ACTIVO) {
              this.anularChequeInterno(cheque.codigo, this.MOTIVO_CHEQUERA_ANULADA);
            }
          });
        }
      },
      error: (err) => {
        console.error('Error al obtener cheques para anular:', err);
      },
    });
  }

  anularCheque(cheque: Cheque): void {
    // Validar que esté ACTIVO
    if (cheque.rubroEstadoChequeH !== this.ESTADO_CHEQUE_ACTIVO) {
      this.snackBar.open('Solo se pueden anular cheques ACTIVOS', 'Cerrar', { duration: 3000 });
      return;
    }

    // Confirmar anulación
    if (!confirm('¿Está seguro de anular este cheque?')) {
      return;
    }

    // TODO: Mostrar dialog para seleccionar motivo de anulación
    // Por ahora usamos un motivo genérico (1)
    const motivoAnulacion = 1;

    this.anularChequeInterno(cheque.codigo, motivoAnulacion);
  }

  private anularChequeInterno(idCheque: number, motivoAnulacion: number): void {
    const payload = {
      codigo: idCheque,
      rubroEstadoChequeH: this.ESTADO_CHEQUE_ANULADO,
      rubroMotivoAnulacionH: motivoAnulacion,
      fechaAnulacion: new Date().toISOString(),
    };

    this.chequeService.update(payload).subscribe({
      next: () => {
        this.snackBar.open('✓ Cheque anulado correctamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-success'],
        });

        // Recargar cheques
        if (this.chequeraSeleccionada) {
          this.cargarCheques(this.chequeraSeleccionada.codigo);
        }
      },
      error: (err) => {
        console.error('Error al anular cheque:', err);
        this.snackBar.open('✗ Error al anular cheque', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-error'],
        });
      },
    });
  }

  getEstadoChequera(estado: number): string {
    switch (estado) {
      case this.ESTADO_ACTIVA:
        return 'ACTIVA';
      case this.ESTADO_ANULADA:
        return 'ANULADA';
      case this.ESTADO_SOLICITADA:
        return 'SOLICITADA';
      default:
        return 'DESCONOCIDO';
    }
  }

  getEstadoCheque(estado: number): string {
    switch (estado) {
      case this.ESTADO_CHEQUE_ACTIVO:
        return 'ACTIVO';
      case this.ESTADO_CHEQUE_ANULADO:
        return 'ANULADO';
      default:
        return 'DESCONOCIDO';
    }
  }

  formatearFecha(fecha: any): string {
    if (!fecha) return '';
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA);
  }

  // Exportaciones
  exportChequerasCSV(): void {
    const headers = [
      'Fecha Solicitud',
      'Fecha Entrega',
      'Nº Cheques',
      'Cheque Desde',
      'Cheque Hasta',
      'Estado',
    ];
    const rows = this.chequeras().map((r) => ({
      fechaSolicitud: this.formatearFecha(r.fechaSolicitud),
      fechaEntrega: this.formatearFecha(r.fechaEntrega),
      numeroCheques: r.numeroCheques ?? '',
      chequeDesde: r.comienza ?? '',
      chequeHasta: r.finaliza ?? '',
      estado: this.getEstadoChequera(r.rubroEstadoChequeraH),
    }));
    this.exportService.exportToCSV(rows, 'chequeras', headers, [
      'fechaSolicitud',
      'fechaEntrega',
      'numeroCheques',
      'chequeDesde',
      'chequeHasta',
      'estado',
    ]);
  }

  exportChequerasPDF(): void {
    const headers = [
      'Fecha Solicitud',
      'Fecha Entrega',
      'Nº Cheques',
      'Cheque Desde',
      'Cheque Hasta',
      'Estado',
    ];
    const rows = this.chequeras().map((r) => ({
      fechaSolicitud: this.formatearFecha(r.fechaSolicitud),
      fechaEntrega: this.formatearFecha(r.fechaEntrega),
      numeroCheques: r.numeroCheques ?? '',
      chequeDesde: r.comienza ?? '',
      chequeHasta: r.finaliza ?? '',
      estado: this.getEstadoChequera(r.rubroEstadoChequeraH),
    }));
    this.exportService.exportToPDF(rows, 'chequeras', 'Chequeras', headers, [
      'fechaSolicitud',
      'fechaEntrega',
      'numeroCheques',
      'chequeDesde',
      'chequeHasta',
      'estado',
    ]);
  }

  exportChequesCSV(): void {
    const headers = [
      'Cheque',
      'Nº Egreso',
      'F. Uso',
      'F. Impresión',
      'F. Entrega',
      'Asiento',
      'Beneficiario',
      'Monto',
      'F. Caducidad',
      'F. Anulación',
      'Estado',
    ];
    const rows = this.cheques().map((r) => ({
      cheque: r.codigo ?? '',
      egreso: r.egreso ?? '',
      fechaUso: this.formatearFecha(r.fechaUso),
      fechaImpresion: this.formatearFecha(r.fechaImpresion),
      fechaEntrega: this.formatearFecha(r.fechaEntrega),
      asiento: r.asiento?.numero ?? '',
      beneficiario: r.beneficiario ?? '',
      monto: r.valor ?? '',
      fechaCaduca: this.formatearFecha(r.fechaCaduca),
      fechaAnulacion: this.formatearFecha(r.fechaAnulacion),
      estado: this.getEstadoCheque(r.rubroEstadoChequeH),
    }));
    this.exportService.exportToCSV(rows, 'cheques', headers, [
      'cheque',
      'egreso',
      'fechaUso',
      'fechaImpresion',
      'fechaEntrega',
      'asiento',
      'beneficiario',
      'monto',
      'fechaCaduca',
      'fechaAnulacion',
      'estado',
    ]);
  }

  exportChequesPDF(): void {
    const headers = [
      'Cheque',
      'Nº Egreso',
      'F. Uso',
      'F. Impresión',
      'F. Entrega',
      'Asiento',
      'Beneficiario',
      'Monto',
      'F. Caducidad',
      'F. Anulación',
      'Estado',
    ];
    const rows = this.cheques().map((r) => ({
      cheque: r.codigo ?? '',
      egreso: r.egreso ?? '',
      fechaUso: this.formatearFecha(r.fechaUso),
      fechaImpresion: this.formatearFecha(r.fechaImpresion),
      fechaEntrega: this.formatearFecha(r.fechaEntrega),
      asiento: r.asiento?.numero ?? '',
      beneficiario: r.beneficiario ?? '',
      monto: r.valor ?? '',
      fechaCaduca: this.formatearFecha(r.fechaCaduca),
      fechaAnulacion: this.formatearFecha(r.fechaAnulacion),
      estado: this.getEstadoCheque(r.rubroEstadoChequeH),
    }));
    this.exportService.exportToPDF(rows, 'cheques', 'Cheques', headers, [
      'cheque',
      'egreso',
      'fechaUso',
      'fechaImpresion',
      'fechaEntrega',
      'asiento',
      'beneficiario',
      'monto',
      'fechaCaduca',
      'fechaAnulacion',
      'estado',
    ]);
  }
}
