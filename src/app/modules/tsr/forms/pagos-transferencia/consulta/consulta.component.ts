import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import {
  ESTADO_PAGO_PROGRAMADO_LABELS,
  EstadoPagoProgramado,
  FormaPagoAplicacion,
  FORMA_PAGO_LABELS,
} from '../../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { JasperReportesService } from '../../../../../shared/services/jasper-reportes.service';
import { Titular } from '../../../model/titular';
import { etiquetaOrigenPagoExterno } from '../../../../cxp/model/origen-pago-externo';
import { AsientoDePago, PagoProgramado } from '../../../../cxp/model/pago-programado';
import { PagoProgramadoService } from '../../../../cxp/service/pago-programado.service';

/**
 * T4 del circuito de pagos por transferencia
 * (docs/pagos/PLAN-REORGANIZACION-CIRCUITO-PAGOS.md §3.2): consulta con
 * filtros, anular y revertir confirmado. Sale de la antigua pestaña
 * "5. Seguimiento" de PagosTransferenciaComponent (cxp).
 *
 * ⚠️ Un pago revertido queda RECHAZADO/ANULADO y no se puede reconfirmar
 * desde acá: `puedeRevertir()` solo habilita el botón sobre un pago
 * `CONFIRMADO`, y esta pantalla no ofrece ninguna acción de "confirmar" —
 * eso vive en Recepción y confirmación (T3), sobre pagos que siguen
 * `REGISTRADO`/`EN_ARCHIVO`.
 */
