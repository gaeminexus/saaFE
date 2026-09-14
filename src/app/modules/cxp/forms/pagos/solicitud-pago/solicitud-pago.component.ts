import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import {
  EstadoPagoFactura,
  EstadoPagoProgramado,
  SaldoFactura,
} from '../../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { CuentaBancariaTitular } from '../../../../tsr/model/cuenta-bancaria-titular';
import { Titular } from '../../../../tsr/model/titular';
import { CuentaBancariaTitularService } from '../../../../tsr/service/cuenta-bancaria-titular.service';
import { FacturaCompra } from '../../../model/factura-compra';
import { FacturaCompraService } from '../../../service/factura-compra.service';
import { LiquidacionCompraCompra } from '../../../model/liquidacion-compra-compra';
import { LiquidacionCompraCompraService } from '../../../service/liquidacion-compra-compra.service';
import { PagoProgramado, RegistrarPagoRequest } from '../../../model/pago-programado';
import { AplicacionPagoCxpService } from '../../../service/aplicacion-pago-cxp.service';
import { PagoProgramadoService } from '../../../service/pago-programado.service';

/** Tipo de documento elegible para pagar desde esta pantalla. */
export type TipoDocumentoPagoCxp = 'FACTURA' | 'LIQUIDACION_COMPRA' | 'NOTA_VENTA';

/**
 * Un documento del combo "Documento a pagar". Nota de venta también es
 * `FacturaCompra` (`tipoComprobante = '02'`); liquidación de compra es
 * `LiquidacionCompraCompra` (`PGS.LQCC`, NO `CBR.LQCS`).
 */
type DocumentoPagoCxp = FacturaCompra | LiquidacionCompraCompra;

const ETIQUETAS_TIPO_DOCUMENTO: Record<TipoDocumentoPagoCxp, { etiqueta: string; plural: string }> = {
  FACTURA: { etiqueta: 'Factura', plural: 'facturas' },
  LIQUIDACION_COMPRA: { etiqueta: 'Liquidación de compra', plural: 'liquidaciones de compra' },
  NOTA_VENTA: { etiqueta: 'Nota de venta', plural: 'notas de venta' },
};

/**
 * Solicitud de pago a proveedor: lo único que queda en CxP del circuito de
 * pagos por transferencia (docs/pagos/PLAN-REORGANIZACION-CIRCUITO-PAGOS.md
 * §3.1 — el resto del ciclo pasó a Tesorería). Es exactamente la antigua
 * pestaña "1. Registrar Pago" de PagosTransferenciaComponent, sin las otras
 * cuatro.
 *
 * Paga factura, nota de venta (misma tabla `FacturaCompra`) o liquidación de
 * compra `PGS.LQCC` (docs/pagos/API-PAGO-LIQUIDACION-Y-NOTA-VENTA.md). El
 * tipo de documento elegido decide qué endpoint de saldo se consulta y cuál
 * de los dos ids excluyentes viaja en `POST /pgtr`.
 *
 * No manda `idCuentaBancariaOrigen` ni `formaPago`: el pago nace
 * `POR_APROBAR` y cae en la bandeja de Tesorería → Pagos por transferencia →
 * Aprobación de pagos, donde se elige cuenta y forma de pago.
 */
