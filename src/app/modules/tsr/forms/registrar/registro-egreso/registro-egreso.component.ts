import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { GrupoProductoSelectorDialogComponent } from '../../../../../shared/components/grupo-producto-selector-dialog/grupo-producto-selector-dialog.component';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';

import { GrupoProductoPago } from '../../../../cxp/model/grupo_producto_pago';
import { ProductoPago } from '../../../../cxp/model/producto_pago';
import { GrupoProductoPagoService } from '../../../../cxp/service/grupo-producto-pago.service';
import { ProductoPagoService } from '../../../../cxp/service/producto-pago.service';

import { CuentaBancaria } from '../../../model/cuenta-bancaria';
import { CuentaBancariaTitular } from '../../../model/cuenta-bancaria-titular';
import { ESTADO_EGRESO_LABELS, Egreso, EstadoEgresoTesoreria } from '../../../model/egreso';
import { Titular } from '../../../model/titular';
import { CuentaBancariaTitularService } from '../../../service/cuenta-bancaria-titular.service';
import { CuentaBancariaService } from '../../../service/cuenta-bancaria.service';
import { EgresoService } from '../../../service/egreso.service';

/**
 * Egresos de tesorería sin documento físico (comisiones, débitos por
 * administración de cuentas, servicios bancarios).
 *
 * Registrar el egreso crea su pago en el circuito de /pgtr: por transferencia
 * queda Pendiente y hay que incluirlo en un archivo del banco desde CXP →
 * Pagos por transferencia; con débito automático el banco ya debitó y el
 * egreso nace Pagado, con asiento y movimiento bancario generados.
 *
 * La cuenta contable no se pide en el formulario: sale del grupo del producto
 * CXP elegido. Si el grupo no tiene cuenta configurada el backend rechaza el
 * registro y no queda nada grabado.
 */
