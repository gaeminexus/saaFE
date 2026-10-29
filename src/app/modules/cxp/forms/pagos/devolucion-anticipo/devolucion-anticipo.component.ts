import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { MotivoDialogComponent, MotivoDialogData } from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { ImprimirAsientoService } from '../../../../../shared/services/imprimir-asiento.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { Titular } from '../../../../tsr/model/titular';
import { CuentaBancaria } from '../../../../tsr/model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../../tsr/service/cuenta-bancaria.service';
import { AnticipoDisponible, AnticipoService } from '../../../../tsr/service/anticipo.service';
import {
  DevolucionAnticipoListado,
  EstadoDevolucionAnticipoProveedor,
  FormaDevolucionProveedor,
  LineaDevolucionAnticipo,
  LineaDevolucionNotaCredito,
  RegistrarDevolucionAnticipoRequest,
} from '../../../model/devolucion-anticipo';
import { DevolucionAnticipoService } from '../../../service/devolucion-anticipo.service';
import { NotaCreditoSaldoService } from '../../../service/nota-credito-saldo.service';
import { NotaCreditoDisponible } from '../../../model/nota-credito-saldo';
import { idUsuarioSesion, MENSAJE_SIN_USUARIO_SESION } from '../../../../../shared/utils/usuario-sesion.util';

/**
 * Devolución del saldo de anticipos de un proveedor: el proveedor deposita en nuestro banco el
 * saldo a favor que le quedó en sus anticipos — docs/cxp/API-DEVOLUCION-ANTICIPO-PROVEEDOR.md §5.
 * Estructura copiada de cruce-anticipo-proveedor.component.ts (sin modificarlo): mismo flujo de
 * elegir proveedor → ver sus anticipos con saldo → repartir un valor por anticipo, pero el valor
 * se devuelve en vez de cruzarse contra una factura.
 */
