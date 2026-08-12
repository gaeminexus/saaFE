import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import {
  ESTADO_PAGO_PROGRAMADO_LABELS,
  EstadoPagoProgramado,
  SaldoFactura,
} from '../../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { CuentaBancaria } from '../../../../tsr/model/cuenta-bancaria';
import { Titular } from '../../../../tsr/model/titular';
import { CuentaBancariaService } from '../../../../tsr/service/cuenta-bancaria.service';
import { FacturaCompraSelectorDialogComponent } from '../../../dialog/factura-compra-selector-dialog/factura-compra-selector-dialog.component';
import { FacturaCompra } from '../../../model/factura-compra';
import {
  LoteGeneradoResponse,
  PagoProgramado,
  RespuestaBancoResponse,
} from '../../../model/pago-programado';
import { AplicacionPagoCxpService } from '../../../service/aplicacion-pago-cxp.service';
import { PagoProgramadoService } from '../../../service/pago-programado.service';

/**
 * Pagos a proveedores por transferencia. Cuatro sub-vistas secuenciales:
 * registrar → seleccionar y generar archivo → cargar respuesta del banco →
 * seguimiento. El saldo de la factura solo se mueve cuando el banco confirma.
 */
@Component({
  selector: 'app-pagos-transferencia',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './pagos-transferencia.component.html',
  styleUrl: './pagos-transferencia.component.scss',
})
export class PagosTransferenciaComponent implements OnInit {
  private pagoS = inject(PagoProgramadoService);
  private aplicacionS = inject(AplicacionPagoCxpService);
  private cuentaBancariaS = inject(CuentaBancariaService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  tabActiva = 0;
  cuentasBancarias = signal<CuentaBancaria[]>([]);

  private readonly ROL_PROVEEDOR = 2;

  // ─── a) Registrar pago ─────────────────────────────────
  regProveedor = signal<Titular | null>(null);
  regFacturaElegida = signal<FacturaCompra | null>(null);
  regIdFactura: number | null = null;
  regCuentaOrigen: CuentaBancaria | null = null;
  regIdCuentaDestino: number | null = null;
  regDebitoAutomatico = false;
  regReferencia = '';
  /** Saldo de la factura elegida: precarga el valor y le pone tope. */
  regSaldo = signal<SaldoFactura | null>(null);
  cargandoSaldo = signal(false);
  regValor = '';
  regFecha: Date | null = new Date();
  regObservacion = '';
  registrando = signal(false);
  regError = signal('');
  regExito = signal('');

  // ─── b) Seleccionar y generar archivo ──────────────────
  selCuentaOrigen: CuentaBancaria | null = null;
  pagosRegistrados = signal<PagoProgramado[]>([]);
  seleccionados = new Set<number>();
  cargandoSeleccion = signal(false);
  generando = signal(false);
  selError = signal('');
  loteGenerado = signal<LoteGeneradoResponse | null>(null);
  readonly columnasSeleccion = ['check', 'proveedor', 'factura', 'valor', 'fechaProgramada', 'cuentaOrigen'];

  // ─── c) Cargar respuesta del banco ─────────────────────
  respIdLote: number | null = null;
  archivoRespuesta: File | null = null;
  subiendoRespuesta = signal(false);
  respError = signal('');
  respResultado = signal<RespuestaBancoResponse | null>(null);

  // ─── d) Seguimiento ────────────────────────────────────
  segEstado: number | null = null;
  pagosSeguimiento = signal<PagoProgramado[]>([]);
  cargandoSeguimiento = signal(false);
  segError = signal('');
  readonly columnasSeguimiento = ['proveedor', 'factura', 'tipo', 'valor', 'fechaProgramada', 'estado', 'acciones'];
  readonly estadosFiltro = [
    { valor: EstadoPagoProgramado.REGISTRADO, texto: 'Registrado' },
    { valor: EstadoPagoProgramado.EN_ARCHIVO, texto: 'En archivo' },
    { valor: EstadoPagoProgramado.CONFIRMADO, texto: 'Confirmado' },
    { valor: EstadoPagoProgramado.RECHAZADO, texto: 'Rechazado' },
    { valor: EstadoPagoProgramado.ANULADO, texto: 'Anulado' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('idFactura');
    if (id) {
      this.regIdFactura = +id;
      this.cargarSaldoFactura(this.regIdFactura);
    }
    this.cargarCuentasBancarias();
    this.cargarSeguimiento();
  }

  private cargarCuentasBancarias(): void {
    const idEmpresa = this.idEmpresaSesion();
    this.cuentaBancariaS.getAll().subscribe({
      next: (data) => {
        let lista = Array.isArray(data) ? data : [];
        if (idEmpresa) {
          lista = lista.filter(
            (c: any) => c.banco?.empresa?.codigo === idEmpresa || c.empresa?.codigo === idEmpresa
          );
        }
        this.cuentasBancarias.set(lista);
      },
      error: () => this.cuentasBancarias.set([]),
    });
  }

  // ═══ a) REGISTRAR ═══════════════════════════════════════

  /** Paso 1: elegir el proveedor. Al elegirlo se encadena la búsqueda de facturas. */
  buscarProveedor(): void {
    this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: { rolCodigo: this.ROL_PROVEEDOR, rolNombre: 'PROVEEDOR', titulo: 'Buscar Proveedor' },
    }).afterClosed().subscribe((titular: Titular | null) => {
      if (!titular) return;
      this.regProveedor.set(titular);
      this.regFacturaElegida.set(null);
      this.regIdFactura = null;
      this.regSaldo.set(null);
      this.regValor = '';
      this.buscarFacturaRegistro();
    });
  }

