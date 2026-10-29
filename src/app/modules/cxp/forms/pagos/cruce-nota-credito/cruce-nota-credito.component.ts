import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MotivoDialogComponent, MotivoDialogData } from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { SaldoFactura } from '../../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { Titular } from '../../../../tsr/model/titular';
import {
  DocumentoCruceProveedor,
  DocumentoCruceSelectorDialogComponent,
} from '../../../dialog/documento-cruce-selector-dialog/documento-cruce-selector-dialog.component';
import { AplicacionNotaCredito, CruzarNotaCreditoResponse, NotaCreditoDisponible, NotaDebitoPendiente } from '../../../model/nota-credito-saldo';
import { AplicacionPagoCxpService } from '../../../service/aplicacion-pago-cxp.service';
import { NotaCreditoSaldoService } from '../../../service/nota-credito-saldo.service';
import { idUsuarioSesion, MENSAJE_SIN_USUARIO_SESION } from '../../../../../shared/utils/usuario-sesion.util';

/**
 * Cruce del saldo a favor de una nota de crédito de compra contra OTRA factura pendiente del
 * mismo proveedor — docs/cxp/NC-EXCEDE-SALDO-FACTURA.md §4 y §7.2. No genera asiento: es un
 * movimiento de auxiliar. Estructura copiada de cruce-anticipo-proveedor.component.ts.
 */