@Component({
  selector: 'app-registro-egreso',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './registro-egreso.component.html',
  styleUrls: ['./registro-egreso.component.scss'],
})
export class RegistroEgresoComponent implements OnInit {
  private egresoS = inject(EgresoService);
  private cuentaBancariaS = inject(CuentaBancariaService);
  private cuentaTitularS = inject(CuentaBancariaTitularService);
  private grupoProductoS = inject(GrupoProductoPagoService);
  private productoS = inject(ProductoPagoService);
  private detalleRubroS = inject(DetalleRubroService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  private readonly ROL_PROVEEDOR = 2;

  tabActiva = 0;

  // ─── Catálogos ─────────────────────────────────────────
  cargandoCatalogos = signal(false);
  cuentasBancarias = signal<CuentaBancaria[]>([]);
  gruposProducto = signal<GrupoProductoPago[]>([]);
  private todosProductos = signal<ProductoPago[]>([]);

  // ─── a) Registrar ──────────────────────────────────────
  regCuentaOrigen: CuentaBancaria | null = null;
  regIdGrupo: number | null = null;
  /** Grupo elegido en el diálogo; se conserva para mostrar cuenta + nombre. */
  regGrupo: GrupoProductoPago | null = null;
  regIdProducto: number | null = null;
  /** Filtros de texto de los combos largos (buscador interno del mat-select). */
  filtroCuentaOrigen = '';
  filtroProducto = '';
  regBeneficiario = signal<Titular | null>(null);
  /** Cuentas CTBN del beneficiario: el archivo del banco necesita el destino. */
  cuentasDestino = signal<CuentaBancariaTitular[]>([]);
  /** Catálogo de tipos de cuenta bancaria (rubro 23) para etiquetar cada cuenta. */
  private tiposCuentaBancaria = signal<DetalleRubro[]>([]);
  cargandoCuentasDestino = signal(false);
  regIdCuentaDestino: number | null = null;
  regDebitoAutomatico = false;
  regDescripcion = '';
  regValor = '';
  regFecha: Date | null = new Date();
  regReferencia = '';
  regObservacion = '';
  registrando = signal(false);
  regError = signal('');
  regExito = signal('');

  /** El producto se elige dentro del grupo: la lista completa es muy larga. */
  get productosDelGrupo(): ProductoPago[] {
    const idGrupo = this.regIdGrupo;
    if (!idGrupo) return [];
    return this.todosProductos().filter(
      (p) => p.grupoProducto?.codigo === idGrupo && p.estado === 1
    );
  }

  /** Productos del grupo ya aplicado el buscador interno del combo. */
  get productosFiltrados(): ProductoPago[] {
    const q = this.filtroProducto.trim().toLowerCase();
    const lista = this.productosDelGrupo;
    if (!q) return lista;
    return lista.filter((p) => (p.nombre ?? '').toLowerCase().includes(q));
  }

  /** Cuentas propias de origen ya aplicado el buscador interno del combo. */
  get cuentasBancariasFiltradas(): CuentaBancaria[] {
    const q = this.filtroCuentaOrigen.trim().toLowerCase();
    const lista = this.cuentasBancarias();
    if (!q) return lista;
    return lista.filter((c) => this.etiquetaCuenta(c).toLowerCase().includes(q));
  }

  /** Etiqueta del grupo: número de cuenta contable + nombre. */
  etiquetaGrupo(grupo: GrupoProductoPago | null): string {
    if (!grupo) return '';
    const cuenta = grupo.planCuenta?.cuentaContable?.trim();
    const nombre = String(grupo.nombre ?? '');
    return cuenta ? `${cuenta} — ${nombre}` : `${nombre}`;
  }

  // ─── b) Consulta ───────────────────────────────────────
  conEstado: number | null = null;
  egresos = signal<Egreso[]>([]);
  cargandoConsulta = signal(false);
  conError = signal('');
  readonly columnasConsulta = [
    'fecha', 'descripcion', 'beneficiario', 'producto', 'valor', 'asiento', 'estado', 'acciones',
  ];
  readonly estadosFiltro = [
    { valor: EstadoEgresoTesoreria.PENDIENTE_PAGO, texto: 'Pendiente de pago' },
    { valor: EstadoEgresoTesoreria.PAGADO, texto: 'Pagado' },
    { valor: EstadoEgresoTesoreria.ANULADO, texto: 'Anulado' },
  ];

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarEgresos();
  }

  onCambioTab(indice: number): void {
    if (indice === this.tabActiva) return;
    this.tabActiva = indice;
    if (indice === 1) this.cargarEgresos();
  }

  /**
   * Los códigos de rubro 23 (Corriente / Ahorros) los define la parametrización
   * de cada empresa y no son fijos, así que la descripción se resuelve contra el
   * catálogo en vez de mapear números a mano.
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

  private cargarCatalogos(): void {
    this.cargandoCatalogos.set(true);
    this.cargarTiposCuentaBancaria();

    this.cuentaBancariaS.getAll().subscribe({
      next: (data) => this.cuentasBancarias.set(data ?? []),
      error: () => {
        this.cuentasBancarias.set([]);
        this.snackBar.open('No se pudieron cargar las cuentas bancarias.', 'Cerrar', { duration: 5000 });
      },
    });

    this.grupoProductoS.getAll().subscribe({
      next: (data) => this.gruposProducto.set((data ?? []).filter((g) => g.estado === 1)),
      error: () => this.gruposProducto.set([]),
    });

    this.productoS.getAll().subscribe({
      next: (data) => {
        this.todosProductos.set(data ?? []);
        this.cargandoCatalogos.set(false);
      },
      error: () => {
        this.todosProductos.set([]);
        this.cargandoCatalogos.set(false);
        this.snackBar.open('No se pudieron cargar los productos de pago.', 'Cerrar', { duration: 5000 });
      },
    });
  }

  // ═══ a) REGISTRAR ═══════════════════════════════════════

  /**
   * Abre el selector de grupo con búsqueda por número de cuenta contable o por
   * nombre. Al elegir uno se limpia el producto (depende del grupo).
   */
  buscarGrupo(): void {
    this.dialog.open(GrupoProductoSelectorDialogComponent, {
      width: '760px',
      maxWidth: '98vw',
      data: { grupos: this.gruposProducto() },
    }).afterClosed().subscribe((grupo) => {
      if (!grupo) return;
      this.regGrupo = grupo as GrupoProductoPago;
      this.regIdGrupo = grupo.codigo;
      this.regIdProducto = null;
      this.filtroProducto = '';
    });
  }

