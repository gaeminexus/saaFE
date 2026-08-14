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
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { CuentaBancaria } from '../../../../tsr/model/cuenta-bancaria';
import { CuentaBancariaTitular } from '../../../../tsr/model/cuenta-bancaria-titular';
import { Titular } from '../../../../tsr/model/titular';
import { CuentaBancariaService } from '../../../../tsr/service/cuenta-bancaria.service';
import { CuentaBancariaTitularService } from '../../../../tsr/service/cuenta-bancaria-titular.service';
import { FacturaCompraSelectorDialogComponent } from '../../../dialog/factura-compra-selector-dialog/factura-compra-selector-dialog.component';
import { FacturaCompra } from '../../../model/factura-compra';
import { FacturaCompraService } from '../../../service/factura-compra.service';
import {
  ConfirmarManualResponse,
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
  private cuentaTitularS = inject(CuentaBancariaTitularService);
  private facturaS = inject(FacturaCompraService);
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
  /** Cuentas del proveedor (CTBN). El banco las necesita para la transferencia. */
  cuentasDestino = signal<CuentaBancariaTitular[]>([]);
  cargandoCuentasDestino = signal(false);
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

  // ─── d) Confirmación manual ────────────────────────────
  // El banco todavía no entrega el archivo de respuesta, así que la
  // conciliación se hace contra el estado de cuenta y el pago se confirma aquí.
  // El efecto contable es el mismo que el de la respuesta bancaria.
  pagosPorConfirmar = signal<PagoProgramado[]>([]);
  confSeleccionados = new Set<number>();
  confReferencia = '';
  confFecha: Date | null = new Date();
  confObservacion = '';
  cargandoPorConfirmar = signal(false);
  confirmandoManual = signal(false);
  confError = signal('');
  confResultado = signal<ConfirmarManualResponse | null>(null);
  readonly columnasConfirmacion = ['check', 'proveedor', 'factura', 'valor', 'fechaProgramada', 'estado'];

  // ─── e) Seguimiento ────────────────────────────────────
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
      // Se entra desde la factura, sin pasar por el buscador de proveedor: hay
      // que traerla para saber a qué titular pedirle las cuentas de destino.
      this.facturaS.getById(this.regIdFactura).subscribe({
        next: (factura) => {
          if (!factura) return;
          this.regFacturaElegida.set(factura);
          if (factura.titular) {
            this.regProveedor.set(factura.titular);
            this.cargarCuentasDestino(factura.titular.codigo);
          }
        },
        error: () => {},
      });
    }
    this.cargarCuentasBancarias();
    this.cargarSeguimiento();
  }

  /**
   * Cada pestaña de listado se refresca al entrar. Sin esto, al abrirlas desde
   * la cabecera (en vez de con los botones "Ir a...") quedaban vacías hasta
   * pulsar Actualizar.
   */
  onCambioTab(indice: number): void {
    // El propio mat-tab-group vuelve a emitir el cambio que provocan los
    // botones "Ir a...", así que se ignora el aviso repetido para no consultar
    // dos veces lo mismo.
    if (indice === this.tabActiva) return;
    this.tabActiva = indice;
    if (indice === 1) this.cargarPagosRegistrados();
    else if (indice === 3) this.cargarPagosPorConfirmar();
    else if (indice === 4) this.cargarSeguimiento();
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
      this.cargarCuentasDestino(titular.codigo);
      this.buscarFacturaRegistro();
    });
  }

  /**
   * Cuentas bancarias del proveedor (tabla CTBN). Sin una cuenta de destino el
   * pago se registra pero después no se puede incluir en ningún archivo: el
   * backend lo rechaza al formatearlo (FormateadorArchivoBancoPlanoImpl), así
   * que aquí se exige desde el registro.
   */
  private cargarCuentasDestino(codigoTitular: number | undefined): void {
    this.regIdCuentaDestino = null;
    this.cuentasDestino.set([]);
    if (!codigoTitular) return;

    this.cargandoCuentasDestino.set(true);
    const criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatos.LONG, 'titular', 'codigo', String(codigoTitular), TipoComandosBusqueda.IGUAL,
    );

    this.cuentaTitularS.selectByCriteria([criterio]).subscribe({
      next: (data) => {
        this.cargandoCuentasDestino.set(false);
        const activas = (data ?? []).filter((c) => this.esCuentaActiva(c));
        this.cuentasDestino.set(activas);
        this.autoSeleccionarCuentaDestino();
      },
      error: () => {
        this.cargandoCuentasDestino.set(false);
        this.cuentasDestino.set([]);
        this.snackBar.open('No se pudieron consultar las cuentas bancarias del proveedor.', 'Cerrar', {
          duration: 6000,
        });
      },
    });
  }

  /** Con una sola cuenta no hay nada que elegir; con varias se decide a mano. */
  private autoSeleccionarCuentaDestino(): void {
    const cuentas = this.cuentasDestino();
    this.regIdCuentaDestino = cuentas.length === 1 ? cuentas[0].codigo : null;
  }

  /** El estado nulo se trata como activo: hay cuentas antiguas sin CTBNESTD. */
  private esCuentaActiva(cuenta: CuentaBancariaTitular): boolean {
    return cuenta.estado == null || Number(cuenta.estado) !== 0;
  }

  etiquetaCuentaDestino(cuenta: CuentaBancariaTitular): string {
    const banco = (cuenta.banco as any)?.nombre ?? 'Banco';
    const tipo = Number(cuenta.tipoCuenta) === 1 ? 'Cte.' : Number(cuenta.tipoCuenta) === 2 ? 'Ahorros' : '';
    return `${banco} — ${cuenta.numeroCuenta}${tipo ? ` (${tipo})` : ''}`;
  }

  /** Proveedor ya elegido y sin ninguna cuenta activa registrada en CTBN. */
  get proveedorSinCuentaDestino(): boolean {
    return !!this.regProveedor() && !this.cargandoCuentasDestino() && this.cuentasDestino().length === 0;
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
      this.autoSeleccionarCuentaDestino();
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
      // En un débito automático el banco debita por convenio y no hay
      // transferencia: solo ahí se puede registrar sin cuenta de destino.
      && (this.regDebitoAutomatico || this.regIdCuentaDestino != null)
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
        if (!this.regDebitoAutomatico) this.autoSeleccionarCuentaDestino();
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
    this.onCambioTab(1);
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

  /**
   * Sin uso mientras la pestaña 3 esté en espera del formato de respuesta del
   * banco. Se conserva para reactivarla junto con la pestaña.
   */
  irACargarRespuesta(): void {
    this.onCambioTab(2);
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
    this.onCambioTab(4);
  }

  // ═══ d) CONFIRMACIÓN MANUAL ═════════════════════════════

  irAConfirmacionManual(): void {
    this.onCambioTab(3);
  }

  /**
   * Pagos que siguen esperando al banco: Registrado (aún sin archivo) o
   * En archivo (ya enviado). Los débitos automáticos no entran porque nacen
   * confirmados y ya tienen su contabilidad.
   */
  cargarPagosPorConfirmar(): void {
    this.cargandoPorConfirmar.set(true);
    this.confError.set('');
    this.confSeleccionados.clear();

    this.pagoS.listar(this.idEmpresaSesion()).subscribe({
      next: (data) => {
        this.pagosPorConfirmar.set(
          (data ?? []).filter(
            (p) => !this.esDebitoAutomatico(p)
              && (p.estado === EstadoPagoProgramado.REGISTRADO
                || p.estado === EstadoPagoProgramado.EN_ARCHIVO)
          )
        );
        this.cargandoPorConfirmar.set(false);
      },
      error: (err: Error) => {
        this.pagosPorConfirmar.set([]);
        this.cargandoPorConfirmar.set(false);
        this.confError.set(err.message);
      },
    });
  }

  estaSeleccionadoConf(pago: PagoProgramado): boolean {
    return this.confSeleccionados.has(pago.id);
  }

  alternarSeleccionConf(pago: PagoProgramado): void {
    if (this.confSeleccionados.has(pago.id)) {
      this.confSeleccionados.delete(pago.id);
    } else {
      this.confSeleccionados.add(pago.id);
    }
  }

  get todosSeleccionadosConf(): boolean {
    const filas = this.pagosPorConfirmar();
    return filas.length > 0 && filas.every((p) => this.confSeleccionados.has(p.id));
  }

  alternarTodosConf(): void {
    if (this.todosSeleccionadosConf) {
      this.confSeleccionados.clear();
    } else {
      this.pagosPorConfirmar().forEach((p) => this.confSeleccionados.add(p.id));
    }
  }

  get totalSeleccionadoConf(): number {
    return this.pagosPorConfirmar()
      .filter((p) => this.confSeleccionados.has(p.id))
      .reduce((suma, p) => suma + (Number(p.valor) || 0), 0);
  }

  get puedeConfirmarManual(): boolean {
    return this.confSeleccionados.size > 0 && !!this.confFecha && !this.confirmandoManual();
  }

  /**
   * Confirmar genera contabilidad irreversible salvo reversión expresa, así que
   * se pide una confirmación explícita antes de lanzarla.
   */
  confirmarPagosManualmente(): void {
    if (!this.puedeConfirmarManual) return;

    const cantidad = this.confSeleccionados.size;
    const total = this.totalSeleccionadoConf.toFixed(2);
    const data: MotivoDialogData = {
      titulo: `Confirmar ${cantidad} pago(s) manualmente`,
      advertencia:
        `Se dará por pagado un total de $${total} como si el banco lo hubiera confirmado: `
        + 'se abona la factura y se generan el asiento contable y el movimiento bancario. '
        + 'Hágalo solo con los pagos que ya verificó en el estado de cuenta. Para deshacerlo '
        + 'habrá que revertir cada pago desde Seguimiento.',
      textoConfirmar: 'Sí, confirmar y contabilizar',
      requiereDobleConfirmacion: true,
      textoDobleConfirmacion: 'Verifiqué en el estado de cuenta que estos pagos se ejecutaron.',
    };

    this.dialog.open(MotivoDialogComponent, { width: '540px', data }).afterClosed().subscribe((motivo) => {
      if (!motivo) return;
      this.ejecutarConfirmacionManual(motivo);
    });
  }

  /** El motivo del diálogo se guarda como parte de la observación del pago. */
  private ejecutarConfirmacionManual(motivo: string): void {
    this.confirmandoManual.set(true);
    this.confError.set('');
    this.confResultado.set(null);

    const nota = [this.confObservacion.trim(), motivo].filter((t) => !!t).join(' | ');

    this.pagoS.confirmarManual({
      idsPagos: Array.from(this.confSeleccionados),
      referencia: this.confReferencia.trim() || undefined,
      fechaPago: this.fechaISO(this.confFecha),
      observacion: `Confirmación manual: ${nota}`,
      idUsuario: this.idUsuarioSesion(),
    }).subscribe({
      next: (resp) => {
        this.confirmandoManual.set(false);
        this.confResultado.set(resp);
        this.confReferencia = '';
        this.confObservacion = '';
        this.cargarPagosPorConfirmar();
        this.cargarSeguimiento();
        this.snackBar.open(resp.mensaje ?? 'Pagos confirmados.', 'Cerrar', { duration: 6000 });
      },
      error: (err: Error) => {
        this.confirmandoManual.set(false);
        this.confError.set(err.message);
      },
    });
  }

  // ═══ e) SEGUIMIENTO ═════════════════════════════════════

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

  /**
   * Los pagos de egresos de tesorería no tienen factura: su concepto es la
   * descripción del egreso (TSR.EGRS).
   */
  conceptoPago(pago: PagoProgramado): string {
    return pago.facturaCompra?.numero || pago.egreso?.descripcion || '—';
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
