import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { EstadoPagoProgramado, SaldoFactura } from '../../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { CuentaBancariaTitular } from '../../../../tsr/model/cuenta-bancaria-titular';
import { Titular } from '../../../../tsr/model/titular';
import { CuentaBancariaTitularService } from '../../../../tsr/service/cuenta-bancaria-titular.service';
import { FacturaCompraSelectorDialogComponent } from '../../../dialog/factura-compra-selector-dialog/factura-compra-selector-dialog.component';
import { FacturaCompra } from '../../../model/factura-compra';
import { FacturaCompraService } from '../../../service/factura-compra.service';
import { PagoProgramado } from '../../../model/pago-programado';
import { AplicacionPagoCxpService } from '../../../service/aplicacion-pago-cxp.service';
import { PagoProgramadoService } from '../../../service/pago-programado.service';

/**
 * Solicitud de pago a proveedor: lo único que queda en CxP del circuito de
 * pagos por transferencia (docs/pagos/PLAN-REORGANIZACION-CIRCUITO-PAGOS.md
 * §3.1 — el resto del ciclo pasó a Tesorería). Es exactamente la antigua
 * pestaña "1. Registrar Pago" de PagosTransferenciaComponent, sin las otras
 * cuatro.
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
  private detalleRubroS = inject(DetalleRubroService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  private readonly ROL_PROVEEDOR = 2;

  regProveedor = signal<Titular | null>(null);
  regFacturaElegida = signal<FacturaCompra | null>(null);
  regIdFactura: number | null = null;
  regIdCuentaDestino: number | null = null;
  /** Cuentas del proveedor (CTBN). El banco las necesita para la transferencia. */
  cuentasDestino = signal<CuentaBancariaTitular[]>([]);
  /** Catálogo de tipos de cuenta bancaria (rubro 23) para etiquetar cada cuenta. */
  private tiposCuentaBancaria = signal<DetalleRubro[]>([]);
  cargandoCuentasDestino = signal(false);
  /** Saldo de la factura elegida: precarga el valor y le pone tope. */
  regSaldo = signal<SaldoFactura | null>(null);
  cargandoSaldo = signal(false);
  /** Valor ya comprometido en pagos vigentes de la misma factura. */
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
   * Lo disponible se propone como valor a pagar y es el tope del campo.
   * Si no se puede consultar, el campo queda libre y valida solo el backend.
   */
  private cargarSaldoFactura(idFactura: number): void {
    this.cargandoSaldo.set(true);
    this.regSaldo.set(null);
    this.regComprometido.set(0);
    this.pagosComprometidos.set([]);

    this.cargarComprometidoFactura(idFactura);

    this.aplicacionS.getSaldo(idFactura).subscribe({
      next: (saldo) => {
        this.cargandoSaldo.set(false);
        this.regSaldo.set(saldo);
        const disponible = this.disponibleFactura ?? 0;
        this.regValor = disponible > 0 ? disponible.toFixed(2) : '';
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

  /**
   * El backend no deja pagar el saldo pendiente completo: le resta lo ya
   * comprometido en pagos registrados o enviados al banco de la misma factura
   * (PagoProgramadoServiceImpl.validaValorContraSaldo). El endpoint de saldo no
   * devuelve ese dato, así que se calcula aquí con los mismos estados; sin esto
   * la pantalla proponía un valor que el backend rechazaba con "supera lo
   * disponible".
   */
  private cargarComprometidoFactura(idFactura: number): void {
    forkJoin([
      this.pagoS.listar(this.idEmpresaSesion(), EstadoPagoProgramado.REGISTRADO),
      this.pagoS.listar(this.idEmpresaSesion(), EstadoPagoProgramado.EN_ARCHIVO),
    ]).subscribe({
      next: ([registrados, enArchivo]) => {
        const deLaFactura = [...(registrados ?? []), ...(enArchivo ?? [])]
          .filter((p) => p.facturaCompra?.id === idFactura);
        this.pagosComprometidos.set(deLaFactura);
        this.regComprometido.set(
          deLaFactura.reduce((suma, p) => suma + (Number(p.valor) || 0), 0)
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

  /** Saldo pendiente de la factura elegida; null mientras no se conozca. */
  get saldoPendienteFactura(): number | null {
    const saldo = this.regSaldo();
    return saldo ? Number(saldo.saldoPendiente) || 0 : null;
  }

  /**
   * Lo que el backend realmente acepta: el saldo pendiente menos lo
   * comprometido en otros pagos vigentes de la misma factura.
   */
  get disponibleFactura(): number | null {
    const pendiente = this.saldoPendienteFactura;
    return pendiente == null ? null : pendiente - this.regComprometido();
  }

  /** La tolerancia es la misma del backend, para no discrepar por redondeo. */
  get regExcedeSaldo(): boolean {
    const disponible = this.disponibleFactura;
    return disponible != null && this.regValorNumerico > disponible + 0.01;
  }

  /** Al salir del campo se recorta lo que exceda, para no dejarlo inválido. */
  ajustarValorAlSaldo(): void {
    const disponible = this.disponibleFactura;
    if (disponible != null && this.regValorNumerico > disponible + 0.01) {
      this.regValor = disponible > 0 ? disponible.toFixed(2) : '';
    }
  }

  get puedeRegistrar(): boolean {
    return !!this.regIdFactura
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
   */
  registrarPago(): void {
    if (!this.puedeRegistrar || !this.regIdFactura) return;

    this.registrando.set(true);
    this.regError.set('');
    this.regExito.set('');

    this.pagoS.registrar({
      idFacturaCompra: this.regIdFactura,
      idCuentaDestinoTitular: this.regIdCuentaDestino ?? undefined,
      valor: this.regValorNumerico,
      fechaProgramada: this.fechaISO(this.regFecha),
      idEmpresa: this.idEmpresaSesion(),
      idUsuario: this.idUsuarioSesion(),
      observacion: this.regObservacion.trim(),
    }).subscribe({
      next: (resp) => {
        this.registrando.set(false);
        const mensaje = resp.mensaje ?? 'Pago registrado. Queda pendiente de aprobación en tesorería.';
        this.regExito.set(mensaje);

        // La respuesta trae el saldo actualizado de la factura (sigue igual
        // hasta que se apruebe y confirme el pago); se refresca para que el
        // tope del campo no quede viejo.
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
        // El pago recién registrado ya compromete saldo: sin refrescar esto se
        // podía volver a registrar el mismo valor sobre la misma factura.
        if (this.regIdFactura) this.cargarComprometidoFactura(this.regIdFactura);
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
   * Hace falta porque después de registrar se conservan proveedor y factura
   * (para poder abonar otra vez la misma), así que sin esto había que recargar
   * la pantalla para pagar a otro proveedor.
   */
  nuevoPago(): void {
    this.regProveedor.set(null);
    this.regFacturaElegida.set(null);
    this.regIdFactura = null;
    this.regIdCuentaDestino = null;
    this.cuentasDestino.set([]);
    this.regSaldo.set(null);
    this.regComprometido.set(0);
    this.pagosComprometidos.set([]);
    this.regValor = '';
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