  /** Paso 2: elegir una factura pendiente del proveedor ya seleccionado. */
  buscarFacturaRegistro(): void {
    const titular = this.regProveedor();
    if (!titular?.codigo) {
      this.snackBar.open('Primero seleccione un proveedor', 'Cerrar', { duration: 3000 });
      return;
    }

    this.dialog.open(FacturaCompraSelectorDialogComponent, {
      width: '900px',
      maxWidth: '98vw',
      data: {
        codigoTitular: titular.codigo,
        nombreTitular: this.nombreProveedorRegistro(),
        soloPendientes: true,
      },
    }).afterClosed().subscribe((factura: FacturaCompra | null) => {
      if (!factura) return;
      this.regFacturaElegida.set(factura);
      this.regIdFactura = factura.id;
      this.cargarSaldoFactura(factura.id);
    });
  }

  /**
   * El saldo pendiente se propone como valor a pagar y es el tope del campo.
   * Si no se puede consultar, el campo queda libre y valida solo el backend.
   */
  private cargarSaldoFactura(idFactura: number): void {
    this.cargandoSaldo.set(true);
    this.regSaldo.set(null);

    this.aplicacionS.getSaldo(idFactura).subscribe({
      next: (saldo) => {
        this.cargandoSaldo.set(false);
        this.regSaldo.set(saldo);
        const pendiente = Number(saldo?.saldoPendiente) || 0;
        this.regValor = pendiente > 0 ? pendiente.toFixed(2) : '';
      },
      error: (err: Error) => {
        this.cargandoSaldo.set(false);
        this.regValor = '';
        this.snackBar.open(`No se pudo consultar el saldo de la factura: ${err.message}`, 'Cerrar', {
          duration: 6000,
        });
      },
    });
  }

  nombreProveedorRegistro(): string {
    const t = this.regProveedor();
    if (!t) return '';
    return t.razonSocial || t.nombre || t.identificacion || `Titular ${t.codigo}`;
  }

  /**
   * En un débito automático el dinero no se transfiere: el banco debita la
   * cuenta propia por convenio, así que la cuenta del titular no se pide.
   */
  onCambioDebitoAutomatico(): void {
    if (this.regDebitoAutomatico) {
      this.regIdCuentaDestino = null;
    } else {
      this.regReferencia = '';
    }
    this.regError.set('');
    this.regExito.set('');
  }

  get regValorNumerico(): number {
    const v = parseFloat(String(this.regValor).replace(',', '.'));
    return Number.isFinite(v) ? v : 0;
  }

  /** Saldo pendiente de la factura elegida; null mientras no se conozca. */
  get saldoPendienteFactura(): number | null {
    const saldo = this.regSaldo();
    return saldo ? Number(saldo.saldoPendiente) || 0 : null;
  }