@Component({
  selector: 'app-solicitud-pago',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './solicitud-pago.component.html',
  styleUrl: './solicitud-pago.component.scss',
})
export class SolicitudPagoComponent implements OnInit {
  private pagoS = inject(PagoProgramadoService);
  private aplicacionS = inject(AplicacionPagoCxpService);
  private cuentaTitularS = inject(CuentaBancariaTitularService);
  private facturaS = inject(FacturaCompraService);
  private liquidacionS = inject(LiquidacionCompraCompraService);
  private detalleRubroS = inject(DetalleRubroService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  private readonly ROL_PROVEEDOR = 2;

  readonly tiposDocumentoOptions = (
    Object.entries(ETIQUETAS_TIPO_DOCUMENTO) as [TipoDocumentoPagoCxp, { etiqueta: string; plural: string }][]
  ).map(([valor, e]) => ({ valor, etiqueta: e.etiqueta }));

  regProveedor = signal<Titular | null>(null);
  /** Tipo de documento elegido; decide de qué tabla se llena "Documento a pagar". */
  regTipoDocumento: TipoDocumentoPagoCxp = 'FACTURA';
  /** Documentos pendientes del proveedor para el tipo elegido. */
  documentosPendientes = signal<DocumentoPagoCxp[]>([]);
  cargandoDocumentos = signal(false);
  regDocumentoElegido = signal<DocumentoPagoCxp | null>(null);
  regIdDocumento: number | null = null;
  regIdCuentaDestino: number | null = null;
  /** Cuentas del proveedor (CTBN). El banco las necesita para la transferencia. */
  cuentasDestino = signal<CuentaBancariaTitular[]>([]);
  /** Catálogo de tipos de cuenta bancaria (rubro 23) para etiquetar cada cuenta. */
  private tiposCuentaBancaria = signal<DetalleRubro[]>([]);
  cargandoCuentasDestino = signal(false);
  /** Saldo del documento elegido: precarga el valor y le pone tope. */
  regSaldo = signal<SaldoFactura | null>(null);
  cargandoSaldo = signal(false);
  /** Valor ya comprometido en pagos vigentes del mismo documento. */
  regComprometido = signal(0);
  /** Los pagos que lo comprometen, para poder nombrarlos en el aviso. */
  pagosComprometidos = signal<PagoProgramado[]>([]);
  regValor = '';
  regFecha: Date | null = new Date();
  regObservacion = '';
  registrando = signal(false);
  regError = signal('');
  regExito = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('idFactura');
    if (id) {
      this.regIdDocumento = +id;
      this.cargarSaldoDocumento('FACTURA', this.regIdDocumento);
      // Se entra desde la factura, sin pasar por el buscador de proveedor: hay
      // que traerla para saber a qué titular pedirle las cuentas de destino.
      this.facturaS.getById(this.regIdDocumento).subscribe({
        next: (factura) => {
          if (!factura) return;
          this.regTipoDocumento = factura.tipoComprobante === '02' ? 'NOTA_VENTA' : 'FACTURA';
          this.regDocumentoElegido.set(factura);
          this.documentosPendientes.set([factura]);
          if (factura.titular) {
            this.regProveedor.set(factura.titular);
            this.cargarCuentasDestino(factura.titular.codigo);
            this.cargarDocumentosPendientes();
          }
        },
        error: () => {},
      });
    }
    this.cargarTiposCuentaBancaria();
  }

  /**
   * Tipos de cuenta bancaria (rubro 23). Los códigos los define el catálogo, no
   * son fijos, así que hay que resolver la descripción contra él en vez de
   * mapear números a mano.
   */
  private cargarTiposCuentaBancaria(): void {
    const RUBRO_TIPO_CUENTA_BANCARIA = 23;
    const enMemoria = this.detalleRubroS.getDetallesByParent(RUBRO_TIPO_CUENTA_BANCARIA);
    if (enMemoria.length > 0) {
      this.tiposCuentaBancaria.set(enMemoria);
      return;
    }
    // La caché se llena en el login; si se entra sin pasar por ahí, se pide
    // todo el catálogo y se filtra, igual que hace Titulares.
    this.detalleRubroS.getAll().subscribe({
      next: (todos) =>
        this.tiposCuentaBancaria.set(
          (todos ?? []).filter((d) => d.rubro?.codigoAlterno === RUBRO_TIPO_CUENTA_BANCARIA)
        ),
      error: () => this.tiposCuentaBancaria.set([]),
    });
  }