@Component({
  selector: 'app-devolucion-anticipo',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './devolucion-anticipo.component.html',
  styleUrl: './devolucion-anticipo.component.scss',
})
export class DevolucionAnticipoComponent implements OnInit {
  private devolucionS = inject(DevolucionAnticipoService);
  private anticipoS = inject(AnticipoService);
  private notaCreditoS = inject(NotaCreditoSaldoService);
  private cuentaS = inject(CuentaBancariaService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private imprimirAsientoS = inject(ImprimirAsientoService);

  private readonly ROL_PROVEEDOR = 2;
  readonly EstadoDevolucionAnticipoProveedor = EstadoDevolucionAnticipoProveedor;
  readonly FormaDevolucionProveedor = FormaDevolucionProveedor;

  proveedor = signal<Titular | null>(null);

  // ── Cuenta bancaria propia (adonde llega el depósito) ───────────────────
  cuentas = signal<CuentaBancaria[]>([]);
  cuentaSeleccionada = signal<CuentaBancaria | null>(null);

  // ── Anticipos con saldo a favor ──────────────────────────────────────────
  anticipos = signal<AnticipoDisponible[]>([]);
  cargandoAnticipos = signal(false);
  /** Valor a devolver por anticipo, indexado por id. Vacío por defecto. */
  montos: Record<number, string> = {};

  // ── Notas de crédito con saldo a favor ───────────────────────────────────
  notasCredito = signal<NotaCreditoDisponible[]>([]);
  cargandoNotas = signal(false);
  /** Valor a devolver por nota de crédito, indexado por id. Vacío por defecto. */
  montosNc: Record<number, string> = {};

  // ── Datos del depósito ───────────────────────────────────────────────────
  /** Transferencia por defecto — NC-EXCEDE-SALDO-FACTURA.md §5.2. */
  formForma: number = FormaDevolucionProveedor.TRANSFERENCIA;
  formFecha: Date | null = new Date();
  formReferencia = '';
  formObservacion = '';

  registrando = signal(false);
  error = signal('');
  /** Mensaje persistente del último registro exitoso, con el botón "Imprimir asiento" — a diferencia del snackbar, no se cierra solo. */
  exito = signal('');
  /** Asiento del último registro exitoso — docs/cnt/DISENO-IMPRIMIR-ASIENTO-DESDE-ORIGEN.md. Null si el backend todavía no manda `idAsiento`. */
  ultimoAsiento = signal<{ idAsiento: number; numeroAlterno?: string } | null>(null);
  imprimiendoAsientoExito = signal(false);

  // ── Historial ─────────────────────────────────────────────────────────────
  historial = signal<DevolucionAnticipoListado[]>([]);
  cargandoHistorial = signal(false);
  errorHistorial = signal('');
  anulando = signal<number | null>(null);
  filaExpandida = signal<number | null>(null);
  /** Id de la devolución cuya fila está generando el PDF del asiento. */
  imprimiendoAsientoFila = signal<number | null>(null);

  ngOnInit(): void {
    this.cargarCuentas();
  }

  /** Cuentas propias activas — mismo criterio que tsr/forms/procesos/aprobacion-pagos (cargarCuentas). */
  private cargarCuentas(): void {
    this.cuentaS.getAll().subscribe({
      next: (data) => this.cuentas.set(Array.isArray(data) ? (data as CuentaBancaria[]).filter((c) => Number(c.estado) === 1) : []),
      error: () => this.cuentas.set([]),
    });
  }

  /** Paso 1: elegir el proveedor. Al elegirlo se encadenan sus anticipos y su historial. */
  buscarProveedor(): void {
    this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: { rolCodigo: this.ROL_PROVEEDOR, rolNombre: 'PROVEEDOR', titulo: 'Buscar Proveedor' },
    }).afterClosed().subscribe((titular: Titular | null) => {
      if (!titular) return;
      this.proveedor.set(titular);
      this.limpiarFormulario();
      this.error.set('');
      this.cargarAnticipos();
      this.cargarNotasCredito();
      this.cargarHistorial();
    });
  }

  nombreProveedor(): string {
    const t = this.proveedor();
    if (!t) return '';
    return t.razonSocial || t.nombre || t.identificacion || `Titular ${t.codigo}`;
  }

  private cargarAnticipos(): void {
    const titular = this.proveedor();
    if (!titular?.codigo) return;

    this.cargandoAnticipos.set(true);
    this.anticipos.set([]);
    this.montos = {};

    this.anticipoS.disponiblesProveedor(titular.codigo, this.idEmpresaSesion()).subscribe({
      next: (lista) => {
        this.anticipos.set(lista ?? []);
        this.cargandoAnticipos.set(false);
      },
      error: (err: Error) => {
        this.cargandoAnticipos.set(false);
        this.anticipos.set([]);
        this.error.set(err.message);
      },
    });
  }

  private cargarNotasCredito(): void {
    const titular = this.proveedor();
    if (!titular?.codigo) return;

    this.cargandoNotas.set(true);
    this.notasCredito.set([]);
    this.montosNc = {};

    this.notaCreditoS.disponibles(titular.codigo, this.idEmpresaSesion()).subscribe({
      next: (lista) => {
        this.notasCredito.set(lista ?? []);
        this.cargandoNotas.set(false);
      },
      error: (err: Error) => {
        this.cargandoNotas.set(false);
        this.notasCredito.set([]);
        this.error.set(mensajeDeError(err, 'No se pudieron cargar las notas de crédito'));
      },
    });
  }

  montoNcDe(nota: NotaCreditoDisponible): number {
    const v = parseFloat(String(this.montosNc[nota.idNotaCredito] ?? '').replace(',', '.'));
    return Number.isFinite(v) && v > 0 ? v : 0;
  }

  /** El valor a devolver nunca puede superar el saldo de ESA nota de crédito. */
  excedeNota(nota: NotaCreditoDisponible): boolean {
    return this.montoNcDe(nota) > Number(nota.saldo ?? 0) + 0.001;
  }

  get totalNotas(): number {
    return this.notasCredito().reduce((suma, n) => suma + this.montoNcDe(n), 0);
  }

  get algunaNotaExcedida(): boolean {
    return this.notasCredito().some((n) => this.excedeNota(n));
  }

  aplicarTodoNota(nota: NotaCreditoDisponible): void {
    this.montosNc[nota.idNotaCredito] = String(Number(nota.saldo ?? 0).toFixed(2));
  }

  montoDe(anticipo: AnticipoDisponible): number {
    const v = parseFloat(String(this.montos[anticipo.id] ?? '').replace(',', '.'));
    return Number.isFinite(v) && v > 0 ? v : 0;
  }

  /** El valor a devolver nunca puede superar el saldo a favor de ESE anticipo. */
  excedeAnticipo(anticipo: AnticipoDisponible): boolean {
    return this.montoDe(anticipo) > Number(anticipo.saldo ?? 0) + 0.001;
  }

  get totalAnticipos(): number {
    return this.anticipos().reduce((suma, a) => suma + this.montoDe(a), 0);
  }

  /** Total del depósito: suma de las dos tablas — NC-EXCEDE-SALDO-FACTURA.md §7.3. */
  get totalADevolver(): number {
    return this.totalAnticipos + this.totalNotas;
  }

  get haySeleccion(): boolean {
    return this.totalADevolver > 0;
  }

  get algunAnticipoExcedido(): boolean {
    return this.anticipos().some((a) => this.excedeAnticipo(a));
  }

  /** Devuelve el saldo completo de esa fila. */
  aplicarTodoDe(anticipo: AnticipoDisponible): void {
    this.montos[anticipo.id] = String(Number(anticipo.saldo ?? 0).toFixed(2));
  }

  limpiarSeleccion(): void {
    this.montos = {};
    this.montosNc = {};
  }

  get puedeRegistrar(): boolean {
    if (!this.proveedor() || !this.cuentaSeleccionada() || !this.formFecha) return false;
    if (this.registrando()) return false;
    if (!this.haySeleccion) return false;
    if (this.algunAnticipoExcedido || this.algunaNotaExcedida) return false;
    return true;
  }

  registrar(): void {
    const idUsuario = idUsuarioSesion();
    if (idUsuario == null) { this.error.set(MENSAJE_SIN_USUARIO_SESION); return; }
    const titular = this.proveedor();
    const cuenta = this.cuentaSeleccionada();
    const fechaStr = this.fechaISO(this.formFecha);
    if (!this.puedeRegistrar || !titular || !cuenta || !fechaStr) return;

    const lineas: LineaDevolucionAnticipo[] = this.anticipos()
      .filter((a) => this.montoDe(a) > 0)
      .map((a) => ({ idAnticipo: a.id, valor: this.montoDe(a) }));

    const lineasNc: LineaDevolucionNotaCredito[] = this.notasCredito()
      .filter((n) => this.montoNcDe(n) > 0)
      .map((n) => ({ idNotaCredito: n.idNotaCredito, valor: this.montoNcDe(n) }));

    const payload: RegistrarDevolucionAnticipoRequest = {
      idEmpresa: this.idEmpresaSesion(),
      idTitular: titular.codigo,
      idCuentaBancaria: cuenta.codigo,
      fecha: fechaStr,
      referencia: this.formReferencia.trim() || undefined,
      observacion: this.formObservacion.trim() || undefined,
      idUsuario: idUsuario,
      formaPago: this.formForma,
      anticipos: lineas,
      notasCredito: lineasNc,
    };

    this.registrando.set(true);
    this.error.set('');
    this.exito.set('');
    this.ultimoAsiento.set(null);

    this.devolucionS.registrar(payload).subscribe({
      next: (resp) => {
        this.registrando.set(false);
        const mensaje = `${resp.mensaje || 'Devolución registrada.'} Asiento ${resp.asiento}.`;
        this.exito.set(mensaje);
        if (resp.idAsiento != null) {
          this.ultimoAsiento.set({ idAsiento: resp.idAsiento, numeroAlterno: resp.asiento });
        }
        this.snackBar.open(mensaje, 'Cerrar', { duration: 6000, panelClass: ['snackbar-success'] });
        this.limpiarFormulario();
        this.cargarAnticipos();
        this.cargarNotasCredito();
        this.cargarHistorial();
      },
      error: (err: Error) => {
        this.registrando.set(false);
        this.error.set(mensajeDeError(err, 'No se pudo registrar la devolución'));
      },
    });
  }

  private limpiarFormulario(): void {
    this.montos = {};
    this.montosNc = {};
    this.formForma = FormaDevolucionProveedor.TRANSFERENCIA;
    this.formReferencia = '';
    this.formObservacion = '';
    this.formFecha = new Date();
  }

  /** Imprime el asiento del registro recién hecho, con la plantilla oficial de Contabilidad. */
  imprimirAsientoExito(): void {
    const info = this.ultimoAsiento();
    if (!info || this.imprimiendoAsientoExito()) return;

    this.imprimiendoAsientoExito.set(true);
    this.imprimirAsientoS.imprimir(info.idAsiento, info.numeroAlterno).subscribe({
      next: () => this.imprimiendoAsientoExito.set(false),
      error: (err: Error) => {
        this.imprimiendoAsientoExito.set(false);
        this.snackBar.open(err.message, 'Cerrar', { duration: 6000 });
      },
    });
  }

  etiquetaForma(forma?: number): string {
    if (forma === FormaDevolucionProveedor.CHEQUE) return 'Cheque';
    if (forma === FormaDevolucionProveedor.TRANSFERENCIA) return 'Transferencia';
    return '—';
  }

  etiquetaTipoLinea(det: { tipo?: string }): string {
    return det.tipo === 'NOTA_CREDITO' ? 'Nota de crédito' : 'Anticipo';
  }

  /** Solo con `idAsiento` en la proyección de /dvpr/listar la fila tiene asiento imprimible. */
  tieneAsientoImprimible(d: DevolucionAnticipoListado): boolean {
    return d.idAsiento != null;
  }

  imprimirAsientoDeFila(d: DevolucionAnticipoListado): void {
    if (d.idAsiento == null || this.imprimiendoAsientoFila() != null) return;

    this.imprimiendoAsientoFila.set(d.id);
    this.imprimirAsientoS.imprimir(d.idAsiento, d.numeroAsiento).subscribe({
      next: () => this.imprimiendoAsientoFila.set(null),
      error: (err: Error) => {
        this.imprimiendoAsientoFila.set(null);
        this.snackBar.open(err.message, 'Cerrar', { duration: 6000 });
      },
    });
  }

  // ── Historial ────────────────────────────────────────────────────────────

  private cargarHistorial(): void {
    const titular = this.proveedor();
    if (!titular?.codigo) return;

    this.cargandoHistorial.set(true);
    this.errorHistorial.set('');
    this.filaExpandida.set(null);

    this.devolucionS.listar(this.idEmpresaSesion(), titular.codigo).subscribe({
      next: (data) => {
        this.historial.set(Array.isArray(data) ? data : []);
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
        this.cargandoHistorial.set(false);
        this.historial.set([]);
        this.errorHistorial.set(mensajeDeError(err, 'No se pudo cargar el historial de devoluciones'));
      },
    });
  }

  toggleDetalle(id: number): void {
    this.filaExpandida.set(this.filaExpandida() === id ? null : id);
  }

  puedeAnular(d: DevolucionAnticipoListado): boolean {
    return Number(d.estado) === EstadoDevolucionAnticipoProveedor.ACTIVA;
  }

  /**
   * Anula una devolución, igual que la bandeja de aprobación anula un pago: motivo obligatorio
   * con `MotivoDialogComponent`. Si el backend rechaza porque ya está conciliada, se muestra su
   * mensaje tal cual (§4.2/§6.3 del contrato) — no se reinterpreta.
   */
  anularDevolucion(d: DevolucionAnticipoListado): void {
    const idUsuario = idUsuarioSesion();
    if (idUsuario == null) { this.snackBar.open(MENSAJE_SIN_USUARIO_SESION, 'Cerrar', { duration: 6000 }); return; }
    if (!this.puedeAnular(d)) return;

    const data: MotivoDialogData = {
      titulo: `Anular devolución N° ${d.id}`,
      advertencia: `Se anulará la devolución de ${d.valor.toFixed(2)}. Los anticipos involucrados recuperan su saldo, y se anulan el movimiento bancario y el asiento.`,
      textoConfirmar: 'Sí, anular',
    };

    this.dialog.open(MotivoDialogComponent, { width: '480px', data }).afterClosed().subscribe((motivo: string | null) => {
      if (!motivo) return;

      this.anulando.set(d.id);
      this.devolucionS.anular(d.id, { motivo, idUsuario: idUsuario }).subscribe({
        next: (resp) => {
          this.anulando.set(null);
          this.snackBar.open(resp.mensaje || 'Devolución anulada.', 'Cerrar', { duration: 5000, panelClass: ['snackbar-success'] });
          this.cargarAnticipos();
          this.cargarNotasCredito();
          this.cargarHistorial();
        },
        error: (err: Error) => {
          this.anulando.set(null);
          this.snackBar.open(mensajeDeError(err, 'No se pudo anular la devolución'), 'Cerrar', { duration: 6000 });
        },
      });
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  formatearFecha(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private fechaISO(fecha: Date | null): string | undefined {
    if (!fecha) return undefined;
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return undefined;
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  private idEmpresaSesion(): number {
    return +(sessionStorage.getItem('idEmpresa') || localStorage.getItem('idEmpresa') || '0');
  }

}
