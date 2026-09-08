import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { CuentaBancaria } from '../../../../tsr/model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../../tsr/service/cuenta-bancaria.service';
import { AnticipoTrabajador } from '../../../model/anticipo-trabajador';
import {
  RegistrarDevolucionAnticipoRequest,
  RegistrarDevolucionAnticipoResponse,
} from '../../../model/devolucion-anticipo';
import { DevolucionAnticipoService } from '../../../service/devolucion-anticipo.service';

export interface RegistrarDevolucionDialogData {
  anticipo: AnticipoTrabajador;
}

/**
 * Registra que un empleado devolvió (total o parcialmente) un anticipo depositando en la cuenta
 * de la empresa, en vez de que se le siga descontando del rol.
 *
 * **El diálogo no se cierra solo al guardar.** Cambia a una vista de resultado con las cuotas que
 * quedaron canceladas y el aviso de período ya calculado si vino — es la mitad del valor de la
 * pantalla (`docs/rrh/API-DEVOLUCION-ANTICIPO.md` §6) y un snackbar de unos segundos no alcanza
 * para que alguien lo lea con calma.
 */
@Component({
  selector: 'app-registrar-devolucion-dialog',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './registrar-devolucion-dialog.component.html',
  styleUrls: ['./registrar-devolucion-dialog.component.scss'],
})
export class RegistrarDevolucionDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<RegistrarDevolucionDialogComponent, RegistrarDevolucionAnticipoResponse | null>);
  private devolucionS = inject(DevolucionAnticipoService);
  private cuentaBancariaS = inject(CuentaBancariaService);
  private appState = inject(AppStateService);

  cuentas = signal<CuentaBancaria[]>([]);

  // Sin valor por defecto a propósito: es la fecha REAL del depósito, no la de hoy — quien
  // registra tiene que elegirla, nunca asumir que coincide con el día de la captura.
  fecha: Date | null = null;
  valor: string | number = '';
  idCuentaBancaria: number | null = null;
  referencia = '';
  observacion = '';

  guardando = signal(false);
  errorMsg = signal('');

  /** `null` mientras no se ha registrado nada; una vez que llega, el diálogo pasa a mostrarlo. */
  resultado = signal<RegistrarDevolucionAnticipoResponse | null>(null);

  constructor(@Inject(MAT_DIALOG_DATA) public data: RegistrarDevolucionDialogData) {}

  ngOnInit(): void {
    this.cargarCuentas();
  }

  private cargarCuentas(): void {
    const idEmpresa = this.appState.getEmpresa()?.codigo;
    this.cuentaBancariaS.getAll().subscribe({
      next: (data) => {
        let lista = Array.isArray(data) ? data : [];
        lista = lista.filter((c) => Number(c.estado) === 1);
        if (idEmpresa) {
          lista = lista.filter((c: any) => c.banco?.empresa?.codigo === idEmpresa || c.empresa?.codigo === idEmpresa);
        }
        this.cuentas.set(lista);
      },
      error: () => this.cuentas.set([]),
    });
  }

  etiquetaCuenta(cuenta: CuentaBancaria): string {
    return `${cuenta.banco?.nombre ?? 'Banco'} — ${cuenta.numeroCuenta}`;
  }

  empleadoNombre(): string {
    const empleado = this.data.anticipo.empleado;
    if (!empleado) return '';
    return `${empleado.apellidos ?? ''} ${empleado.nombres ?? ''}`.replace(/\s+/g, ' ').trim();
  }

  private numero(valor: unknown): number {
    const n = parseFloat(String(valor ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  private fechaISO(fecha: Date | null): string {
    if (!fecha) return '';
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  get formValido(): boolean {
    return !!this.fecha && this.numero(this.valor) > 0 && this.idCuentaBancaria !== null && !this.guardando();
  }

  registrar(): void {
    if (!this.formValido || this.idCuentaBancaria === null) return;

    const payload: RegistrarDevolucionAnticipoRequest = {
      idAnticipo: this.data.anticipo.codigo,
      fecha: this.fechaISO(this.fecha),
      valor: this.numero(this.valor),
      idCuentaBancaria: this.idCuentaBancaria,
      referencia: this.referencia.trim() || null,
      observacion: this.observacion.trim() || null,
      idUsuario: this.appState.getIdUsuario(),
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    this.devolucionS.registrar(payload).subscribe({
      next: (respuesta) => {
        this.guardando.set(false);
        this.resultado.set(respuesta);
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorMsg.set(mensajeDeError(err, 'No se pudo registrar la devolución.'));
      },
    });
  }

  cerrar(): void {
    // Si ya se registró, el que abrió el diálogo necesita el resultado para refrescar saldo/estado.
    this.dialogRef.close(this.resultado());
  }
}