  /** Paso 1: elegir el proveedor. Al elegirlo se encadena la búsqueda de documentos pendientes. */
  buscarProveedor(): void {
    this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: { rolCodigo: this.ROL_PROVEEDOR, rolNombre: 'PROVEEDOR', titulo: 'Buscar Proveedor' },
    }).afterClosed().subscribe((titular: Titular | null) => {
      if (!titular) return;
      this.regProveedor.set(titular);
      this.limpiarDocumentoElegido();
      this.cargarCuentasDestino(titular.codigo);
      this.cargarDocumentosPendientes();
    });
  }

  /**
   * Cuentas bancarias del proveedor (tabla CTBN). Sin una cuenta de destino el
   * pago se registra pero después no se puede incluir en ningún archivo: el
   * backend lo rechaza al formatearlo, así que aquí se exige desde el registro.
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
    const tipo = this.nombreTipoCuentaBancaria(cuenta.tipoCuenta);
    return `${banco} — ${cuenta.numeroCuenta}${tipo ? ` (${tipo})` : ''}`;
  }

  /** Descripción del tipo de cuenta según el catálogo (rubro 23). */
  private nombreTipoCuentaBancaria(tipo: number | null | undefined): string {
    if (tipo == null) return '';
    const detalle = this.tiposCuentaBancaria().find(d => Number(d.codigoAlterno) === Number(tipo));
    return detalle?.descripcion?.trim() ?? '';
  }

  /** Proveedor ya elegido y sin ninguna cuenta activa registrada en CTBN. */
  get proveedorSinCuentaDestino(): boolean {
    return !!this.regProveedor() && !this.cargandoCuentasDestino() && this.cuentasDestino().length === 0;
  }

  /** Etiqueta plural del tipo de documento elegido, para el hint de "sin pendientes". */
  get nombrePluralTipoActual(): string {
    return ETIQUETAS_TIPO_DOCUMENTO[this.regTipoDocumento].plural;
  }

  /** Cambia el tipo de documento: limpia lo elegido y recarga el combo de documentos. */
  cambiarTipoDocumento(): void {
    this.limpiarDocumentoElegido();
    this.cargarDocumentosPendientes();
  }

  /** Elige un documento del combo ya cargado y trae su saldo. */
  onElegirDocumento(): void {
    const id = this.regIdDocumento;
    if (id == null) {
      this.regDocumentoElegido.set(null);
      this.regSaldo.set(null);
      this.regComprometido.set(0);
      this.pagosComprometidos.set([]);
      this.regValor = '';
      return;
    }
    const doc = this.documentosPendientes().find((d) => d.id === id) ?? null;
    this.regDocumentoElegido.set(doc);
    this.cargarSaldoDocumento(this.regTipoDocumento, id);
  }

  private limpiarDocumentoElegido(): void {
    this.regDocumentoElegido.set(null);
    this.regIdDocumento = null;
    this.regSaldo.set(null);
    this.regComprometido.set(0);
    this.pagosComprometidos.set([]);
    this.regValor = '';
  }

  /**
   * Paso 2: documentos pendientes del proveedor para el tipo elegido
   * (docs/pagos/API-PAGO-LIQUIDACION-Y-NOTA-VENTA.md §2), copiando el criterio
   * de `FacturaCompraSelectorDialogComponent.cargarFacturas()`: mismo filtro
   * de titular, mismos descartes (estado inactivo/anulado, ya pagado, ya
   * comprometido en otro pago vigente) y mismo orden (id descendente).
   */
  private cargarDocumentosPendientes(): void {
    const titular = this.regProveedor();
    this.documentosPendientes.set([]);
    if (!titular?.codigo) return;

    this.cargandoDocumentos.set(true);
    const tipo = this.regTipoDocumento;

    const criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatos.LONG, 'titular', 'codigo', String(titular.codigo), TipoComandosBusqueda.IGUAL,
    );
    criterio.setNumeroCampoRepetido(0);

    const documentos$: Observable<DocumentoPagoCxp[] | null> = tipo === 'LIQUIDACION_COMPRA'
      ? this.liquidacionS.selectByCriteria([criterio])
      : this.facturaS.selectByCriteria([criterio]);

    // Si falla, se sigue sin excluir nada: el backend igual rechaza el pago duplicado si se
    // fuerza, esto es solo para no ofrecer una opción ya comprometida.
    const comprometidas$ = this.pagoS.facturasComprometidas(titular.codigo).pipe(
      map((r) => new Set(tipo === 'LIQUIDACION_COMPRA' ? (r?.idsLiquidaciones || []) : (r?.idsFacturas || []))),
      catchError(() => of(new Set<number>())),
    );

    forkJoin({ documentos: documentos$, comprometidas: comprometidas$ }).subscribe({
      next: ({ documentos, comprometidas }) => {
        let lista = (documentos || []) as DocumentoPagoCxp[];
        if (tipo === 'FACTURA') {
          lista = lista.filter((d) => (d as FacturaCompra).tipoComprobante !== '02');
        } else if (tipo === 'NOTA_VENTA') {
          lista = lista.filter((d) => (d as FacturaCompra).tipoComprobante === '02');
        }
        lista = lista
          .filter((d) => Number(d.estado) === 1)
          // Un estadoPago null NO descarta: la nota de venta manual nace sin ese dato.
          .filter((d) => (d as FacturaCompra).estadoPago !== EstadoPagoFactura.PAGADA)
          .filter((d) => !comprometidas.has(d.id))
          .sort((a, b) => (b.id || 0) - (a.id || 0));
        this.documentosPendientes.set(lista);
        this.cargandoDocumentos.set(false);
      },
      error: () => {
        this.documentosPendientes.set([]);
        this.cargandoDocumentos.set(false);
        this.snackBar.open(
          `No se pudieron consultar las ${ETIQUETAS_TIPO_DOCUMENTO[tipo].plural} del proveedor.`,
          'Cerrar', { duration: 6000 },
        );
      },
    });
  }

  /** "número · fecha · total" para una fila del combo "Documento a pagar". */
  etiquetaDocumento(d: DocumentoPagoCxp): string {
    const fecha = this.funcionesDatos.formatoFecha(d.fecha, FuncionesDatosService.SOLO_FECHA) || '—';
    const total = new Intl.NumberFormat('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      Number(d.total) || 0,
    );
    return `${d.numero} · ${fecha} · ${total}`;
  }

  /**
   * Lo disponible se propone como valor a pagar y es el tope del campo.
   * Si no se puede consultar, el campo queda libre y valida solo el backend.
   */
  private cargarSaldoDocumento(tipo: TipoDocumentoPagoCxp, idDocumento: number): void {
    this.cargandoSaldo.set(true);
    this.regSaldo.set(null);
    this.regComprometido.set(0);
    this.pagosComprometidos.set([]);

    this.cargarComprometidoDocumento(tipo, idDocumento);

    // La liquidación usa un endpoint distinto (`/aplp/saldoLiquidacion`), ya normalizado a la
    // misma forma de SaldoFactura por AplicacionPagoCxpService — ver su comentario.
    const saldo$ = tipo === 'LIQUIDACION_COMPRA'
      ? this.aplicacionS.getSaldoLiquidacion(idDocumento)
      : this.aplicacionS.getSaldo(idDocumento);

    saldo$.subscribe({
      next: (saldo) => {
        this.cargandoSaldo.set(false);
        this.regSaldo.set(saldo);
        const disponible = this.disponibleDocumento ?? 0;
        this.regValor = disponible > 0 ? disponible.toFixed(2) : '';
      },
      error: (err: Error) => {
        this.cargandoSaldo.set(false);
        this.regValor = '';
        this.snackBar.open(`No se pudo consultar el saldo del documento: ${err.message}`, 'Cerrar', {
          duration: 6000,
        });
      },
    });
  }

  /**
   * El backend no deja pagar el saldo pendiente completo: le resta lo ya
   * comprometido en pagos registrados o enviados al banco del mismo
   * documento (PagoProgramadoServiceImpl.validaValorContraSaldo). El endpoint
   * de saldo no devuelve ese dato, así que se calcula aquí con los mismos
   * estados; sin esto la pantalla proponía un valor que el backend rechazaba
   * con "supera lo disponible".
   */
  private cargarComprometidoDocumento(tipo: TipoDocumentoPagoCxp, idDocumento: number): void {
    forkJoin([
      this.pagoS.listar(this.idEmpresaSesion(), EstadoPagoProgramado.REGISTRADO),
      this.pagoS.listar(this.idEmpresaSesion(), EstadoPagoProgramado.EN_ARCHIVO),
    ]).subscribe({
      next: ([registrados, enArchivo]) => {
        const todos = [...(registrados ?? []), ...(enArchivo ?? [])];
        const delDocumento = tipo === 'LIQUIDACION_COMPRA'
          ? todos.filter((p) => p.liquidacionCompra?.id === idDocumento)
          : todos.filter((p) => p.facturaCompra?.id === idDocumento);
        this.pagosComprometidos.set(delDocumento);
        this.regComprometido.set(
          delDocumento.reduce((suma, p) => suma + (Number(p.valor) || 0), 0)
        );
      },
      // Sin el dato se deja pasar: el backend sigue siendo quien valida.
      error: () => {
        this.pagosComprometidos.set([]);
        this.regComprometido.set(0);
      },
    });
  }

  nombreProveedorRegistro(): string {
    const t = this.regProveedor();
    if (!t) return '';
    return t.razonSocial || t.nombre || t.identificacion || `Titular ${t.codigo}`;
  }

  get regValorNumerico(): number {
    const v = parseFloat(String(this.regValor).replace(',', '.'));
    return Number.isFinite(v) ? v : 0;
  }

  /** Saldo pendiente del documento elegido; null mientras no se conozca. */
  get saldoPendienteDocumento(): number | null {
    const saldo = this.regSaldo();
    return saldo ? Number(saldo.saldoPendiente) || 0 : null;
  }

  /**
   * Lo que el backend realmente acepta: el saldo pendiente menos lo
   * comprometido en otros pagos vigentes del mismo documento.
   */
  get disponibleDocumento(): number | null {
    const pendiente = this.saldoPendienteDocumento;
    return pendiente == null ? null : pendiente - this.regComprometido();
  }

  /** La tolerancia es la misma del backend, para no discrepar por redondeo. */
  get regExcedeSaldo(): boolean {
    const disponible = this.disponibleDocumento;
    return disponible != null && this.regValorNumerico > disponible + 0.01;
  }

  /** Al salir del campo se recorta lo que exceda, para no dejarlo inválido. */
  ajustarValorAlSaldo(): void {
    const disponible = this.disponibleDocumento;
    if (disponible != null && this.regValorNumerico > disponible + 0.01) {
      this.regValor = disponible > 0 ? disponible.toFixed(2) : '';
    }
  }

  get puedeRegistrar(): boolean {
    return !!this.regIdDocumento
      && this.regValorNumerico > 0
      && !this.regExcedeSaldo
      && !this.registrando();
  }

  /**
   * El pago nace `POR_APROBAR`, sin cuenta bancaria de origen ni forma de
   * pago (docs/pagos/PLAN-REORGANIZACION-CIRCUITO-PAGOS.md en saaBE): eso se
   * elige al aprobar en lote, en Tesorería → Pagos por transferencia →
   * Aprobación de pagos. Por eso `idCuentaBancariaOrigen` y `formaPago` NUNCA
   * se mandan desde acá — mandarlos saltea la aprobación.
   *
   * Manda `idFacturaCompra` (factura o nota de venta) o `idLiquidacionCompra`
   * (liquidación), nunca los dos (docs/pagos/API-PAGO-LIQUIDACION-Y-NOTA-VENTA.md §1).
   */
  registrarPago(): void {
    if (!this.puedeRegistrar || !this.regIdDocumento) return;

    this.registrando.set(true);
    this.regError.set('');
    this.regExito.set('');

    const tipo = this.regTipoDocumento;
    const idDocumento = this.regIdDocumento;
    const body: RegistrarPagoRequest = {
      idCuentaDestinoTitular: this.regIdCuentaDestino ?? undefined,
      valor: this.regValorNumerico,
      fechaProgramada: this.fechaISO(this.regFecha),
      idEmpresa: this.idEmpresaSesion(),
      idUsuario: this.idUsuarioSesion(),
      observacion: this.regObservacion.trim(),
    };
    if (tipo === 'LIQUIDACION_COMPRA') {
      body.idLiquidacionCompra = idDocumento;
    } else {
      body.idFacturaCompra = idDocumento;
    }

    this.pagoS.registrar(body).subscribe({
      next: (resp) => {
        this.registrando.set(false);
        const mensaje = resp.mensaje ?? 'Pago registrado. Queda pendiente de aprobación en tesorería.';
        this.regExito.set(mensaje);

        // La respuesta trae el saldo actualizado del documento (sigue igual hasta
        // que se apruebe y confirme el pago); se refresca para que el tope del
        // campo no quede viejo. La liquidación usa liquidacionId/numeroLiquidacion
        // en vez de facturaId/numeroFactura (§1 del contrato) — se normaliza acá
        // a la misma forma que ya pinta la plantilla.
        if (resp.liquidacionId != null) {
          this.regSaldo.set({
            facturaId: resp.liquidacionId,
            numeroFactura: resp.numeroLiquidacion ?? '',
            total: resp.total,
            totalAplicado: resp.totalAplicado,
            saldoPendiente: resp.saldoPendiente,
            estadoPago: resp.estadoPago,
          });
        } else if (resp.facturaId != null) {
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
        // El pago recién registrado ya compromete saldo: sin refrescar esto se
        // podía volver a registrar el mismo valor sobre el mismo documento.
        this.cargarComprometidoDocumento(tipo, idDocumento);
        this.snackBar.open(mensaje, 'Cerrar', { duration: 6000 });
      },
      error: (err: Error) => {
        this.registrando.set(false);
        this.regError.set(err.message);
      },
    });
  }

  /**
   * Deja la pantalla en blanco y arranca el flujo de un pago nuevo.
   * Hace falta porque después de registrar se conservan proveedor y documento
   * (para poder abonar otra vez el mismo), así que sin esto había que recargar
   * la pantalla para pagar a otro proveedor.
   */
  nuevoPago(): void {
    this.regProveedor.set(null);
    this.regTipoDocumento = 'FACTURA';
    this.documentosPendientes.set([]);
    this.limpiarDocumentoElegido();
    this.regIdCuentaDestino = null;
    this.cuentasDestino.set([]);
    this.regFecha = new Date();
    this.regObservacion = '';
    this.regError.set('');
    this.regExito.set('');

    this.buscarProveedor();
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
