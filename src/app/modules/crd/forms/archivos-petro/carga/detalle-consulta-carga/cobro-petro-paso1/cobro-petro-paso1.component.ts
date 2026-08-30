import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../../../../shared/modules/material-form.module';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { MotivoDialogComponent, MotivoDialogData } from '../../../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../../../../shared/services/usuario-sesion';
import { ServiciosAsoprepService } from '../../../../../../asoprep/service/servicios-asoprep.service';
import { CuentaBancaria } from '../../../../../../tsr/model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../../../../tsr/service/cuenta-bancaria.service';
import { BancoExterno } from '../../../../../../tsr/model/banco-externo.model';
import { BancoExternoService } from '../../../../../../tsr/service/banco-externo.service';
import {
  AsientoCobroPetroDTO,
  EstadoTransferenciasCargaDTO,
  NuevaTransferenciaRequest,
  TransferenciaDTO,
} from '../../../../../model/cobro-petro';

/**
 * Paso 1 del cobro de Petro en dos pasos (docs/crd/API-COBRO-PETRO-DOS-PASOS.md, contrato
 * congelado). Se embebe dentro de la pantalla de revisión de una carga Petro
 * (`detalle-consulta-carga`), antes de la sección de "Procesar archivo" (paso 2): el paso 2 no
 * puede ejecutarse si este paso 1 no está hecho (§1 del contrato).
 *
 * Expone `confirmada` como signal público para que el padre pueda deshabilitar el botón de
 * "Procesar archivo" leyéndolo por referencia de plantilla (`#pasoUno`), sin necesidad de un
 * `@Output()` — el padre ya usa signals para ese tipo de estado.
 */
@Component({
  selector: 'app-cobro-petro-paso1',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MaterialFormModule],
  templateUrl: './cobro-petro-paso1.component.html',
  styleUrl: './cobro-petro-paso1.component.scss',
})
export class CobroPetroPaso1Component implements OnInit {
  private serviciosAsoprep = inject(ServiciosAsoprepService);
  private cuentaBancariaService = inject(CuentaBancariaService);
  private bancoExternoService = inject(BancoExternoService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  idCarga = input.required<number>();

  /** Tope del datepicker de la transferencia: no puede ser posterior a hoy. */
  readonly hoy = new Date();

  cargando = signal(true);
  error = signal<string>('');
  estado = signal<EstadoTransferenciasCargaDTO | null>(null);

  /** Público a propósito: el padre lo lee por referencia de plantilla para gatear el paso 2. */
  confirmada = computed(() => this.estado()?.confirmada ?? false);

  cuentasBancarias = signal<CuentaBancaria[]>([]);
  bancosExternos = signal<BancoExterno[]>([]);

  mostrarFormNueva = signal(false);
  guardandoTransferencia = signal(false);
  anulandoId = signal<number | null>(null);
  confirmando = signal(false);
  reversando = signal(false);
  observacionConfirmar = '';

  mostrarEstadoContable = signal(false);
  cargandoAsientos = signal(false);
  asientos = signal<AsientoCobroPetroDTO[]>([]);

  formNueva: FormGroup = this.fb.group({
    idCuentaBancaria: [null as number | null, Validators.required],
    idBancoExterno: [null as number | null, Validators.required],
    cuentaOrigen: ['', [Validators.required, Validators.maxLength(50)]],
    numero: ['', [Validators.required, Validators.maxLength(50)]],
    valor: [0, [Validators.required, Validators.min(0.01)]],
    fecha: [new Date() as Date | null, Validators.required],
    observacion: ['', Validators.maxLength(200)],
  });

  /**
   * `idCarga` es un `input.required()`: leerlo en el constructor dispara NG0950 porque los
   * inputs de señal todavía no están resueltos en ese punto — recién lo están a partir de
   * `ngOnInit`.
   */
  ngOnInit(): void {
    this.cargarCuentasBancarias();
    this.cargarBancosExternos();
    this.cargarEstado();
  }

  private cargarEstado(): void {
    this.cargando.set(true);
    this.error.set('');
    this.serviciosAsoprep.obtenerTransferencias(this.idCarga()).subscribe({
      next: (data) => {
        this.cargando.set(false);
        if (!data) {
          this.error.set('No se pudo cargar el estado de transferencias de esta carga.');
          return;
        }
        this.estado.set(data);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.mensaje || 'No se pudo cargar el estado de transferencias de esta carga.');
      },
    });
  }

  private cargarCuentasBancarias(): void {
    const idEmpresa = this.idEmpresaSesion();
    this.cuentaBancariaService.getAll().subscribe({
      next: (data) => {
        let lista = Array.isArray(data) ? data : [];
        if (idEmpresa) {
          lista = lista.filter((c) => c.banco?.empresa?.codigo === idEmpresa);
        }
        this.cuentasBancarias.set(lista);
      },
      error: () => this.cuentasBancarias.set([]),
    });
  }

