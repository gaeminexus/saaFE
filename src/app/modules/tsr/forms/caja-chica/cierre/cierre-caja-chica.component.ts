import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import {
  PlanCuentaSelectorDialogComponent,
  PlanCuentaSelectorDialogData,
} from '../../../../../shared/components/plan-cuenta-selector-dialog/plan-cuenta-selector-dialog.component';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { PlanCuenta } from '../../../../cnt/model/plan-cuenta';

import { CajaChica } from '../../../model/caja-chica';
import { CierreCajaChica, EstadoCierreCajaChica } from '../../../model/cierre-caja-chica';
import { MovimientoCajaChica, TipoMovimientoCajaChica } from '../../../model/movimiento-caja-chica';
import { CajaChicaService } from '../../../service/caja-chica.service';
import { CierreCajaChicaService } from '../../../service/cierre-caja-chica.service';

/** Tolerancia de redondeo: por debajo de esto, la diferencia se trata como cero. */
const TOLERANCIA_DIFERENCIA = 0.005;

/**
 * Cierre/arqueo de caja chica: prepara el borrador (período, saldo en libros
 * y movimientos) contra el backend, compara con lo contado físicamente y, si
 * hay diferencia, exige la cuenta contable del ajuste antes de confirmar.
 */
@Component({
  selector: 'app-cierre-caja-chica',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './cierre-caja-chica.component.html',
  styleUrls: ['./cierre-caja-chica.component.scss'],
})
export class CierreCajaChicaComponent implements OnInit {
  private cajaS = inject(CajaChicaService);
  private cierreS = inject(CierreCajaChicaService);
  private appState = inject(AppStateService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly EstadoCierreCajaChica = EstadoCierreCajaChica;

  // ─── Caja e histórico ───────────────────────────────────
  cajas = signal<CajaChica[]>([]);
  cargandoCajas = signal(false);
  selectedCajaId = signal<number | null>(null);

  cierres = signal<CierreCajaChica[]>([]);
  cargandoHistorico = signal(false);

  /** El histórico se ordena por fecha desc; el primero es "el último cierre". */
  ultimoCierre = computed<CierreCajaChica | null>(() => this.cierres()[0] ?? null);

  // ─── Nuevo cierre ───────────────────────────────────────
  mostrarNuevo = signal(false);
  fechaCierre = signal<string>('');
  preparando = signal(false);
  cierreActual = signal<CierreCajaChica | null>(null);
  movimientosCierre = signal<MovimientoCajaChica[]>([]);

  saldoFisico = signal<string>('');
  cuentaDiferencia = signal<PlanCuenta | null>(null);
  observacionConfirmar = '';
  confirmando = signal(false);

  // ─── Anular / ver movimientos de un cierre del histórico ─
  anulando = signal<number | null>(null);
  verMovimientosDe = signal<number | null>(null);
  cargandoMovimientosDe = signal<number | null>(null);
  private movimientosPorCierre = signal<Record<number, MovimientoCajaChica[]>>({});

  errorMsg = signal('');
  successMsg = signal('');

  get saldoFisicoNumerico(): number | null {
    const v = parseFloat(this.saldoFisico().replace(',', '.'));
    return Number.isFinite(v) ? v : null;
  }

  /** null mientras no hay cierre preparado o no se ingresó el saldo físico. */
  get diferencia(): number | null {
    const cierre = this.cierreActual();
    const sf = this.saldoFisicoNumerico;
    if (!cierre || sf == null) return null;
    return sf - cierre.saldoLibros;
  }

  get requiereCuentaDiferencia(): boolean {
    const d = this.diferencia;
    return d != null && Math.abs(d) > TOLERANCIA_DIFERENCIA;
  }

  get puedeConfirmar(): boolean {
    return !!this.cierreActual()
      && this.saldoFisicoNumerico != null
      && (!this.requiereCuentaDiferencia || !!this.cuentaDiferencia())
      && !this.confirmando();
  }

  ngOnInit(): void {
    this.cargarCajas();
  }

  private cargarCajas(): void {
    const idEmpresa = this.appState.getEmpresa()?.codigo;
    if (!idEmpresa) {
      this.cajas.set([]);
      this.errorMsg.set('No se pudo determinar la empresa de la sesión');
      return;
    }

    this.cargandoCajas.set(true);
    this.cajaS.activas(idEmpresa).subscribe({
      next: (data) => {
        this.cajas.set(Array.isArray(data) ? data : []);
        this.cargandoCajas.set(false);
      },
      error: () => {
        this.cajas.set([]);
        this.cargandoCajas.set(false);
      },
    });
  }

  onCajaChange(idCaja: number | null): void {
    this.selectedCajaId.set(idCaja);
    this.cancelarNuevo();
    this.verMovimientosDe.set(null);
    this.movimientosPorCierre.set({});
    if (idCaja) {
      this.cargarHistorico(idCaja);
    } else {
      this.cierres.set([]);
    }
  }

  private cargarHistorico(idCaja: number): void {
    this.cargandoHistorico.set(true);
    this.errorMsg.set('');
    this.cierreS.listar(idCaja).subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : [];
        items.sort((a, b) => this.aTiempo(b.fecha) - this.aTiempo(a.fecha) || b.codigo - a.codigo);
        this.cierres.set(items);
        this.cargandoHistorico.set(false);
      },
      error: (err) => {
        this.cierres.set([]);
        this.cargandoHistorico.set(false);
        this.errorMsg.set(CierreCajaChicaService.mensajeError(err));
      },
    });
  }

  // ═══ NUEVO CIERRE ═══════════════════════════════════════

  abrirNuevo(): void {
    this.mostrarNuevo.set(true);
    this.fechaCierre.set(this.hoyISO());
    this.cierreActual.set(null);
    this.movimientosCierre.set([]);
    this.saldoFisico.set('');
    this.cuentaDiferencia.set(null);
    this.observacionConfirmar = '';
    this.errorMsg.set('');
    this.successMsg.set('');
  }

  cancelarNuevo(): void {
    this.mostrarNuevo.set(false);
    this.cierreActual.set(null);
    this.movimientosCierre.set([]);
    this.saldoFisico.set('');
    this.cuentaDiferencia.set(null);
    this.observacionConfirmar = '';
  }

  prepararCierre(): void {
    const idCaja = this.selectedCajaId();
    if (!idCaja || !this.fechaCierre()) return;

    this.preparando.set(true);
    this.errorMsg.set('');

    this.cierreS.preparar({
      idCaja,
      fecha: this.fechaCierre(),
      idUsuario: this.appState.getIdUsuario(),
    }).subscribe({
      next: (resp) => {
        this.preparando.set(false);
        this.cierreActual.set(resp.cierre);
        this.movimientosCierre.set(Array.isArray(resp.movimientos) ? resp.movimientos : []);
      },
      error: (err) => {
        this.preparando.set(false);
        this.errorMsg.set(CierreCajaChicaService.mensajeError(err));
      },
    });
  }

  elegirCuentaDiferencia(): void {
    const data: PlanCuentaSelectorDialogData = {
      titulo: 'Cuenta contable del ajuste por diferencia',
      mostrarSoloMovimiento: true,
    };
    this.dialog.open(PlanCuentaSelectorDialogComponent, { width: '900px', maxWidth: '98vw', data })
      .afterClosed().subscribe((cuenta: PlanCuenta | null) => {
        if (cuenta) this.cuentaDiferencia.set(cuenta);
      });
  }

  confirmarCierre(): void {
    const cierre = this.cierreActual();
    const saldoFisico = this.saldoFisicoNumerico;
    if (!cierre || saldoFisico == null) return;

    if (this.requiereCuentaDiferencia && !this.cuentaDiferencia()) {
      this.errorMsg.set('Seleccione la cuenta contable del ajuste antes de confirmar.');
      return;
    }

    this.confirmando.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    this.cierreS.confirmar(cierre.codigo, {
      saldoFisico,
      observacion: this.observacionConfirmar.trim() || undefined,
      idPlanCuentaDiferencia: this.requiereCuentaDiferencia ? this.cuentaDiferencia()!.codigo : undefined,
      idUsuario: this.appState.getIdUsuario(),
    }).subscribe({
      next: () => {
        this.confirmando.set(false);
        this.successMsg.set('Cierre confirmado correctamente.');
        this.snackBar.open('✓ Cierre confirmado correctamente', 'Cerrar', {
          duration: 4000,
          panelClass: ['snackbar-success'],
        });
        this.cancelarNuevo();
        const idCaja = this.selectedCajaId();
        if (idCaja) this.cargarHistorico(idCaja);
      },
      error: (err) => {
        this.confirmando.set(false);
        this.errorMsg.set(CierreCajaChicaService.mensajeError(err));
      },
    });
  }

  // ═══ HISTÓRICO: ANULAR / VER MOVIMIENTOS ════════════════

  /**
   * Solo se ofrece anular el último cierre de la lista y solo si está
   * Cerrado; es una guía de UX, el backend sigue siendo quien decide si
   * realmente se puede.
   */
  puedeAnular(cierre: CierreCajaChica): boolean {
    return this.ultimoCierre()?.codigo === cierre.codigo
      && cierre.rubroEstadoH === EstadoCierreCajaChica.CERRADO;
  }

  anularCierre(cierre: CierreCajaChica): void {
    if (!this.puedeAnular(cierre)) return;

    const data: MotivoDialogData = {
      titulo: `Anular cierre del ${this.formatearFecha(cierre.fecha)}`,
      advertencia: 'Se anulará este cierre y, si generó un ajuste contable por diferencia, también se deshace.',
      textoConfirmar: 'Sí, anular cierre',
    };

    this.dialog.open(MotivoDialogComponent, { width: '480px', data }).afterClosed().subscribe((motivo) => {
      if (!motivo) return;

      this.anulando.set(cierre.codigo);
      this.cierreS.anular(cierre.codigo, { motivo, idUsuario: this.appState.getIdUsuario() }).subscribe({
        next: () => {
          this.anulando.set(null);
          this.snackBar.open('✓ Cierre anulado correctamente', 'Cerrar', {
            duration: 4000,
            panelClass: ['snackbar-success'],
          });
          const idCaja = this.selectedCajaId();
          if (idCaja) this.cargarHistorico(idCaja);
        },
        error: (err) => {
          this.anulando.set(null);
          this.snackBar.open('✗ ' + CierreCajaChicaService.mensajeError(err), 'Cerrar', {
            duration: 6000,
            panelClass: ['snackbar-error'],
          });
        },
      });
    });
  }

  toggleMovimientos(cierre: CierreCajaChica): void {
    if (this.verMovimientosDe() === cierre.codigo) {
      this.verMovimientosDe.set(null);
      return;
    }
    this.verMovimientosDe.set(cierre.codigo);
    if (this.movimientosPorCierre()[cierre.codigo]) return;

    this.cargandoMovimientosDe.set(cierre.codigo);
    this.cierreS.movimientos(cierre.codigo).subscribe({
      next: (data) => {
        this.cargandoMovimientosDe.set(null);
        this.movimientosPorCierre.update((m) => ({ ...m, [cierre.codigo]: Array.isArray(data) ? data : [] }));
      },
      error: () => {
        this.cargandoMovimientosDe.set(null);
        this.movimientosPorCierre.update((m) => ({ ...m, [cierre.codigo]: [] }));
      },
    });
  }

  movimientosDe(cierre: CierreCajaChica): MovimientoCajaChica[] {
    return this.movimientosPorCierre()[cierre.codigo] ?? [];
  }

  // ═══ PRESENTACIÓN ═══════════════════════════════════════

  etiquetaEstadoCierre(cierre: CierreCajaChica): string {
    switch (cierre.rubroEstadoH) {
      case EstadoCierreCajaChica.BORRADOR: return 'Borrador';
      case EstadoCierreCajaChica.CERRADO: return 'Cerrado';
      case EstadoCierreCajaChica.ANULADO: return 'Anulado';
      default: return '—';
    }
  }

  claseEstadoCierre(cierre: CierreCajaChica): string {
    switch (cierre.rubroEstadoH) {
      case EstadoCierreCajaChica.CERRADO: return 'badge-cerrado';
      case EstadoCierreCajaChica.ANULADO: return 'badge-anulado';
      default: return 'badge-borrador';
    }
  }

  etiquetaTipoMovimiento(mov: MovimientoCajaChica): string {
    switch (mov.tipo) {
      case TipoMovimientoCajaChica.APERTURA: return 'Apertura';
      case TipoMovimientoCajaChica.GASTO: return 'Gasto';
      case TipoMovimientoCajaChica.REPOSICION: return 'Reposición';
      case TipoMovimientoCajaChica.AJUSTE_MAS: return 'Ajuste (+)';
      case TipoMovimientoCajaChica.AJUSTE_MENOS: return 'Ajuste (−)';
      default: return '—';
    }
  }

  iconoTipoMovimiento(mov: MovimientoCajaChica): string {
    switch (mov.tipo) {
      case TipoMovimientoCajaChica.APERTURA: return 'lock_open';
      case TipoMovimientoCajaChica.GASTO: return 'shopping_cart';
      case TipoMovimientoCajaChica.REPOSICION: return 'account_balance_wallet';
      case TipoMovimientoCajaChica.AJUSTE_MAS: return 'add_circle';
      case TipoMovimientoCajaChica.AJUSTE_MENOS: return 'remove_circle';
      default: return 'help_outline';
    }
  }

  /** Texto exacto pedido: "Se generará un ajuste por $X" (con signo: + sobrante, − faltante). */
  get textoAjuste(): string {
    const d = this.diferencia;
    if (d == null) return '';
    const signo = d > 0 ? '+' : '';
    return `Se generará un ajuste por $${signo}${d.toFixed(2)}`;
  }

  formatearFecha(fecha: any): string {
    if (!fecha) return '—';
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA);
  }

  formatearMonto(monto: number | null | undefined): string {
    return (Number(monto) || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private aTiempo(fecha: any): number {
    return this.funcionesDatos.convertirFechaDesdeBackend(fecha)?.getTime() ?? 0;
  }

  private hoyISO(): string {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }
}
