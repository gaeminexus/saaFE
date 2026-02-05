import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
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
import { Chequera } from '../../../model/chequera';
import { CuentaBancaria } from '../../../model/cuenta-bancaria';
import { BancoService } from '../../../service/banco.service';
import { ChequeraService } from '../../../service/chequera.service';
import { CuentaBancariaService } from '../../../service/cuenta-bancaria.service';

@Component({
  selector: 'app-recepcion-chequera',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './recepcion-chequera.component.html',
  styleUrls: ['./recepcion-chequera.component.scss'],
})
export class RecepcionChequeraComponent implements OnInit {
  // Catálogos (cascarón): se poblarán desde servicios luego
  bancos = signal<Banco[]>([]);
  cuentas = signal<CuentaBancaria[]>([]);

  // Filtros
  selectedBancoId = signal<number | null>(null);
  selectedCuentaId = signal<number | null>(null);

  // Tabla de chequeras solicitadas (cascarón)
  solicitudes = signal<Chequera[]>([]);
  displayedColumns: string[] = [
    'banco',
    'cuentaBancaria',
    'fechaSolicitud',
    'numeroCheques',
    'acciones',
  ];

  // Selección y recepción
  chequeraSeleccionada: Chequera | null = null;
  fechaEntrega = '';
  chequeInicial: number | null = null;
  loading = signal<boolean>(false);
  successMsg = signal<string>('');
  errorMsg = signal<string>('');

  // Subconjunto filtrado según banco/cuenta seleccionados
  filteredSolicitudes = computed(() => {
    const data = this.solicitudes();
    const bancoId = this.selectedBancoId();
    const cuentaId = this.selectedCuentaId();

    return data.filter((ch) => {
      // Solo chequeras en estado SOLICITADA (rubro 25, valor 3)
      const byEstado = ch.rubroEstadoChequeraP === 3;
      const byBanco = bancoId ? ch.cuentaBancaria?.banco?.codigo === bancoId : true;
      const byCuenta = cuentaId ? ch.cuentaBancaria?.codigo === cuentaId : true;
      return byEstado && byBanco && byCuenta;
    });
  });