  /** La tolerancia es la misma del backend, para no discrepar por redondeo. */
  get regExcedeSaldo(): boolean {
    const pendiente = this.saldoPendienteFactura;
    return pendiente != null && this.regValorNumerico > pendiente + 0.01;
  }

  /** Al salir del campo se recorta lo que exceda, para no dejarlo inválido. */
  ajustarValorAlSaldo(): void {
    const pendiente = this.saldoPendienteFactura;
    if (pendiente != null && this.regValorNumerico > pendiente + 0.01) {
      this.regValor = pendiente.toFixed(2);
    }
  }

  get puedeRegistrar(): boolean {
    return !!this.regIdFactura
      && !!this.regCuentaOrigen
      && this.regValorNumerico > 0
      && !this.regExcedeSaldo
      && !this.registrando();
  }

  registrarPago(): void {
    if (!this.puedeRegistrar || !this.regIdFactura || !this.regCuentaOrigen) return;

    this.registrando.set(true);
    this.regError.set('');
    this.regExito.set('');

    const esDebito = this.regDebitoAutomatico;

    this.pagoS.registrar({
      idFacturaCompra: this.regIdFactura,
      idCuentaBancariaOrigen: this.regCuentaOrigen.codigo,
      idCuentaDestinoTitular: esDebito ? undefined : (this.regIdCuentaDestino ?? undefined),
      valor: this.regValorNumerico,
      fechaProgramada: this.fechaISO(this.regFecha),
      idEmpresa: this.idEmpresaSesion(),
      idUsuario: this.idUsuarioSesion(),
      observacion: this.regObservacion.trim(),
      debitoAutomatico: esDebito,
      referencia: esDebito ? this.regReferencia.trim() || undefined : undefined,
    }).subscribe({
      next: (resp) => {
        this.registrando.set(false);

        // En un débito automático el backend ya abonó la factura y generó el
        // asiento, así que el mensaje lo dice y no hay nada que enviar al banco.
        let mensaje = resp.mensaje
          ?? 'Pago registrado. Aparecerá en la pantalla de selección para el próximo archivo.';
        if (resp.debitoAutomatico && resp.asiento) {
          mensaje += ` Asiento N° ${resp.asiento}.`;
        }
        this.regExito.set(mensaje);

        // La respuesta ya trae el saldo actualizado de la factura: en un débito
        // automático bajó, en una transferencia sigue igual hasta que el banco
        // confirme. Se refresca para que el tope del campo no quede viejo.
        if (resp.facturaId != null) {
          this.regSaldo.set({
            facturaId: resp.facturaId,
            numeroFactura: resp.numeroFactura,
            total: resp.total,
            totalAplicado: resp.totalAplicado,
            saldoPendiente: resp.saldoPendiente,
            estadoPago: resp.estadoPago,
          });
        }

        this.regValor = '';
        this.regObservacion = '';
        this.regReferencia = '';
        this.regIdCuentaDestino = null;
        this.cargarSeguimiento();
        this.snackBar.open(mensaje, 'Cerrar', { duration: 6000 });
      },
      error: (err: Error) => {
        this.registrando.set(false);
        this.regError.set(err.message);
      },
    });
  }

  irASeleccion(): void {
    this.tabActiva = 1;
    this.cargarPagosRegistrados();
  }

  // ═══ b) SELECCIONAR Y GENERAR ═══════════════════════════

  cargarPagosRegistrados(): void {
    this.cargandoSeleccion.set(true);
    this.selError.set('');
    this.seleccionados.clear();

    this.pagoS.listar(this.idEmpresaSesion(), EstadoPagoProgramado.REGISTRADO).subscribe({
      next: (data) => {
        this.pagosRegistrados.set(data ?? []);
        this.cargandoSeleccion.set(false);
      },
      error: (err: Error) => {
        this.pagosRegistrados.set([]);
        this.cargandoSeleccion.set(false);
        this.selError.set(err.message);
      },
    });
  }

  /**
   * El backend exige que todos los pagos del lote compartan la cuenta de
   * origen, así que la tabla solo muestra los de la cuenta elegida.
   */
  get pagosFiltrados(): PagoProgramado[] {
    const cuenta = this.selCuentaOrigen;
    if (!cuenta) return [];
    return this.pagosRegistrados().filter((p) => p.cuentaBancaria?.codigo === cuenta.codigo);
  }