  /**
   * En un débito automático el banco debita la cuenta propia por convenio: no
   * hay transferencia, así que ni el beneficiario ni su cuenta hacen falta.
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

  buscarBeneficiario(): void {
    this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: { rolCodigo: this.ROL_PROVEEDOR, rolNombre: 'PROVEEDOR', titulo: 'Buscar Beneficiario' },
    }).afterClosed().subscribe((titular: Titular | null) => {
      if (!titular) return;
      this.regBeneficiario.set(titular);
      this.cargarCuentasDestino(titular.codigo);
    });
  }

  nombreBeneficiario(): string {
    const t = this.regBeneficiario();
    if (!t) return '';
    return t.razonSocial || t.nombre || t.identificacion || `Titular ${t.codigo}`;
  }

  /**
   * Sin cuenta de destino el pago se registra pero el backend lo rechaza al
   * armar el archivo del banco, así que se exige ya desde el registro.
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
        this.cuentasDestino.set((data ?? []).filter((c) => this.esCuentaActiva(c)));
        this.autoSeleccionarCuentaDestino();
      },
      error: () => {
        this.cargandoCuentasDestino.set(false);
        this.cuentasDestino.set([]);
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
    const detalle = this.tiposCuentaBancaria().find((d) => Number(d.codigoAlterno) === Number(tipo));
    return detalle?.descripcion?.trim() ?? '';
  }

  /** Beneficiario ya elegido y sin ninguna cuenta activa registrada en CTBN. */
  get beneficiarioSinCuentaDestino(): boolean {
    return !!this.regBeneficiario() && !this.cargandoCuentasDestino() && this.cuentasDestino().length === 0;
  }

  get regValorNumerico(): number {
    const v = parseFloat(String(this.regValor).replace(',', '.'));
    return Number.isFinite(v) ? v : 0;
  }

  get puedeRegistrar(): boolean {
    return !!this.regCuentaOrigen
      && this.regIdProducto != null
      && !!this.regDescripcion.trim()
      && this.regValorNumerico > 0
      // Solo el débito automático puede ir sin beneficiario ni cuenta destino.
      && (this.regDebitoAutomatico || (!!this.regBeneficiario() && this.regIdCuentaDestino != null))
      && !this.registrando();
  }

  registrar(): void {
    if (!this.puedeRegistrar || !this.regCuentaOrigen || this.regIdProducto == null) return;

    this.registrando.set(true);
    this.regError.set('');
    this.regExito.set('');

    const esDebito = this.regDebitoAutomatico;

    this.egresoS.procesar({
      idEmpresa: this.idEmpresaSesion(),
      idTitular: esDebito ? undefined : (this.regBeneficiario()?.codigo ?? undefined),
      idProductoPago: this.regIdProducto,
      descripcion: this.regDescripcion.trim(),
      valor: this.regValorNumerico,
      fecha: this.fechaISO(this.regFecha),
      idCuentaBancariaOrigen: this.regCuentaOrigen.codigo,
      idCuentaDestinoTitular: esDebito ? undefined : (this.regIdCuentaDestino ?? undefined),
      debitoAutomatico: esDebito,
      referencia: this.regReferencia.trim() || undefined,
      observacion: this.regObservacion.trim() || undefined,
      idUsuario: this.idUsuarioSesion(),
    }).subscribe({
      next: (resp) => {
        this.registrando.set(false);

        let mensaje = resp.mensaje ?? 'Egreso registrado.';
        if (resp.debitoAutomatico && resp.asiento) {
          mensaje += ` Asiento N° ${resp.asiento}.`;
        }
        this.regExito.set(mensaje);
        this.limpiar();
        this.cargarEgresos();
        this.snackBar.open(mensaje, 'Cerrar', { duration: 6000 });
      },
      error: (err: Error) => {
        this.registrando.set(false);
        this.regError.set(err.message);
      },
    });
  }

