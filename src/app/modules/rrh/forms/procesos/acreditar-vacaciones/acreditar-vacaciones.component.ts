import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { empresaSesionCodigo } from '../../../../../shared/services/empresa-sesion';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { SaldoVacacionesService } from '../../../service/saldo-vacaciones.service';

/**
 * Proceso anual de acreditación de vacaciones (POST /sldv/acreditar), ya en
 * producción pero sin pantalla — se venía corriendo a mano por API. Sin este
 * proceso el saldo del año en curso no existe para ningún empleado.
 */
@Component({
  selector: 'app-acreditar-vacaciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './acreditar-vacaciones.component.html',
  styleUrls: ['./acreditar-vacaciones.component.scss'],
})
export class AcreditarVacacionesComponent {
  private saldoS = inject(SaldoVacacionesService);
  private appState = inject(AppStateService);
  private dialog = inject(MatDialog);

  fechaCorte = signal<string>(this.ultimoDiaMesActual());
  acreditando = signal(false);
  resultado = signal<number | null>(null);
  error = signal('');

  anioRevertir = signal<number>(new Date().getFullYear());
  revirtiendo = signal(false);
  resultadoRevertir = signal<number | null>(null);
  errorRevertir = signal('');

  private ultimoDiaMesActual(): string {
    const hoy = new Date();
    const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    return this.aFechaISO(ultimo);
  }

  private aFechaISO(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /** Escribe sobre los saldos de todo el personal: exige confirmación explícita antes de correr. */
  confirmarYAcreditar(): void {
    if (!this.fechaCorte() || this.acreditando()) return;

    const data: ConfirmDialogData = {
      title: 'Acreditar período de vacaciones',
      message:
        'Se acreditará el período anual de vacaciones a los empleados que hayan cumplido un año '
        + 'de servicio hasta esa fecha, arrastrando los días no gozados. Los saldos vencidos según '
        + 'el plazo de caducidad se marcarán como caducados.\n\n'
        + 'Esta acción escribe sobre los saldos de todo el personal.',
      confirmText: 'Sí, acreditar',
      cancelText: 'Cancelar',
      type: 'warning',
      details: [{ label: 'Fecha de corte', value: this.fechaCorte() }],
    };

    this.dialog.open(ConfirmDialogComponent, { width: '520px', data }).afterClosed().subscribe((ok: boolean) => {
      if (ok) this.acreditar();
    });
  }

  private acreditar(): void {
    const idEmpresa = empresaSesionCodigo() ?? this.appState.getEmpresa()?.codigo;
    if (!idEmpresa) {
      this.error.set('No se pudo determinar la empresa de la sesión');
      return;
    }

    this.acreditando.set(true);
    this.error.set('');
    this.resultado.set(null);

    this.saldoS.acreditar({
      idEmpresa,
      fechaCorte: this.fechaCorte(),
      usuarioRegistro: usuarioSesion(),
    }).subscribe({
      next: (cantidad) => {
        this.acreditando.set(false);
        this.resultado.set(cantidad);
      },
      error: (err) => {
        this.acreditando.set(false);
        this.error.set(mensajeDeError(err, 'No se pudo acreditar el período de vacaciones'));
      },
    });
  }

  nuevaAcreditacion(): void {
    this.resultado.set(null);
    this.error.set('');
  }

  /** Escribe sobre los saldos de todo el personal del año elegido: exige confirmación explícita. */
  confirmarYRevertir(): void {
    if (!this.anioRevertir() || this.revirtiendo()) return;

    const data: ConfirmDialogData = {
      title: 'Revertir acreditación',
      message:
        'Se borrarán los saldos de vacaciones del año elegido para todo el personal. Se rechaza '
        + 'completa si algún empleado ya usó o le pagaron días de ese saldo, o si viene de la '
        + 'migración — no admite reversión parcial.',
      confirmText: 'Sí, revertir',
      cancelText: 'Cancelar',
      type: 'danger',
      details: [{ label: 'Año a revertir', value: String(this.anioRevertir()) }],
    };

    this.dialog.open(ConfirmDialogComponent, { width: '520px', data }).afterClosed().subscribe((ok: boolean) => {
      if (ok) this.revertir();
    });
  }

  private revertir(): void {
    const idEmpresa = empresaSesionCodigo() ?? this.appState.getEmpresa()?.codigo;
    if (!idEmpresa) {
      this.errorRevertir.set('No se pudo determinar la empresa de la sesión');
      return;
    }

    this.revirtiendo.set(true);
    this.errorRevertir.set('');
    this.resultadoRevertir.set(null);

    this.saldoS.revertirAcreditacion({
      idEmpresa,
      anio: this.anioRevertir(),
      usuarioRegistro: usuarioSesion(),
    }).subscribe({
      next: (cantidad) => {
        this.revirtiendo.set(false);
        this.resultadoRevertir.set(cantidad);
      },
      error: (err) => {
        this.revirtiendo.set(false);
        this.errorRevertir.set(mensajeDeError(err, 'No se pudo revertir la acreditación'));
      },
    });
  }

  nuevaReversion(): void {
    this.resultadoRevertir.set(null);
    this.errorRevertir.set('');
  }
}