@Component({
  selector: 'app-cruce-nota-credito',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, MatButtonToggleModule],
  templateUrl: './cruce-nota-credito.component.html',
  styleUrl: './cruce-nota-credito.component.scss',
})
export class CruceNotaCreditoComponent {
  private notaCreditoS = inject(NotaCreditoSaldoService);
  private aplicacionPagoS = inject(AplicacionPagoCxpService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  private readonly ROL_PROVEEDOR = 2;

  proveedor = signal<Titular | null>(null);

  // ── Notas de crédito con saldo ───────────────────────────────────────────
  notas = signal<NotaCreditoDisponible[]>([]);
  cargandoNotas = signal(false);
  notaElegida = signal<NotaCreditoDisponible | null>(null);

  // ── Destino: factura o nota de débito (§4.1) ─────────────────────────────
  destino = signal<'FACTURA' | 'NOTA_DEBITO'>('FACTURA');
  notasDebito = signal<NotaDebitoPendiente[]>([]);
  cargandoNotasDebito = signal(false);
  notaDebitoElegida = signal<NotaDebitoPendiente | null>(null);

  // ── Factura destino ──────────────────────────────────────────────────────
  facturaElegida = signal<DocumentoCruceProveedor | null>(null);
  saldoFactura = signal<SaldoFactura | null>(null);
  cargandoSaldo = signal(false);

  // ── Datos del cruce ──────────────────────────────────────────────────────
  formValor = '';
  formFecha: Date | null = new Date();
  formObservacion = '';

  procesando = signal(false);
  error = signal('');
  resultado = signal<CruzarNotaCreditoResponse | null>(null);
  revirtiendo = signal<number | null>(null);

  /**
   * Aplicaciones de la NC elegida (la original y los cruces), de GET aplp/porNotaCredito — §4.2.
   * `notaDeCruces` se queda aunque la NC llegue a saldo 0 y salga de la tabla de disponibles, para que
   * el usuario siga viendo y pueda revertir lo que acaba de cruzar.
   */
  notaDeCruces = signal<{ id: number; numero: string } | null>(null);
  crucesDeLaNota = signal<AplicacionNotaCredito[]>([]);
  cargandoCruces = signal(false);
  errorCruces = signal('');

  /** Paso 1: elegir el proveedor. Al elegirlo se cargan sus notas de crédito con saldo. */
  buscarProveedor(): void {
    this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: { rolCodigo: this.ROL_PROVEEDOR, rolNombre: 'PROVEEDOR', titulo: 'Buscar Proveedor' },
    }).afterClosed().subscribe((titular: Titular | null) => {
      if (!titular) return;
      this.proveedor.set(titular);
      this.limpiarFactura();
      this.notaElegida.set(null);
      this.notaDeCruces.set(null);
      this.crucesDeLaNota.set([]);
      this.resultado.set(null);
      this.error.set('');
      this.cargarNotas();
      this.cargarNotasDebito();
    });
  }

  /** Cambia el destino del cruce; la selección del otro destino se descarta para no mandar un valor viejo. */
  cambiarDestino(destino: 'FACTURA' | 'NOTA_DEBITO'): void {
    if (this.destino() === destino) return;
    this.destino.set(destino);
    this.limpiarFactura();
    this.notaDebitoElegida.set(null);
    this.resultado.set(null);
    this.error.set('');
    if (destino === 'NOTA_DEBITO' && this.proveedor() && this.notasDebito().length === 0) {
      this.cargarNotasDebito();
    }
  }

  private cargarNotasDebito(): void {
    const titular = this.proveedor();
    if (!titular?.codigo) return;

    this.cargandoNotasDebito.set(true);
    this.notasDebito.set([]);

    this.notaCreditoS.notasDebitoPendientes(titular.codigo, this.idEmpresaSesion()).subscribe({
      next: (lista) => {
        const datos = lista ?? [];
        this.notasDebito.set(datos);
        this.cargandoNotasDebito.set(false);
        const actual = this.notaDebitoElegida();
        this.notaDebitoElegida.set(actual ? datos.find((n) => n.idNotaDebito === actual.idNotaDebito) ?? null : null);
        this.sugerirValor();
      },
      error: (err: Error) => {
        this.cargandoNotasDebito.set(false);
        this.notasDebito.set([]);
        this.error.set(mensajeDeError(err, 'No se pudieron cargar las notas de débito'));
      },
    });
  }

  elegirNotaDebito(nd: NotaDebitoPendiente): void {
    this.notaDebitoElegida.set(nd);
    this.resultado.set(null);
    this.sugerirValor();
  }

  /** Saldo pendiente del documento destino: el de la factura elegida, o el de la factura de la ND elegida. */
  private saldoDestino(): number | null {
    if (this.destino() === 'NOTA_DEBITO') {
      const nd = this.notaDebitoElegida();
      return nd ? Number(nd.saldoFactura ?? 0) : null;
    }
    const s = this.saldoFactura()?.saldoPendiente;
    return s != null ? Number(s) : null;
  }

  private haySeleccionDestino(): boolean {
    return this.destino() === 'NOTA_DEBITO' ? !!this.notaDebitoElegida() : !!this.facturaElegida();
  }

  nombreProveedor(): string {
    const t = this.proveedor();
    if (!t) return '';
    return t.razonSocial || t.nombre || t.identificacion || `Titular ${t.codigo}`;
  }

  private cargarNotas(): void {
    const titular = this.proveedor();
    if (!titular?.codigo) return;

    this.cargandoNotas.set(true);
    this.notas.set([]);

    this.notaCreditoS.disponibles(titular.codigo, this.idEmpresaSesion()).subscribe({
      next: (lista) => {
        const datos = lista ?? [];
        this.notas.set(datos);
        this.cargandoNotas.set(false);
        // Si la NC elegida sigue con saldo se conserva, con su saldo nuevo; si no, se suelta.
        const actual = this.notaElegida();
        this.notaElegida.set(actual ? datos.find((n) => n.idNotaCredito === actual.idNotaCredito) ?? null : null);
        this.sugerirValor();
      },
      error: (err: Error) => {
        this.cargandoNotas.set(false);
        this.notas.set([]);
        this.error.set(mensajeDeError(err, 'No se pudieron cargar las notas de crédito'));
      },
    });
  }

  elegirNota(nota: NotaCreditoDisponible): void {
    this.notaElegida.set(nota);
    this.notaDeCruces.set({ id: nota.idNotaCredito, numero: nota.numero });
    this.resultado.set(null);
    this.sugerirValor();
    this.cargarCruces();
  }

  /** Lee del backend las aplicaciones de la NC elegida; se llama al elegirla y tras cruzar o revertir. */
  private cargarCruces(): void {
    const nc = this.notaDeCruces();
    if (!nc) return;

    this.cargandoCruces.set(true);
    this.errorCruces.set('');
    this.notaCreditoS.aplicaciones(nc.id).subscribe({
      next: (lista) => {
        if (this.notaDeCruces()?.id !== nc.id) return;
        this.crucesDeLaNota.set(lista ?? []);
        this.cargandoCruces.set(false);
      },
      error: (err: Error) => {
        if (this.notaDeCruces()?.id !== nc.id) return;
        this.crucesDeLaNota.set([]);
        this.cargandoCruces.set(false);
        this.errorCruces.set(mensajeDeError(err, 'No se pudieron cargar los cruces de la nota de crédito'));
      },
    });
  }

  /** Paso 2: elegir una factura pendiente del MISMO proveedor (sin liquidaciones ni otros proveedores). */
  buscarFactura(): void {
    const titular = this.proveedor();
    if (!titular?.codigo) {
      this.snackBar.open('Primero seleccione un proveedor', 'Cerrar', { duration: 3000 });
      return;
    }

    this.dialog.open(DocumentoCruceSelectorDialogComponent, {
      width: '900px',
      maxWidth: '98vw',
      data: {
        codigoTitular: titular.codigo,
        nombreTitular: this.nombreProveedor(),
        soloPendientes: true,
        soloFacturas: true,
      },
    }).afterClosed().subscribe((doc: DocumentoCruceProveedor | null) => {
      if (!doc) return;
      this.facturaElegida.set(doc);
      this.cargarSaldoFactura(doc.id);
    });
  }

  private cargarSaldoFactura(idFactura: number): void {
    this.cargandoSaldo.set(true);
    this.error.set('');
    this.saldoFactura.set(null);

    this.aplicacionPagoS.getSaldo(idFactura).subscribe({
      next: (saldo) => {
        this.saldoFactura.set(saldo);
        this.cargandoSaldo.set(false);
        this.sugerirValor();
      },
      error: (err: Error) => {
        this.cargandoSaldo.set(false);
        this.error.set(mensajeDeError(err, 'No se pudo consultar el saldo de la factura'));
      },
    });
  }

  private limpiarFactura(): void {
    this.facturaElegida.set(null);
    this.saldoFactura.set(null);
    this.formValor = '';
  }

  /**
   * Valor por defecto: min(saldo de la NC, saldo de la factura); con nota de débito, además el total de la ND
   * (§4.1: min(saldo NC, total ND, saldo de su factura)). El usuario puede ajustarlo.
   */
  private sugerirValor(): void {
    const nc = this.notaElegida();
    const saldoDest = this.saldoDestino();
    if (!nc || saldoDest == null) return;
    const topes = [Number(nc.saldo ?? 0), saldoDest];
    const nd = this.destino() === 'NOTA_DEBITO' ? this.notaDebitoElegida() : null;
    if (nd) topes.push(Number(nd.total ?? 0));
    const v = Math.min(...topes);
    this.formValor = v > 0 ? v.toFixed(2) : '';
  }

  get valor(): number {
    const v = parseFloat(String(this.formValor ?? '').replace(',', '.'));
    return Number.isFinite(v) && v > 0 ? v : 0;
  }

  get excedeNota(): boolean {
    const nc = this.notaElegida();
    return !!nc && this.valor > Number(nc.saldo ?? 0) + 0.001;
  }

  get excedeFactura(): boolean {
    const saldo = this.saldoDestino();
    return saldo != null && this.valor > saldo + 0.001;
  }

  get excedeNotaDebito(): boolean {
    const nd = this.destino() === 'NOTA_DEBITO' ? this.notaDebitoElegida() : null;
    return !!nd && this.valor > Number(nd.total ?? 0) + 0.001;
  }

  /** Validación en cliente solo para feedback inmediato: el backend revalida todo. */
  get puedeCruzar(): boolean {
    if (this.procesando() || !this.notaElegida() || !this.haySeleccionDestino() || !this.formFecha) return false;
    return this.valor > 0 && !this.excedeNota && !this.excedeFactura && !this.excedeNotaDebito;
  }

  cruzar(): void {
    const idUsuario = idUsuarioSesion();
    if (idUsuario == null) { this.error.set(MENSAJE_SIN_USUARIO_SESION); return; }
    const nc = this.notaElegida();
    const factura = this.facturaElegida();
    const nd = this.notaDebitoElegida();
    const esNd = this.destino() === 'NOTA_DEBITO';
    const fecha = this.fechaISO(this.formFecha);
    if (!this.puedeCruzar || !nc || (esNd ? !nd : !factura) || !fecha) return;
    const idFacturaRecarga = esNd ? nd!.idFacturaCompra : factura!.id;

    const valor = this.valor;
    this.procesando.set(true);
    this.error.set('');
    this.resultado.set(null);

    this.notaCreditoS.cruzar({
      idNotaCredito: nc.idNotaCredito,
      // Exactamente uno de los dos: mandar los dos o ninguno da 400 (§4.1).
      ...(esNd ? { idNotaDebito: nd!.idNotaDebito } : { idFacturaCompra: factura!.id }),
      valor,
      fecha,
      idEmpresa: this.idEmpresaSesion(),
      idUsuario: idUsuario,
      observacion: this.formObservacion.trim() || undefined,
    }).subscribe({
      next: (resp) => {
        this.procesando.set(false);
        this.resultado.set(resp);
        this.formObservacion = '';
        this.cargarCruces();
        this.recargarTrasCambio(idFacturaRecarga);
        this.snackBar.open(resp.mensaje || 'Cruce registrado.', 'Cerrar', { duration: 5000 });
      },
      error: (err: Error) => {
        this.procesando.set(false);
        this.error.set(mensajeDeError(err, 'No se pudo cruzar la nota de crédito'));
      },
    });
  }

  /** Revierte un cruce con el endpoint de reverso de aplicación; el saldo de la NC vuelve solo (se calcula). */
  revertir(cruce: AplicacionNotaCredito): void {
    const idUsuario = idUsuarioSesion();
    if (idUsuario == null) { this.snackBar.open(MENSAJE_SIN_USUARIO_SESION, 'Cerrar', { duration: 6000 }); return; }
    // La aplicación original lleva el asiento de la NC: se deshace anulando la NC, no desde aquí (§4.2).
    if (cruce.conAsiento || this.revirtiendo() != null) return;

    const data: MotivoDialogData = {
      titulo: `Revertir cruce de ${Number(cruce.montoAplicado).toFixed(2)} contra la factura ${cruce.numeroFactura}`,
      advertencia: 'El valor vuelve al saldo de la nota de crédito y a la factura como pendiente.',
      textoConfirmar: 'Sí, revertir',
    };

    this.dialog.open(MotivoDialogComponent, { width: '480px', data }).afterClosed().subscribe((motivo: string | null) => {
      if (!motivo) return;

      this.revirtiendo.set(cruce.idAplicacion);
      this.aplicacionPagoS.revertir(cruce.idAplicacion, { motivo, idUsuario: idUsuario }).subscribe({
        next: (resp) => {
          this.revirtiendo.set(null);
          this.resultado.set(null);
          this.cargarCruces();
          this.snackBar.open(resp?.mensaje || 'Cruce revertido.', 'Cerrar', { duration: 5000 });
          this.recargarTrasCambio(this.destino() === 'NOTA_DEBITO'
            ? this.notaDebitoElegida()?.idFacturaCompra ?? null
            : this.facturaElegida()?.id ?? null);
        },
        error: (err: Error) => {
          this.revirtiendo.set(null);
          this.snackBar.open(mensajeDeError(err, 'No se pudo revertir el cruce'), 'Cerrar', { duration: 6000 });
        },
      });
    });
  }

  /** Tras cruzar o revertir cambian el saldo de la NC y el de la factura: se vuelven a leer. */
  private recargarTrasCambio(idFactura: number | null): void {
    this.cargarNotas();
    if (this.destino() === 'NOTA_DEBITO') {
      this.cargarNotasDebito();
    } else if (idFactura != null) {
      this.cargarSaldoFactura(idFactura);
    }
  }

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
