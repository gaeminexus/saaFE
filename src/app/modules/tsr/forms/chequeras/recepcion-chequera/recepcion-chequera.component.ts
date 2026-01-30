import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ExportService } from '../../../../../shared/services/export.service';
import { Banco } from '../../../model/banco';
import { Chequera } from '../../../model/chequera';
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
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './recepcion-chequera.component.html',
  styleUrls: ['./recepcion-chequera.component.scss'],
})
export class RecepcionChequeraComponent implements OnInit {
  // Catálogos (cascarón): se poblarán desde servicios luego
  bancos = signal<Banco[]>([]);
  cuentas = signal<any[]>([]);

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
      // Solo chequeras en estado SOLICITADA (rubro 25, hijo 3)
      const byEstado = ch.rubroEstadoChequeraH === 3;
      const byBanco = bancoId ? ch.cuentaBancaria?.banco?.codigo === bancoId : true;
      const byCuenta = cuentaId ? ch.cuentaBancaria?.codigo === cuentaId : true;
      return byEstado && byBanco && byCuenta;
    });
  });

  constructor(
    private exportService: ExportService,
    private bancoService: BancoService,
    private cuentaService: CuentaBancariaService,
    private chequeraService: ChequeraService,
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
        const items = Array.isArray(data) ? data : [];
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

    const criterios = {
      'cuentaBancaria.codigo': cuentaId,
      rubroEstadoChequeraH: 3, // SOLICITADA
    };

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
      error: () => {
        // Fallback a getAll() si selectByCriteria falla (405)
        this.chequeraService.getAll().subscribe({
          next: (data) => {
            const items = Array.isArray(data) ? data : [];
            const filtradas = items.filter(
              (ch) => ch.cuentaBancaria?.codigo === cuentaId && ch.rubroEstadoChequeraH === 3,
            );
            filtradas.sort((a, b) => (b.codigo ?? 0) - (a.codigo ?? 0));
            this.solicitudes.set(filtradas);
            this.loading.set(false);
            if (filtradas.length === 0) {
              this.errorMsg.set('No se encontraron chequeras solicitadas para esta cuenta');
            }
          },
          error: (err) => {
            console.error('Error al cargar chequeras', err);
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

    if (!this.fechaEntrega || !this.chequeInicial || this.chequeInicial <= 0) {
      this.errorMsg.set('Debe ingresar fecha de entrega y cheque inicial válido');
      return;
    }

    const fechaSolicitudDate = this.parseFechaSolicitud(
      (this.chequeraSeleccionada as any).fechaSolicitud,
    );
    const fechaEntregaDate = new Date(this.fechaEntrega);

    if (fechaSolicitudDate && fechaEntregaDate <= fechaSolicitudDate) {
      this.errorMsg.set('La fecha de entrega debe ser mayor a la fecha de solicitud');
      return;
    }

    const comienza = this.chequeInicial;
    const numeroCheques = this.chequeraSeleccionada.numeroCheques ?? 0;
    const finaliza = comienza + numeroCheques - 1;

    const payload: any = {
      codigo: this.chequeraSeleccionada.codigo,
      fechaEntrega: `${this.fechaEntrega}T00:00:00`,
      comienza,
      finaliza,
      rubroEstadoChequeraP: this.chequeraSeleccionada.rubroEstadoChequeraP,
      rubroEstadoChequeraH: 1, // ACTIVA
    };

    this.errorMsg.set('');
    this.successMsg.set('');

    this.chequeraService.update(payload).subscribe({
      next: () => {
        this.successMsg.set('Chequera recibida correctamente');
        this.chequeraSeleccionada = null;
        this.fechaEntrega = '';
        this.chequeInicial = null;
        this.buscarChequeras();
      },
      error: (err) => {
        console.error('Error al recibir chequera', err);
        this.errorMsg.set('No se pudo guardar la recepción de la chequera');
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

  // Exportaciones
  exportSolicitudesCSV(): void {
    const headers = ['Banco', 'Cuenta Bancaria', 'Fecha Solicitud', 'Número de Cheques'];
    const rows = this.filteredSolicitudes().map((s) => ({
      banco: s.cuentaBancaria?.banco?.nombre ?? '',
      cuentaBancaria: s.cuentaBancaria?.numeroCuenta ?? '',
      fechaSolicitud: s.fechaSolicitud ?? '',
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
      fechaSolicitud: s.fechaSolicitud ?? '',
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
