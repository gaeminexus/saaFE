import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { PermisosService } from '../../../../../shared/services/permisos.service';
import { Permisos } from '../../../../../shared/model/permisos';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { opcionesAviso } from '../../comunes/avisos';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AnticipoTrabajador, EstadoAnticipo } from '../../../model/anticipo-trabajador';
import { DevolucionAnticipo, EstadoDevolucionAnticipo } from '../../../model/devolucion-anticipo';
import { DevolucionAnticipoService } from '../../../service/devolucion-anticipo.service';
import { RegistrarDevolucionDialogComponent } from './registrar-devolucion-dialog.component';

export interface DevolucionesAnticipoDialogData {
  anticipo: AnticipoTrabajador;
}

/**
 * Lista las devoluciones registradas sobre un anticipo, con la acción de anular, y desde acá
 * mismo se abre el alta de una nueva — así queda en un solo lugar el historial completo de "cómo
 * volvió esta plata" (`docs/rrh/API-DEVOLUCION-ANTICIPO.md` §6).
 */
@Component({
  selector: 'app-devoluciones-anticipo-dialog',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './devoluciones-anticipo-dialog.component.html',
  styleUrls: ['./devoluciones-anticipo-dialog.component.scss'],
})
export class DevolucionesAnticipoDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<DevolucionesAnticipoDialogComponent, boolean>);
  private devolucionS = inject(DevolucionAnticipoService);
  private funcionesDatosS = inject(FuncionesDatosService);
  private appState = inject(AppStateService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private permisosService = inject(PermisosService);

  readonly EstadoDevolucionAnticipo = EstadoDevolucionAnticipo;

  devoluciones = signal<DevolucionAnticipo[]>([]);
  cargando = signal(false);
  procesando = signal<number | null>(null);

  /** Se le informa al que abrió el diálogo si hubo altas o anulaciones, para que refresque su lista. */
  private huboCambios = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: DevolucionesAnticipoDialogData) {}

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.devolucionS.porAnticipo(this.data.anticipo.codigo).subscribe({
      next: (data) => {
        this.devoluciones.set((data ?? []).map((d) => this.normalizar(d)));
        this.cargando.set(false);
      },
      error: (err) => {
        this.devoluciones.set([]);
        this.cargando.set(false);
        this.avisar(mensajeDeError(err, 'No se pudieron cargar las devoluciones.'), true);
      },
    });
  }

  private normalizar(d: DevolucionAnticipo): DevolucionAnticipo {
    return { ...d, fecha: this.funcionesDatosS.convertirFechaDesdeBackend(d.fecha) };
  }

  get puedeRegistrarNueva(): boolean {
    const estado = Number(this.data.anticipo.estado);
    return estado === EstadoAnticipo.PAGADO || estado === EstadoAnticipo.EN_DESCUENTO;
  }

  etiquetaCuenta(d: DevolucionAnticipo): string {
    const cuenta = d.cuentaBancaria;
    if (!cuenta) return '—';
    return `${cuenta.banco?.nombre ?? 'Banco'} — ${cuenta.numeroCuenta}`;
  }

  etiquetaEstado(estado: number): string {
    return Number(estado) === EstadoDevolucionAnticipo.VIGENTE ? 'Vigente' : 'Anulada';
  }

  puedeAnular(d: DevolucionAnticipo): boolean {
    return Number(d.estado) === EstadoDevolucionAnticipo.VIGENTE;
  }

  registrarNueva(): void {
    this.dialog
      .open(RegistrarDevolucionDialogComponent, {
        width: '640px',
        maxWidth: '98vw',
        data: { anticipo: this.data.anticipo },
      })
      .afterClosed()
      .subscribe((resultado) => {
        if (!resultado) return;
        this.huboCambios = true;
        // El estado/saldo del anticipo que trae `data.anticipo` puede haber quedado viejo (p.ej.
        // pasó a CANCELADO): se refleja para que `puedeRegistrarNueva` no siga ofreciendo el alta.
        this.data.anticipo.estado = resultado.estadoAnticipo;
        this.data.anticipo.saldo = resultado.saldoNuevo;
        this.cargar();
      });
  }

  anular(d: DevolucionAnticipo): void {
    const data: MotivoDialogData = {
      titulo: `Anular devolución N.° ${d.codigo}`,
      advertencia: 'Se deshace el ingreso contable, se devuelven las cuotas afectadas a pendiente '
        + 'y se repone el saldo del anticipo.',
      textoConfirmar: 'Sí, anular',
    };

    this.permisosService.ejecutarSiPermitido(
      Permisos.RRH_ANTICIPOS_A_TRABAJADORES_MOTIVO,
      () => {
        this.dialog.open(MotivoDialogComponent, { width: '480px', data }).afterClosed().subscribe((motivo: string | null) => {
          if (!motivo) return;

          this.procesando.set(d.codigo);
          this.devolucionS.anular(d.codigo, { motivo, idUsuario: this.appState.getIdUsuario() }).subscribe({
            next: () => {
              this.procesando.set(null);
              this.huboCambios = true;
              this.avisar('Devolución anulada.');
              this.cargar();
            },
            error: (err) => {
              this.procesando.set(null);
              this.avisar(mensajeDeError(err, 'No se pudo anular la devolución.'), true);
            },
          });
        });
      },
      (mensaje) => this.avisar(mensaje.toUpperCase(), true),
    );
  }

  cerrar(): void {
    this.dialogRef.close(this.huboCambios);
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', opcionesAviso(esError, mensaje));
  }
}
