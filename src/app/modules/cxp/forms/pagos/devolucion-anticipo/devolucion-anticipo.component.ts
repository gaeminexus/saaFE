import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { MotivoDialogComponent, MotivoDialogData } from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { Titular } from '../../../../tsr/model/titular';
import { CuentaBancaria } from '../../../../tsr/model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../../tsr/service/cuenta-bancaria.service';
import { AnticipoDisponible, AnticipoService } from '../../../../tsr/service/anticipo.service';
import {
  DevolucionAnticipoListado,
  EstadoDevolucionAnticipoProveedor,
  LineaDevolucionAnticipo,
  RegistrarDevolucionAnticipoRequest,
} from '../../../model/devolucion-anticipo';
import { DevolucionAnticipoService } from '../../../service/devolucion-anticipo.service';

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
  private cuentaS = inject(CuentaBancariaService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  private readonly ROL_PROVEEDOR = 2;
  readonly EstadoDevolucionAnticipoProveedor = EstadoDevolucionAnticipoProveedor;

  proveedor = signal<Titular | null>(null);

  // ── Cuenta bancaria propia (adonde llega el depósito) ───────────────────
  cuentas = signal<CuentaBancaria[]>([]);
  cuentaSeleccionada = signal<CuentaBancaria | null>(null);

  // ── Anticipos con saldo a favor ──────────────────────────────────────────
  anticipos = signal<AnticipoDisponible[]>([]);
  cargandoAnticipos = signal(false);
  /** Valor a devolver por anticipo, indexado por id. Vacío por defecto. */
  montos: Record<number, string> = {};

  // ── Datos del depósito ───────────────────────────────────────────────────
  formFecha: Date | null = new Date();
  formReferencia = '';
  formObservacion = '';

  registrando = signal(false);
  error = signal('');

  // ── Historial ─────────────────────────────────────────────────────────────
  historial = signal<DevolucionAnticipoListado[]>([]);
  cargandoHistorial = signal(false);
  errorHistorial = signal('');
  anulando = signal<number | null>(null);
  filaExpandida = signal<number | null>(null);

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

  montoDe(anticipo: AnticipoDisponible): number {
    const v = parseFloat(String(this.montos[anticipo.id] ?? '').replace(',', '.'));
    return Number.isFinite(v) && v > 0 ? v : 0;
  }

  /** El valor a devolver nunca puede superar el saldo a favor de ESE anticipo. */
  excedeAnticipo(anticipo: AnticipoDisponible): boolean {
    return this.montoDe(anticipo) > Number(anticipo.saldo ?? 0) + 0.001;
  }

  get totalADevolver(): number {
    return this.anticipos().reduce((suma, a) => suma + this.montoDe(a), 0);
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
  }

  get puedeRegistrar(): boolean {
    if (!this.proveedor() || !this.cuentaSeleccionada() || !this.formFecha) return false;
    if (this.registrando()) return false;
    if (!this.haySeleccion) return false;
    if (this.algunAnticipoExcedido) return false;
    return true;
  }

  registrar(): void {
    const titular = this.proveedor();
    const cuenta = this.cuentaSeleccionada();
    const fechaStr = this.fechaISO(this.formFecha);
    if (!this.puedeRegistrar || !titular || !cuenta || !fechaStr) return;

    const lineas: LineaDevolucionAnticipo[] = this.anticipos()
      .filter((a) => this.montoDe(a) > 0)
      .map((a) => ({ idAnticipo: a.id, valor: this.montoDe(a) }));

    const payload: RegistrarDevolucionAnticipoRequest = {
      idEmpresa: this.idEmpresaSesion(),
      idTitular: titular.codigo,
      idCuentaBancaria: cuenta.codigo,
      fecha: fechaStr,
      referencia: this.formReferencia.trim() || undefined,
      observacion: this.formObservacion.trim() || undefined,
      idUsuario: this.idUsuarioSesion(),
      anticipos: lineas,
    };

    this.registrando.set(true);
    this.error.set('');

    this.devolucionS.registrar(payload).subscribe({
      next: (resp) => {
        this.registrando.set(false);
        this.snackBar.open(
          `${resp.mensaje || 'Devolución registrada.'} Asiento ${resp.asiento}.`,
          'Cerrar',
          { duration: 6000, panelClass: ['snackbar-success'] },
        );
        this.limpiarFormulario();
        this.cargarAnticipos();
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
    this.formReferencia = '';
    this.formObservacion = '';
    this.formFecha = new Date();
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
    if (!this.puedeAnular(d)) return;

    const data: MotivoDialogData = {
      titulo: `Anular devolución N° ${d.id}`,
      advertencia: `Se anulará la devolución de ${d.valor.toFixed(2)}. Los anticipos involucrados recuperan su saldo, y se anulan el movimiento bancario y el asiento.`,
      textoConfirmar: 'Sí, anular',
    };

    this.dialog.open(MotivoDialogComponent, { width: '480px', data }).afterClosed().subscribe((motivo: string | null) => {
      if (!motivo) return;

      this.anulando.set(d.id);
      this.devolucionS.anular(d.id, { motivo, idUsuario: this.idUsuarioSesion() }).subscribe({
        next: (resp) => {
          this.anulando.set(null);
          this.snackBar.open(resp.mensaje || 'Devolución anulada.', 'Cerrar', { duration: 5000, panelClass: ['snackbar-success'] });
          this.cargarAnticipos();
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

  private idUsuarioSesion(): number {
    return +(sessionStorage.getItem('idUsuario') || localStorage.getItem('idUsuario') || '0');
  }
}
