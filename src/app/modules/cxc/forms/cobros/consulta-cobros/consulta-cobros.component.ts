import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppStateService } from '../../../../../shared/services/app-state.service';
import { empresaSesionCodigo } from '../../../../../shared/services/empresa-sesion';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { EstadoAplicacion } from '../../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { MotivoDialogComponent, MotivoDialogData } from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { Titular } from '../../../../tsr/model/titular';

import { CobroListado, FORMA_PAGO_COBRO_LABELS } from '../../../model/aplicacion-pago-cxc';
import { AplicacionPagoCxcService } from '../../../service/aplicacion-pago-cxc.service';

const ROL_CLIENTE = 1;

/**
 * Consulta de cobros registrados (CBR.APLC vía GET /aplc/listar), con
 * anulación (POST /aplc/revertir/{id}). Antes no existía ninguna pantalla
 * para ver los cobros ya registrados desde registrar-cobro.
 */
@Component({
  selector: 'app-consulta-cobros',
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
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './consulta-cobros.component.html',
  styleUrls: ['./consulta-cobros.component.scss'],
})
export class ConsultaCobrosComponent implements OnInit {
  private aplicacionPagoService = inject(AplicacionPagoCxcService);
  private appState = inject(AppStateService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly EstadoAplicacion = EstadoAplicacion;
  readonly formaPagoLabels = FORMA_PAGO_COBRO_LABELS;
  /** El backend hoy solo registra cobros con Transferencia o Cheque — Efectivo y Tarjeta no aplican, no se ofrecen como filtro. */
  readonly formasPago = [
    { codigo: 2, texto: FORMA_PAGO_COBRO_LABELS[2] },
    { codigo: 3, texto: FORMA_PAGO_COBRO_LABELS[3] },
  ];

  titularFiltro = signal<Titular | null>(null);
  formaPagoFiltro = signal<number | null>(null);
  estadoFiltro = signal<number | null>(null);
  desde = signal<string>('');
  hasta = signal<string>('');

  rows = signal<CobroListado[]>([]);
  loading = signal(false);
  anulando = signal<number | null>(null);

  total = computed(() => this.rows().reduce((s, r) => s + (Number(r.valor) || 0), 0));

  readonly columnas = ['fecha', 'titular', 'documento', 'formaPago', 'valor', 'asiento', 'estado', 'acciones'];

  ngOnInit(): void {
    this.setRangoMesActual();
    this.buscar();
  }

  private setRangoMesActual(): void {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    this.desde.set(this.aFechaISO(primerDia));
    this.hasta.set(this.aFechaISO(ultimoDia));
  }

  private aFechaISO(fecha: Date): string {
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  buscarTitular(): void {
    this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: { rolCodigo: ROL_CLIENTE, rolNombre: 'CLIENTE', titulo: 'Buscar Cliente' },
    }).afterClosed().subscribe((titular: Titular | null) => {
      if (titular) {
        this.titularFiltro.set(titular);
        this.buscar();
      }
    });
  }

  limpiarTitularFiltro(): void {
    this.titularFiltro.set(null);
    this.buscar();
  }

  buscar(): void {
    const idEmpresa = empresaSesionCodigo() ?? this.appState.getEmpresa()?.codigo;
    if (!idEmpresa) {
      this.rows.set([]);
      this.mostrarError('No se pudo determinar la empresa de la sesión');
      return;
    }

    this.loading.set(true);
    this.aplicacionPagoService.listar({
      idEmpresa,
      idTitular: this.titularFiltro()?.codigo ?? undefined,
      desde: this.desde() || undefined,
      hasta: this.hasta() || undefined,
      formaPago: this.formaPagoFiltro() ?? undefined,
      estado: this.estadoFiltro() ?? undefined,
    }).subscribe({
      next: (data) => {
        this.rows.set(Array.isArray(data) ? data : []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.rows.set([]);
        this.mostrarError(mensajeDeError(err, 'No se pudieron cargar los cobros'));
      },
    });
  }

  limpiarFiltros(): void {
    this.titularFiltro.set(null);
    this.formaPagoFiltro.set(null);
    this.estadoFiltro.set(null);
    this.setRangoMesActual();
    this.buscar();
  }

  etiquetaFormaPago(codigo: number | null | undefined): string {
    if (codigo == null) return '—';
    return this.formaPagoLabels[codigo] || `Forma ${codigo}`;
  }

  etiquetaDocumento(row: CobroListado): string {
    const tipo = row.documentoAfectado?.tipo === 'LIQUIDACION_COMPRA' ? 'Liquidación de compra' : 'Factura';
    const numero = row.documentoAfectado?.numero || `ID:${row.documentoAfectado?.id}`;
    return `${tipo} ${numero}`;
  }

  estadoLabel(estado: number): string {
    return Number(estado) === EstadoAplicacion.REVERSADO ? 'Reversado' : 'Activo';
  }

  esReversado(estado: number): boolean {
    return Number(estado) === EstadoAplicacion.REVERSADO;
  }

  puedeAnular(row: CobroListado): boolean {
    return Number(row.estado) === EstadoAplicacion.ACTIVO;
  }

  anular(row: CobroListado): void {
    if (!this.puedeAnular(row)) return;

    const data: MotivoDialogData = {
      titulo: `Anular cobro N° ${row.id}`,
      advertencia: `Se anulará el cobro de ${row.valor.toFixed(2)} a ${row.titular?.nombre || 'el titular'} sobre ${this.etiquetaDocumento(row)}. El saldo vuelve a la factura y se anula el asiento y el movimiento bancario.`,
      textoConfirmar: 'Sí, anular',
    };

    this.dialog.open(MotivoDialogComponent, { width: '520px', data }).afterClosed().subscribe((motivo: string | null) => {
      if (!motivo) return;

      this.anulando.set(row.id);
      this.aplicacionPagoService.revertir(row.id, { motivo, idUsuario: this.appState.getIdUsuario() }).subscribe({
        next: () => {
          this.anulando.set(null);
          this.mostrarExito('Cobro anulado correctamente');
          this.buscar();
        },
        error: (err) => {
          this.anulando.set(null);
          this.mostrarError(mensajeDeError(err, 'No se pudo anular el cobro'));
        },
      });
    });
  }

  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 4000, panelClass: ['snackbar-success'] });
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 6000, panelClass: ['snackbar-error'] });
  }
}