  onCambioCuentaOrigen(): void {
    this.seleccionados.clear();
    this.loteGenerado.set(null);
  }

  estaSeleccionado(pago: PagoProgramado): boolean {
    return this.seleccionados.has(pago.id);
  }

  alternarSeleccion(pago: PagoProgramado): void {
    if (this.seleccionados.has(pago.id)) {
      this.seleccionados.delete(pago.id);
    } else {
      this.seleccionados.add(pago.id);
    }
  }

  get todosSeleccionados(): boolean {
    const filas = this.pagosFiltrados;
    return filas.length > 0 && filas.every((p) => this.seleccionados.has(p.id));
  }

  alternarTodos(): void {
    if (this.todosSeleccionados) {
      this.seleccionados.clear();
    } else {
      this.pagosFiltrados.forEach((p) => this.seleccionados.add(p.id));
    }
  }

  get totalSeleccionado(): number {
    return this.pagosFiltrados
      .filter((p) => this.seleccionados.has(p.id))
      .reduce((suma, p) => suma + (Number(p.valor) || 0), 0);
  }

  /** Generar el archivo ES la aprobación: no hay un paso previo de aprobar. */
  generarArchivo(): void {
    if (!this.selCuentaOrigen || this.seleccionados.size === 0) return;

    this.generando.set(true);
    this.selError.set('');
    this.loteGenerado.set(null);

    this.pagoS.generarLote({
      idsPagos: Array.from(this.seleccionados),
      idCuentaOrigen: this.selCuentaOrigen.codigo,
      idEmpresa: this.idEmpresaSesion(),
      idUsuario: this.idUsuarioSesion(),
    }).subscribe({
      next: (resp) => {
        this.generando.set(false);
        this.loteGenerado.set(resp);
        this.respIdLote = resp.idLote;
        this.descargarArchivo(resp);
        this.cargarPagosRegistrados();
        this.cargarSeguimiento();
        this.snackBar.open(resp.mensaje ?? 'Archivo de pagos generado.', 'Cerrar', { duration: 5000 });
      },
      error: (err: Error) => {
        this.generando.set(false);
        this.selError.set(err.message);
      },
    });
  }