  /** Se conservan la cuenta de origen y el grupo: se cargan varios seguidos. */
  limpiar(): void {
    this.regIdProducto = null;
    this.regBeneficiario.set(null);
    this.cuentasDestino.set([]);
    this.regIdCuentaDestino = null;
    this.regDescripcion = '';
    this.regValor = '';
    this.regReferencia = '';
    this.regObservacion = '';
    this.regFecha = new Date();
  }

  /** El pago del egreso se sigue desde la pantalla de pagos por transferencia. */
  irAPagos(): void {
    this.router.navigate(['/menucuentaxpagar/pagos/transferencias']);
  }

  // ═══ b) CONSULTA ════════════════════════════════════════

  cargarEgresos(): void {
    this.cargandoConsulta.set(true);
    this.conError.set('');

    this.egresoS.listar(this.idEmpresaSesion(), this.conEstado ?? undefined).subscribe({
      next: (data) => {
        this.egresos.set(data ?? []);
        this.cargandoConsulta.set(false);
      },
      error: (err: Error) => {
        this.egresos.set([]);
        this.cargandoConsulta.set(false);
        this.conError.set(err.message);
      },
    });
  }

  /** Un egreso ya pagado hay que revertirlo desde /pgtr antes de anularlo. */
  puedeAnular(egreso: Egreso): boolean {
    return Number(egreso.estado) === EstadoEgresoTesoreria.PENDIENTE_PAGO;
  }

  confirmarAnulacion(egreso: Egreso): void {
    const data: MotivoDialogData = {
      titulo: `Anular egreso N° ${egreso.id}`,
      advertencia:
        'Se anula el egreso y el pago que quedó pendiente en el circuito de pagos. Si el pago ya '
        + 'salió en un archivo enviado al banco habrá que procesar la respuesta antes de anularlo.',
      textoConfirmar: 'Sí, anular',
    };

    this.dialog.open(MotivoDialogComponent, { width: '520px', data }).afterClosed().subscribe((motivo) => {
      if (!motivo) return;
      this.egresoS.anular(egreso.id, { motivo, idUsuario: this.idUsuarioSesion() }).subscribe({
        next: (resp) => {
          this.snackBar.open(resp.mensaje ?? 'Egreso anulado.', 'Cerrar', { duration: 6000 });
          this.cargarEgresos();
        },
        error: (err: Error) => this.snackBar.open(err.message, 'Cerrar', { duration: 6000 }),
      });
    });
  }

  // ═══ HELPERS ════════════════════════════════════════════

  etiquetaEstado(estado: number): { texto: string; clase: string } {
    return ESTADO_EGRESO_LABELS[Number(estado)] ?? { texto: `Estado ${estado}`, clase: 'badge-neutro' };
  }

  etiquetaCuenta(cuenta: CuentaBancaria): string {
    return `${cuenta.banco?.nombre ?? 'Banco'} — ${cuenta.numeroCuenta}`;
  }

  nombreTitularFila(egreso: Egreso): string {
    const t = egreso.titular;
    if (!t) return '—';
    return t.razonSocial || t.nombre || t.identificacion || `Titular ${t.codigo}`;
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

  private idUsuarioSesion(): number {
    return +(sessionStorage.getItem('idUsuario') || localStorage.getItem('idUsuario') || '0');
  }
}