  constructor(
    private exportService: ExportService,
    private bancoService: BancoService,
    private cuentaService: CuentaBancariaService,
    private snackBar: MatSnackBar,
    private chequeraService: ChequeraService,
    private funcionesDatos: FuncionesDatosService,
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
    this.cuentaService.getAll().subscribe({
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

  buscarChequeras(): void {
    const cuentaId = this.selectedCuentaId();
    if (!cuentaId) {
      this.errorMsg.set('Debe seleccionar una cuenta bancaria');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    // Construir criterios con DatosBusqueda[]
    const criterios: DatosBusqueda[] = [];
    const estadoObjetivo = 3; // SOLICITADA

    // Filtro por cuenta bancaria (JOIN)
    const dbCuenta = new DatosBusqueda();
    dbCuenta.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'cuentaBancaria',
      'codigo',
      cuentaId.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    dbCuenta.setNumeroCampoRepetido(0); // Sin sufijo numérico
    criterios.push(dbCuenta);

    // Filtro por estado (SOLICITADA)
    const dbEstado = new DatosBusqueda();
    dbEstado.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.INTEGER,
      'rubroEstadoChequeraP',
      estadoObjetivo.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    dbEstado.setNumeroCampoRepetido(0); // Sin sufijo numérico
    criterios.push(dbEstado);

    console.log('[Recepción Chequera] Buscar chequeras con criterios DatosBusqueda[]', criterios);
    this.chequeraService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : [];
        items.sort((a, b) => (b.codigo ?? 0) - (a.codigo ?? 0));
        this.solicitudes.set(items);
        this.loading.set(false);
        if (items.length === 0) {
          this.errorMsg.set('No se encontraron chequeras solicitadas para esta cuenta');
        }
      },
      error: (err) => {
        console.warn('[Recepción Chequera] selectByCriteria falló, usando getAll()', err);
        // Fallback: getAll y filtrado local
        this.chequeraService.getAll().subscribe({
          next: (data) => {
            const items = Array.isArray(data) ? data : [];
            const filtradas = items.filter(
              (ch) =>
                ch.cuentaBancaria?.codigo === cuentaId &&
                ch.rubroEstadoChequeraP === estadoObjetivo,
            );
            filtradas.sort((a, b) => (b.codigo ?? 0) - (a.codigo ?? 0));
            this.solicitudes.set(filtradas);
            this.loading.set(false);
            if (filtradas.length === 0) {
              this.errorMsg.set('No se encontraron chequeras solicitadas para esta cuenta');
            }
          },
          error: (e2) => {
            console.error('Error al cargar chequeras', e2);
            this.errorMsg.set('Error al buscar chequeras solicitadas');
            this.solicitudes.set([]);
            this.loading.set(false);
          },
        });
      },
    });
  }

  onBancoChange(bancoId: number | null): void {
    this.selectedBancoId.set(bancoId);
    // Reset cuenta al cambiar banco
    this.selectedCuentaId.set(null);
    this.solicitudes.set([]);
    this.chequeraSeleccionada = null;
  }

  onCuentaChange(cuentaId: number | null): void {
    this.selectedCuentaId.set(cuentaId);
    this.solicitudes.set([]);
    this.chequeraSeleccionada = null;
  }

  seleccionarChequera(ch: Chequera): void {
    this.chequeraSeleccionada = ch;
    this.fechaEntrega = '';
    this.chequeInicial = null;
    this.errorMsg.set('');
    this.successMsg.set('');

    // Obtener automáticamente el siguiente número de cheque
    this.obtenerSiguienteNumeroCheque();
  }

  /**
   * Obtiene el número máximo de cheque de la cuenta + 1
   */
  private obtenerSiguienteNumeroCheque(): void {
    const cuentaId = this.selectedCuentaId();
    if (!cuentaId) return;

    // TODO: Implementar servicio para obtener MAX(numero) de cheques
    // Por ahora, establecer en 1 como valor por defecto
    // this.chequeService.getMaxNumeroCheque(cuentaId).subscribe({
    //   next: (maxNumero) => {
    //     this.chequeInicial = (maxNumero || 0) + 1;
    //   },
    //   error: () => {
    //     this.chequeInicial = 1;
    //   }
    // });

    // Simulación temporal: permitir ingreso manual
    this.chequeInicial = 1;
  }

  private parseFechaSolicitud(fecha: any): Date | null {
    if (!fecha) return null;
    if (Array.isArray(fecha)) {
      const [year, month, day] = fecha;
      return new Date(year, month - 1, day);
    }
    return new Date(fecha);
  }

  recibirChequera(): void {
    if (!this.chequeraSeleccionada) return;

    // Validaciones
    if (!this.fechaEntrega || !this.chequeInicial || this.chequeInicial <= 0) {
      this.errorMsg.set('Debe ingresar fecha de entrega y cheque inicial válido');
      this.snackBar.open('Todos los campos son obligatorios', 'Cerrar', { duration: 3000 });
      return;
    }

    // Validar fecha de entrega > fecha de solicitud
    const fechaSolicitudDate = this.parseFechaSolicitud(this.chequeraSeleccionada.fechaSolicitud);
    const fechaEntregaDate = new Date(this.fechaEntrega);

    if (fechaSolicitudDate && fechaEntregaDate <= fechaSolicitudDate) {
      this.errorMsg.set('La fecha de entrega debe ser mayor a la fecha de solicitud');
      this.snackBar.open('La fecha de entrega debe ser mayor a la fecha de solicitud', 'Cerrar', {
        duration: 4000,
      });
      return;
    }

    // Preparar datos para actualización
    const comienza = this.chequeInicial;
    const numeroCheques = this.chequeraSeleccionada.numeroCheques ?? 0;
    const finaliza = comienza + numeroCheques - 1;

    const payload: any = {
      codigo: this.chequeraSeleccionada.codigo,
      fechaEntrega: `${this.fechaEntrega}T00:00:00`,
      comienza,
      finaliza,
      rubroEstadoChequeraP: 1, // Estado ACTIVA en Parent
      rubroEstadoChequeraH: 1, // Estado ACTIVA en Hijo
      cuentaBancaria: this.chequeraSeleccionada.cuentaBancaria,
      fechaSolicitud: this.chequeraSeleccionada.fechaSolicitud,
      numeroCheques: this.chequeraSeleccionada.numeroCheques,
    };

    this.loading.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    console.log('[Recepción] Actualizando chequera:', payload);

    this.chequeraService.update(payload).subscribe({
      next: () => {
        this.successMsg.set('Chequera recibida y activada correctamente');
        this.snackBar.open('✓ Chequera recibida correctamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-success'],
        });

        // Limpiar y recargar
        this.loading.set(false);
        this.chequeraSeleccionada = null;
        this.fechaEntrega = '';
        this.chequeInicial = null;

        // Recargar tabla
        if (this.selectedCuentaId()) {
          this.buscarChequeras();
        }
      },
      error: (err) => {
        console.error('[Recepción] Error al guardar:', err);
        this.loading.set(false);
        this.errorMsg.set('Error al guardar la recepción de chequera');
        this.snackBar.open(
          '✗ Error al guardar: ' + (err.message || 'Error desconocido'),
          'Cerrar',
          {
            duration: 5000,
            panelClass: ['snackbar-error'],
          },
        );
      },
    });
  }

  cancelarRecepcion(): void {
    this.chequeraSeleccionada = null;
    this.fechaEntrega = '';
    this.chequeInicial = null;
    this.errorMsg.set('');
    this.successMsg.set('');
  }

  /**
   * Formatea fecha para mostrar en la tabla
   */
  formatearFecha(fecha: any): string {
    if (!fecha) return '';
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA);
  }

  // Exportaciones
  exportSolicitudesCSV(): void {
    const headers = ['Banco', 'Cuenta Bancaria', 'Fecha Solicitud', 'Número de Cheques'];
    const rows = this.filteredSolicitudes().map((s) => ({
      banco: s.cuentaBancaria?.banco?.nombre ?? '',
      cuentaBancaria: s.cuentaBancaria?.numeroCuenta ?? '',
      fechaSolicitud: this.formatearFecha(s.fechaSolicitud),
      numeroCheques: s.numeroCheques ?? '',
    }));
    this.exportService.exportToCSV(rows, 'recepcion-chequera', headers, [
      'banco',
      'cuentaBancaria',
      'fechaSolicitud',
      'numeroCheques',
    ]);
  }

  exportSolicitudesPDF(): void {
    const headers = ['Banco', 'Cuenta Bancaria', 'Fecha Solicitud', 'Número de Cheques'];
    const rows = this.filteredSolicitudes().map((s) => ({
      banco: s.cuentaBancaria?.banco?.nombre ?? '',
      cuentaBancaria: s.cuentaBancaria?.numeroCuenta ?? '',
      fechaSolicitud: this.formatearFecha(s.fechaSolicitud),
      numeroCheques: s.numeroCheques ?? '',
    }));
    this.exportService.exportToPDF(rows, 'recepcion-chequera', 'Chequeras Solicitadas', headers, [
      'banco',
      'cuentaBancaria',
      'fechaSolicitud',
      'numeroCheques',
    ]);
  }
}