  /** Dispara la descarga en el navegador a partir del contenido del lote. */
  descargarArchivo(lote: LoteGeneradoResponse): void {
    if (!lote?.contenido) return;
    const blob = new Blob([lote.contenido], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = lote.nombreArchivo || `PAGOS_${lote.idLote}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  redescargarLote(idLote: number): void {
    this.pagoS.getArchivoLote(idLote).subscribe({
      next: (lote) => this.descargarArchivo(lote),
      error: (err: Error) => this.snackBar.open(err.message, 'Cerrar', { duration: 6000 }),
    });
  }

  irACargarRespuesta(): void {
    this.tabActiva = 2;
  }

  // ═══ c) CARGAR RESPUESTA DEL BANCO ══════════════════════

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoRespuesta = input.files?.length ? input.files[0] : null;
    this.respResultado.set(null);
    this.respError.set('');
  }

  get puedeSubirRespuesta(): boolean {
    return !!this.respIdLote && !!this.archivoRespuesta && !this.subiendoRespuesta();
  }

  /** El endpoint recibe el archivo como binario crudo, no como multipart. */
  async subirRespuesta(): Promise<void> {
    if (!this.puedeSubirRespuesta || !this.archivoRespuesta || !this.respIdLote) return;

    this.subiendoRespuesta.set(true);
    this.respError.set('');
    this.respResultado.set(null);

    try {
      const buffer = await this.archivoRespuesta.arrayBuffer();
      this.pagoS.cargarRespuesta(this.respIdLote, this.idUsuarioSesion(), buffer).subscribe({
        next: (resp) => {
          this.subiendoRespuesta.set(false);
          this.respResultado.set(resp);
          this.cargarSeguimiento();
          this.snackBar.open(resp.mensaje ?? 'Respuesta procesada.', 'Cerrar', { duration: 5000 });
        },
        error: (err: Error) => {
          this.subiendoRespuesta.set(false);
          this.respError.set(err.message);
        },
      });
    } catch {
      this.subiendoRespuesta.set(false);
      this.respError.set('No se pudo leer el archivo seleccionado.');
    }
  }

  irASeguimiento(): void {
    this.tabActiva = 3;
    this.cargarSeguimiento();
  }

  // ═══ d) SEGUIMIENTO ═════════════════════════════════════

  cargarSeguimiento(): void {
    this.cargandoSeguimiento.set(true);
    this.segError.set('');

    this.pagoS.listar(this.idEmpresaSesion(), this.segEstado ?? undefined).subscribe({
      next: (data) => {
        this.pagosSeguimiento.set(data ?? []);
        this.cargandoSeguimiento.set(false);
      },
      error: (err: Error) => {
        this.pagosSeguimiento.set([]);
        this.cargandoSeguimiento.set(false);
        this.segError.set(err.message);
      },
    });
  }

  etiquetaEstado(estado: number): { texto: string; clase: string } {
    return ESTADO_PAGO_PROGRAMADO_LABELS[estado] ?? { texto: `Estado ${estado}`, clase: 'badge-neutro' };
  }

  /** El banco lo debitó por convenio: nació confirmado y sin lote. */
  esDebitoAutomatico(pago: PagoProgramado): boolean {
    return Number(pago.debitoAutomatico) === 1;
  }

  /** Solo se anula lo que el banco todavía no confirmó. */
  puedeAnular(pago: PagoProgramado): boolean {
    return pago.estado === EstadoPagoProgramado.REGISTRADO || pago.estado === EstadoPagoProgramado.EN_ARCHIVO;
  }

  /** Revertir solo aplica a un pago ya confirmado: deshace contabilidad. */
  puedeRevertir(pago: PagoProgramado): boolean {
    return pago.estado === EstadoPagoProgramado.CONFIRMADO;
  }

  confirmarAnulacion(pago: PagoProgramado): void {
    const data: MotivoDialogData = {
      titulo: `Anular pago N° ${pago.id}`,
      advertencia: 'El pago se cancela antes de enviarse al banco. Para reintentar habrá que registrar uno nuevo.',
      textoConfirmar: 'Sí, anular',
    };

    this.dialog.open(MotivoDialogComponent, { width: '480px', data }).afterClosed().subscribe((motivo) => {
      if (!motivo) return;
      this.pagoS.anular(pago.id, { motivo, idUsuario: this.idUsuarioSesion() }).subscribe({
        next: (resp) => {
          this.snackBar.open(resp.mensaje ?? 'Pago anulado correctamente.', 'Cerrar', { duration: 5000 });
          this.cargarSeguimiento();
        },
        error: (err: Error) => this.snackBar.open(err.message, 'Cerrar', { duration: 6000 }),
      });
    });
  }

  confirmarReverso(pago: PagoProgramado): void {
    const debito = this.esDebitoAutomatico(pago);
    const data: MotivoDialogData = {
      titulo: debito
        ? `Revertir débito automático N° ${pago.id}`
        : `Revertir pago confirmado N° ${pago.id}`,
      advertencia: debito
        ? 'Este débito automático ya generó asiento contable y movimiento bancario. Al revertirlo se deshace esa contabilidad, el pago queda Anulado (un débito que el banco ya ejecutó no se reprograma) y la factura recupera su saldo.'
        : 'Este pago ya generó asiento contable y movimiento bancario. Al revertirlo se deshace esa contabilidad, el pago queda como Rechazado y la factura recupera su saldo.',
      textoConfirmar: 'Sí, revertir',
      requiereDobleConfirmacion: true,
    };

    this.dialog.open(MotivoDialogComponent, { width: '520px', data }).afterClosed().subscribe((motivo) => {
      if (!motivo) return;
      this.pagoS.revertirConfirmado(pago.id, { motivo, idUsuario: this.idUsuarioSesion() }).subscribe({
        next: (resp) => {
          this.snackBar.open(resp.mensaje ?? 'Pago reversado.', 'Cerrar', { duration: 6000 });
          this.cargarSeguimiento();
        },
        error: (err: Error) => this.snackBar.open(err.message, 'Cerrar', { duration: 6000 }),
      });
    });
  }

  // ═══ HELPERS ════════════════════════════════════════════

  formatearFecha(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  etiquetaCuenta(cuenta: CuentaBancaria): string {
    return `${cuenta.banco?.nombre ?? 'Banco'} — ${cuenta.numeroCuenta}`;
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
