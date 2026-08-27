import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { Banco } from '../../../model/banco';
import { Chequera, ChequeraResumen } from '../../../model/chequera';
import { CuentaBancaria } from '../../../model/cuenta-bancaria';
import { BancoService } from '../../../service/banco.service';
import { ChequeraService } from '../../../service/chequera.service';
import { CuentaBancariaService } from '../../../service/cuenta-bancaria.service';

/**
 * Recepción física de una chequera nueva: se elige la cuenta (solo las que
 * manejan chequera), el backend sugiere el número inicial y se registra el
 * rango recibido. Reemplaza el flujo legado que actualizaba directamente una
 * "solicitud" con `ChequeraService.update` — ahora todo pasa por
 * `POST /chqr/registrarRecepcion`, que deja la chequera ACTIVA de una vez.
 *
 * `solicitud-chequera` sigue aparte: solo registra la intención (estado
 * SOLICITADA) y no se toca en este flujo.
 */
@Component({
  selector: 'app-recepcion-chequera',
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
    MatSnackBarModule,
  ],
  templateUrl: './recepcion-chequera.component.html',
  styleUrls: ['./recepcion-chequera.component.scss'],
})
export class RecepcionChequeraComponent implements OnInit {
  bancos = signal<Banco[]>([]);
  cuentas = signal<CuentaBancaria[]>([]);

  selectedBancoId = signal<number | null>(null);
  selectedCuentaId = signal<number | null>(null);

  /** Solo cuentas del banco elegido que manejan chequera. */
  cuentasDisponibles = computed(() =>
    this.cuentas().filter(
      (c) => c.banco?.codigo === this.selectedBancoId() && Number((c as any).manejaChequera) === 1
    )
  );

  cuentaSeleccionada = computed(
    () => this.cuentas().find((c) => c.codigo === this.selectedCuentaId()) ?? null
  );

  // Formulario de recepción
  comienza = signal<number | null>(null);
  finaliza = signal<number | null>(null);
  cantidad = signal<number | null>(null);
  fechaEntrega = signal<string>('');
  horaEntrega = signal<string>('00:00');

  loading = signal<boolean>(false);
  cargandoSugerido = signal<boolean>(false);
  errorMsg = signal<string>('');
  successMsg = signal<string>('');

  chequeraRegistrada = signal<Chequera | null>(null);
  resumen = signal<ChequeraResumen | null>(null);

  formListo = computed(() => {
    const c = this.comienza();
    const f = this.finaliza();
    return !!this.selectedCuentaId() && !!c && !!f && f >= c && !!this.fechaEntrega();
  });

  constructor(
    private bancoService: BancoService,
    private cuentaService: CuentaBancariaService,
    private chequeraService: ChequeraService,
    private appState: AppStateService,
    private funcionesDatos: FuncionesDatosService,
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

  onBancoChange(bancoId: number | null): void {
    this.selectedBancoId.set(bancoId);
    this.selectedCuentaId.set(null);
    this.reiniciarFormulario();
  }

  onCuentaChange(cuentaId: number | null): void {
    this.selectedCuentaId.set(cuentaId);
    this.reiniciarFormulario();
    if (!cuentaId) return;
    this.sugerirInicio(cuentaId);
  }

  private sugerirInicio(idCuenta: number): void {
    this.cargandoSugerido.set(true);
    this.errorMsg.set('');
    this.chequeraService.sugerirInicio(idCuenta).subscribe({
      next: (r) => {
        this.cargandoSugerido.set(false);
        this.comienza.set(r?.siguiente ?? 1);
      },
      error: (err) => {
        console.error('Error al sugerir inicio de chequera', err);
        this.cargandoSugerido.set(false);
        this.comienza.set(1);
        this.errorMsg.set('No se pudo sugerir el número inicial; verifique el rango antes de registrar');
      },
    });
  }

  /** Cantidad escrita por el usuario → recalcula "Termina en". */
  onCantidadChange(valor: number | null): void {
    this.cantidad.set(valor);
    const inicio = this.comienza();
    if (inicio && valor && valor > 0) {
      this.finaliza.set(inicio + valor - 1);
    }
  }

  /** "Termina en" escrito por el usuario → recalcula la cantidad. */
  onFinalizaChange(valor: number | null): void {
    this.finaliza.set(valor);
    const inicio = this.comienza();
    if (inicio && valor && valor >= inicio) {
      this.cantidad.set(valor - inicio + 1);
    }
  }

  /** El usuario editó "Comienza en" a mano (poco común, pero no está bloqueado). */
  onComienzaChange(valor: number | null): void {
    this.comienza.set(valor);
    const cant = this.cantidad();
    if (valor && cant && cant > 0) {
      this.finaliza.set(valor + cant - 1);
    }
  }

  private reiniciarFormulario(): void {
    this.comienza.set(null);
    this.finaliza.set(null);
    this.cantidad.set(null);
    this.fechaEntrega.set('');
    this.horaEntrega.set('00:00');
    this.errorMsg.set('');
    this.successMsg.set('');
    this.chequeraRegistrada.set(null);
    this.resumen.set(null);
  }

  registrarRecepcion(): void {
    const idCuenta = this.selectedCuentaId();
    const comienza = this.comienza();
    const finaliza = this.finaliza();

    if (!idCuenta || !comienza || !finaliza || finaliza < comienza || !this.fechaEntrega()) {
      this.errorMsg.set('Complete cuenta, rango de cheques y fecha de entrega');
      return;
    }

    const hora = this.horaEntrega() || '00:00';
    const payload = {
      idCuentaBancaria: idCuenta,
      comienza,
      finaliza,
      fechaEntrega: `${this.fechaEntrega()}T${hora}:00`,
      idUsuario: this.appState.getIdUsuario(),
    };

    this.loading.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    this.chequeraService.registrarRecepcion(payload).subscribe({
      next: (chequera) => {
        this.loading.set(false);
        this.chequeraRegistrada.set(chequera);
        this.successMsg.set(`Chequera registrada: cheques ${comienza} a ${finaliza}`);
        this.snackBar.open('✓ Chequera recibida correctamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['snackbar-success'],
        });
        this.cargarResumen(chequera.codigo);
      },
      error: (err) => {
        console.error('Error al registrar recepción de chequera:', err);
        this.loading.set(false);
        this.errorMsg.set(ChequeraService.mensajeError(err));
        this.snackBar.open('✗ ' + ChequeraService.mensajeError(err), 'Cerrar', {
          duration: 5000,
          panelClass: ['snackbar-error'],
        });
      },
    });
  }

  private cargarResumen(idChequera: number): void {
    this.chequeraService.resumen(idChequera).subscribe({
      next: (r) => this.resumen.set(r),
      error: (err) => console.error('Error al cargar resumen de chequera', err),
    });
  }

  registrarOtra(): void {
    this.reiniciarFormulario();
    const idCuenta = this.selectedCuentaId();
    if (idCuenta) this.sugerirInicio(idCuenta);
  }

  formatearFecha(fecha: any): string {
    if (!fecha) return '';
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA);
  }
}