  private cargarBancosExternos(): void {
    this.bancoExternoService.getAll().subscribe({
      next: (data) => this.bancosExternos.set(data ?? []),
      error: () => this.bancosExternos.set([]),
    });
  }

  etiquetaCuenta(cuenta: CuentaBancaria): string {
    return `${cuenta.banco?.nombre ?? 'Banco'} — ${cuenta.numeroCuenta}`;
  }

  formatFecha(fecha: unknown): string {
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA) || '—';
  }

  formatFechaHora(fecha: unknown): string {
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.FECHA_HORA) || '—';
  }

  formatMonto(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ══════════════════════ Transferencias ══════════════════════

  abrirFormNueva(): void {
    this.formNueva.reset({
      idCuentaBancaria: null,
      idBancoExterno: null,
      cuentaOrigen: '',
      numero: '',
      valor: 0,
      fecha: new Date(),
      observacion: '',
    });
    this.mostrarFormNueva.set(true);
  }

  cerrarFormNueva(): void {
    this.mostrarFormNueva.set(false);
  }

  guardarTransferencia(): void {
    if (this.formNueva.invalid) {
      this.formNueva.markAllAsTouched();
      this.snackBar.open('Complete los campos requeridos.', 'Cerrar', { duration: 3000 });
      return;
    }

    const { idCuentaBancaria, idBancoExterno, cuentaOrigen, numero, valor, fecha, observacion } =
      this.formNueva.getRawValue();
    const cuenta = this.cuentasBancarias().find((c) => c.codigo === idCuentaBancaria);
    const fechaTexto = this.funcionesDatos.formatearFechaParaBackend(fecha as Date, TipoFormatoFechaBackend.SOLO_FECHA);
    if (!cuenta || !fechaTexto) {
      this.snackBar.open('Seleccione una cuenta bancaria y una fecha válidas.', 'Cerrar', { duration: 3000 });
      return;
    }

    const solicitud: NuevaTransferenciaRequest = {
      idCarga: this.idCarga(),
      idCuentaBancaria: cuenta.codigo,
      idBanco: cuenta.banco.codigo,
      idBancoExterno: idBancoExterno!,
      cuentaOrigen: cuentaOrigen!.trim(),
      numero: numero!.trim(),
      valor: +valor!,
      fecha: fechaTexto,
      observacion: observacion?.trim() || null,
      usuario: usuarioSesion(),
    };

    this.guardandoTransferencia.set(true);
    this.serviciosAsoprep.agregarTransferencia(solicitud).subscribe({
      next: (resultado) => {
        this.guardandoTransferencia.set(false);
        if (!resultado) {
          this.snackBar.open('No se pudo registrar la transferencia.', 'Cerrar', { duration: 5000 });
          return;
        }
        this.snackBar.open('Transferencia registrada.', 'Cerrar', { duration: 3000 });
        this.mostrarFormNueva.set(false);
        this.cargarEstado();
      },
      error: (err) => {
        this.guardandoTransferencia.set(false);
        this.snackBar.open(err?.mensaje || 'No se pudo registrar la transferencia.', 'Cerrar', { duration: 5000 });
      },
    });
  }

  anularTransferencia(t: TransferenciaDTO): void {
    const datosDialogo: ConfirmDialogData = {
      title: 'Anular transferencia',
      message: `¿Anular la transferencia N° ${t.numero} por ${this.formatMonto(t.valor)}?`,
      confirmText: 'Anular',
      cancelText: 'Cancelar',
      type: 'danger',
    };

    this.dialog
      .open(ConfirmDialogComponent, { data: datosDialogo, width: '480px', autoFocus: false })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) return;
        this.anulandoId.set(t.idTransferencia);
        this.serviciosAsoprep.anularTransferencia(t.idTransferencia, usuarioSesion()).subscribe({
          next: () => {
            this.anulandoId.set(null);
            this.snackBar.open('Transferencia anulada.', 'Cerrar', { duration: 3000 });
            this.cargarEstado();
          },
          error: (err) => {
            this.anulandoId.set(null);
            this.snackBar.open(err?.mensaje || 'No se pudo anular la transferencia.', 'Cerrar', { duration: 5000 });
          },
        });
      });
  }

  // ══════════════════════ Confirmación / reverso (§2.2, §2.3, §3) ══════════════════════

  confirmarRecepcion(): void {
    const estado = this.estado();
    if (!estado || !estado.cuadra) return;

    const datosDialogo: ConfirmDialogData = {
      title: 'Confirmar recepción del dinero',
      message: 'Esto sella el paso 1 del cobro: si la contabilidad de CRD está activa, se genera el asiento transitorio. Mientras no se reverse, no se pueden agregar ni anular transferencias.',
      confirmText: 'Confirmar recepción',
      cancelText: 'Cancelar',
      type: 'warning',
      details: [
        { label: 'Total del archivo', value: this.formatMonto(estado.totalArchivo) },
        { label: 'Total transferencias', value: this.formatMonto(estado.totalTransferencias) },
      ],
    };

    this.dialog
      .open(ConfirmDialogComponent, { data: datosDialogo, width: '520px', autoFocus: false })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) return;

        this.confirmando.set(true);
        this.serviciosAsoprep
          .confirmarRecepcion(this.idCarga(), {
            usuario: usuarioSesion(),
            ip: '0.0.0.0',
            observacion: this.observacionConfirmar.trim() || null,
          })
          .subscribe({
            next: (resultado) => {
              this.confirmando.set(false);
              if (!resultado) {
                this.snackBar.open('No se pudo confirmar la recepción.', 'Cerrar', { duration: 5000 });
                return;
              }
              this.observacionConfirmar = '';
              if (resultado.contabilidadActiva) {
                this.snackBar.open(
                  resultado.mensaje || `Recepción confirmada. Asiento ${resultado.numeroAsiento} generado.`,
                  'Cerrar',
                  { duration: 6000 }
                );
              } else {
                // §3: contabilidadActiva:false NO es un error — la confirmación sí ocurrió.
                this.snackBar.open(
                  'Recepción confirmada. La contabilidad de CRD está apagada: no se generó ningún asiento.',
                  'Cerrar',
                  { duration: 8000 }
                );
              }
              this.cargarEstado();
              if (this.mostrarEstadoContable()) this.cargarEstadoContable();
            },
            error: (err) => {
              this.confirmando.set(false);
              this.snackBar.open(err?.mensaje || 'No se pudo confirmar la recepción.', 'Cerrar', { duration: 6000 });
            },
          });
      });
  }

  reversarConfirmacion(): void {
    const datosDialogo: MotivoDialogData = {
      titulo: 'Reversar la confirmación de recepción',
      advertencia:
        'Esto deshace el paso 1: si se generó un asiento transitorio, se anula. Rechaza si el archivo ya fue aplicado (paso 2) — primero hay que reversar ese paso.',
      textoConfirmar: 'Reversar',
      requiereDobleConfirmacion: true,
      textoDobleConfirmacion: 'Entiendo que esta acción deshace la contabilidad ya generada.',
    };

    this.dialog
      .open(MotivoDialogComponent, { data: datosDialogo, width: '520px', maxWidth: '96vw', autoFocus: false })
      .afterClosed()
      .subscribe((motivo?: string | null) => {
        if (!motivo) return;

        this.reversando.set(true);
        this.serviciosAsoprep
          .reversarRecepcion(this.idCarga(), { usuario: usuarioSesion(), ip: '0.0.0.0', motivo })
          .subscribe({
            next: (resultado) => {
              this.reversando.set(false);
              if (!resultado) {
                this.snackBar.open('No se pudo reversar la confirmación.', 'Cerrar', { duration: 5000 });
                return;
              }
              this.snackBar.open(resultado.mensaje || 'Confirmación reversada.', 'Cerrar', { duration: 5000 });
              this.cargarEstado();
              if (this.mostrarEstadoContable()) this.cargarEstadoContable();
            },
            error: (err) => {
              this.reversando.set(false);
              this.snackBar.open(err?.mensaje || 'No se pudo reversar la confirmación.', 'Cerrar', { duration: 6000 });
            },
          });
      });
  }

  // ══════════════════════ Estado contable (§2.4) ══════════════════════

  toggleEstadoContable(): void {
    const abrir = !this.mostrarEstadoContable();
    this.mostrarEstadoContable.set(abrir);
    if (abrir) this.cargarEstadoContable();
  }

  private cargarEstadoContable(): void {
    this.cargandoAsientos.set(true);
    this.serviciosAsoprep.obtenerEstadoContable(this.idCarga()).subscribe({
      next: (data) => {
        this.cargandoAsientos.set(false);
        // Lista vacía = todavía no se contabilizó nada. No es error.
        this.asientos.set(data?.asientos ?? []);
      },
      error: (err) => {
        this.cargandoAsientos.set(false);
        this.snackBar.open(err?.mensaje || 'No se pudo cargar el estado contable.', 'Cerrar', { duration: 5000 });
      },
    });
  }

  private idEmpresaSesion(): number {
    return +(sessionStorage.getItem('idEmpresa') || localStorage.getItem('idEmpresa') || '0');
  }
}