@Component({
  selector: 'app-consulta-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './consulta.component.html',
  styleUrl: './consulta.component.scss',
})
export class ConsultaComponent implements OnInit {
  private pagoS = inject(PagoProgramadoService);
  private funcionesDatos = inject(FuncionesDatosService);
  private jasperS = inject(JasperReportesService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  private readonly ROL_PROVEEDOR = 2;

  segEstado: number | null = null;
  pagosSeguimiento = signal<PagoProgramado[]>([]);
  cargandoSeguimiento = signal(false);
  segError = signal('');
  /** Pago cuyo PDF de asiento se está generando; null si no hay ninguno. */
  imprimiendoAsiento = signal<number | null>(null);
  readonly columnasSeguimiento = ['proveedor', 'factura', 'tipo', 'valor', 'fechaProgramada', 'estado', 'acciones'];

  // ─── Filtros (panel superior, búsqueda en cliente) ─────
  segProveedorFiltro = signal<Titular | null>(null);
  segConcepto = signal('');
  /** Tipos de pago marcados en el combo multiselección (0 = transferencia, 1 = débito). */
  segTiposPago = signal<number[]>([]);
  segFechaDesde = signal<Date | null>(null);
  segFechaHasta = signal<Date | null>(null);
  readonly tiposPagoFiltro = [
    { valor: 0, texto: 'Transferencia' },
    { valor: 1, texto: 'Débito automático' },
    { valor: 2, texto: 'Cheque' },
  ];

  readonly estadosFiltro = [
    { valor: EstadoPagoProgramado.REGISTRADO, texto: 'Registrado' },
    { valor: EstadoPagoProgramado.EN_ARCHIVO, texto: 'En archivo' },
    { valor: EstadoPagoProgramado.CONFIRMADO, texto: 'Confirmado' },
    { valor: EstadoPagoProgramado.RECHAZADO, texto: 'Rechazado' },
    { valor: EstadoPagoProgramado.ANULADO, texto: 'Anulado' },
  ];

  ngOnInit(): void {
    this.cargarSeguimiento();
  }

  cargarSeguimiento(): void {
    this.cargandoSeguimiento.set(true);
    this.segError.set('');

    this.pagoS.listar({
      idEmpresa: this.idEmpresaSesion(),
      estados: this.segEstado != null ? [this.segEstado] : undefined,
    }).subscribe({
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

  /** Código del filtro de tipo (0 transferencia, 1 débito, 2 cheque) para un pago dado. */
  private codigoTipoPago(pago: PagoProgramado): number {
    if (this.esCheque(pago)) return 2;
    if (this.esDebitoAutomatico(pago)) return 1;
    return 0;
  }

  /** Texto de la columna Tipo; se reutiliza en la celda y en el filtro. */
  textoTipo(pago: PagoProgramado): string {
    if (this.esCheque(pago)) return FORMA_PAGO_LABELS[FormaPagoAplicacion.CHEQUE];
    if (this.esDebitoAutomatico(pago)) return FORMA_PAGO_LABELS[FormaPagoAplicacion.DEBITO_AUTOMATICO];
    return FORMA_PAGO_LABELS[FormaPagoAplicacion.TRANSFERENCIA];
  }

  /** Nombre del proveedor elegido en el filtro (chip del panel superior). */
  nombreProveedorFiltro(): string {
    const t = this.segProveedorFiltro();
    if (!t) return '';
    return t.razonSocial || t.nombre || t.identificacion || `Titular ${t.codigo}`;
  }

  /** Abre el mismo diálogo de proveedores para acotar la consulta. */
  buscarProveedorFiltro(): void {
    this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: { rolCodigo: this.ROL_PROVEEDOR, rolNombre: 'PROVEEDOR', titulo: 'Buscar Proveedor' },
    }).afterClosed().subscribe((titular: Titular | null) => {
      if (titular) this.segProveedorFiltro.set(titular);
    });
  }

  quitarProveedorFiltro(): void {
    this.segProveedorFiltro.set(null);
  }

  /**
   * Pagos con los filtros del panel superior aplicados. El backend devuelve
   * todo el conjunto (no hay paginación server-side), así que el filtrado se
   * hace en cliente sobre lo ya cargado.
   */
  pagosSeguimientoFiltrados = computed<PagoProgramado[]>(() => {
    const proveedor = this.segProveedorFiltro();
    const concepto = this.segConcepto().trim().toLowerCase();
    const tipos = this.segTiposPago();
    const desde = this.aInicioDia(this.segFechaDesde());
    const hasta = this.aFinDia(this.segFechaHasta());

    return this.pagosSeguimiento().filter((p) => {
      if (proveedor && p.titular?.codigo !== proveedor.codigo) return false;
      if (concepto && !this.conceptoPago(p).toLowerCase().includes(concepto)) return false;
      if (tipos.length && !tipos.includes(this.codigoTipoPago(p))) return false;
      if (desde || hasta) {
        const f = this.funcionesDatos.convertirFechaDesdeBackend(p.fechaProgramada);
        if (!f) return false;
        if (desde && f < desde) return false;
        if (hasta && f > hasta) return false;
      }
      return true;
    });
  });

  private aInicioDia(fecha: Date | null): Date | null {
    if (!fecha) return null;
    const d = new Date(fecha);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private aFinDia(fecha: Date | null): Date | null {
    if (!fecha) return null;
    const d = new Date(fecha);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  hayFiltrosSeguimiento(): boolean {
    return !!(
      this.segProveedorFiltro() || this.segConcepto().trim() || this.segTiposPago().length
      || this.segFechaDesde() || this.segFechaHasta()
    );
  }

  limpiarFiltrosSeguimiento(): void {
    this.segProveedorFiltro.set(null);
    this.segConcepto.set('');
    this.segTiposPago.set([]);
    this.segFechaDesde.set(null);
    this.segFechaHasta.set(null);
  }

  etiquetaEstado(estado: number): { texto: string; clase: string } {
    return ESTADO_PAGO_PROGRAMADO_LABELS[estado] ?? { texto: `Estado ${estado}`, clase: 'badge-neutro' };
  }

  /** El banco lo debitó por convenio: nació confirmado y sin lote. */
  esDebitoAutomatico(pago: PagoProgramado): boolean {
    return Number(pago.debitoAutomatico) === 1;
  }

  esCheque(pago: PagoProgramado): boolean {
    return pago.formaPago === FormaPagoAplicacion.CHEQUE;
  }

  /** Solo se anula lo que el banco todavía no confirmó. */
  puedeAnular(pago: PagoProgramado): boolean {
    return pago.estado === EstadoPagoProgramado.REGISTRADO || pago.estado === EstadoPagoProgramado.EN_ARCHIVO;
  }

  /**
   * Revertir solo aplica a un pago ya confirmado: deshace contabilidad. Un
   * pago que ya se revirtió queda RECHAZADO/ANULADO, no CONFIRMADO, así que
   * esta condición ya lo excluye — no vuelve a ofrecerse "revertir" sobre él,
   * ni "confirmar", que ni siquiera existe en esta pantalla.
   */
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

  /**
   * El asiento no cuelga del pago: lo tiene lo que se contabilizó al
   * confirmarlo — la aplicación (pago de factura), el egreso de tesorería o el
   * anticipo. Null mientras el pago no haya generado contabilidad.
   */
  asientoDePago(pago: PagoProgramado): AsientoDePago | null {
    const asiento = pago.aplicacion?.asiento ?? pago.egreso?.asiento ?? pago.anticipo?.asiento;
    return asiento?.codigo ? asiento : null;
  }

  etiquetaAsiento(asiento: AsientoDePago): string {
    return asiento.numeroAlterno || String(asiento.codigo);
  }

  /** Genera el PDF del asiento con el mismo reporte Jasper de Contabilidad. */
  imprimirAsiento(pago: PagoProgramado): void {
    const asiento = this.asientoDePago(pago);
    if (!asiento || this.imprimiendoAsiento() != null) return;

    this.imprimiendoAsiento.set(pago.id);

    this.jasperS.generar('cnt', 'RPRT_ASNT_CNTB', {
      P_PATH: '',
      P_REPORTE: 'ASIENTO',
      P_ASNTCDGO: asiento.codigo,
      P_IMAGEN: null,
    }).subscribe({
      next: (blob) => {
        this.imprimiendoAsiento.set(null);
        this.descargarPdf(blob, `asiento-${this.etiquetaAsiento(asiento)}.pdf`);
      },
      error: () => {
        this.imprimiendoAsiento.set(null);
        this.snackBar.open('No se pudo generar el PDF del asiento.', 'Cerrar', { duration: 6000 });
      },
    });
  }

  private descargarPdf(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
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

  formatearFecha(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /**
   * Los pagos de egresos de tesorería no tienen factura: su concepto es la
   * descripción del egreso (TSR.EGRS). Los de origen externo tampoco: su
   * concepto es la etiqueta legible del origen más el id del documento que lo
   * generó en el módulo origen.
   */
  conceptoPago(pago: PagoProgramado): string {
    if (pago.origenExterno) {
      const etiqueta = etiquetaOrigenPagoExterno(pago.origenExterno);
      return pago.idOrigen != null ? `${etiqueta} #${pago.idOrigen}` : etiqueta;
    }
    return pago.facturaCompra?.numero || pago.egreso?.descripcion || '—';
  }

  /**
   * Nombre para la columna "Proveedor". En un pago de origen externo el destinatario puede no
   * estar en el maestro de titulares (`titular` null): cae al beneficiario ocasional que CXP
   * guarda denormalizado.
   */
  nombreBeneficiario(pago: PagoProgramado): string {
    return pago.titular?.nombre || pago.beneficiarioNombre || '—';
  }

  private idEmpresaSesion(): number {
    return +(sessionStorage.getItem('idEmpresa') || localStorage.getItem('idEmpresa') || '0');
  }

  private idUsuarioSesion(): number {
    return +(sessionStorage.getItem('idUsuario') || localStorage.getItem('idUsuario') || '0');
  }
}
