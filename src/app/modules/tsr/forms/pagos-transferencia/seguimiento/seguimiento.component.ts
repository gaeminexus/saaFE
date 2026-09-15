import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { ESTADO_PAGO_PROGRAMADO_LABELS } from '../../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { PagoProgramadoService } from '../../../../cxp/service/pago-programado.service';
import {
  DetalleSeguimientoPago,
  EtapaSeguimiento,
  ResumenSeguimientoPago,
} from '../../../model/seguimiento-pago';
import { SeguimientoPagoService } from '../../../service/seguimiento-pago.service';

/**
 * Seguimiento de un pago (pedido 1 del usuario, docs/tsr/API-SEGUIMIENTO-PAGOS.md): una sola
 * pantalla que dice en qué estado está un pago, su origen y en qué lugar del proceso se quedó,
 * con acceso directo a la pantalla de esa etapa o a anular/revertir sin salir de acá.
 *
 * El backend calcula `acciones` con las mismas reglas que ya aplican `POST /pgtr/anular/{id}` y
 * `POST /pgtr/revertirConfirmado/{id}` — esta pantalla NUNCA decide por su cuenta si un botón
 * debe habilitarse, solo lee `acciones.puedeAnular`/`puedeRevertir` (§5 del contrato).
 */
@Component({
  selector: 'app-seguimiento-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './seguimiento.component.html',
  styleUrl: './seguimiento.component.scss',
})
export class SeguimientoComponent implements OnInit {
  private seguimientoS = inject(SeguimientoPagoService);
  private pagoS = inject(PagoProgramadoService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // ─── Buscador ────────────────────────────────────────────
  textoBusqueda = '';
  buscando = signal(false);
  errorBusqueda = signal('');
  resultados = signal<ResumenSeguimientoPago[] | null>(null);
  readonly columnasResultados = ['numero', 'beneficiario', 'origen', 'concepto', 'valor', 'fechaProgramada', 'estado'];

  // ─── Detalle ─────────────────────────────────────────────
  cargandoDetalle = signal(false);
  errorDetalle = signal('');
  detalle = signal<DetalleSeguimientoPago | null>(null);

  // ─── Acciones ────────────────────────────────────────────
  anulando = signal(false);
  revirtiendo = signal(false);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      if (id > 0) this.verDetalle(id);
    }
  }

  // ═══ BUSCAR ═══════════════════════════════════════════════

  get puedeBuscar(): boolean {
    const t = this.textoBusqueda.trim();
    if (!t) return false;
    if (this.esNumeroExacto(t)) return true;
    return t.length >= 3;
  }

  private esNumeroExacto(texto: string): boolean {
    return /^\d+$/.test(texto);
  }

  /**
   * Un solo campo: si es todo dígitos se busca por `numero` (N° de pago exacto); si no, por
   * `texto` (mínimo 3 caracteres — observación, beneficiario, titular o número de documento,
   * §1 del contrato).
   */
  buscar(): void {
    if (!this.puedeBuscar) return;

    const t = this.textoBusqueda.trim();
    this.buscando.set(true);
    this.errorBusqueda.set('');
    this.resultados.set(null);
    this.detalle.set(null);
    this.errorDetalle.set('');

    const filtros = this.esNumeroExacto(t) ? { numero: Number(t) } : { texto: t };
    this.seguimientoS.buscar(filtros).subscribe({
      next: (data) => {
        this.buscando.set(false);
        this.resultados.set(data ?? []);
      },
      error: (err: Error) => {
        this.buscando.set(false);
        this.errorBusqueda.set(err.message);
      },
    });
  }

  limpiarBusqueda(): void {
    this.textoBusqueda = '';
    this.resultados.set(null);
    this.errorBusqueda.set('');
  }

  seleccionar(fila: ResumenSeguimientoPago): void {
    this.router.navigate(['/menutesoreria/pagos/seguimiento', fila.idPago]);
    this.verDetalle(fila.idPago);
  }

  // ═══ DETALLE ══════════════════════════════════════════════

  verDetalle(idPago: number): void {
    this.cargandoDetalle.set(true);
    this.errorDetalle.set('');
    this.detalle.set(null);

    this.seguimientoS.detalle(idPago).subscribe({
      next: (data) => {
        this.cargandoDetalle.set(false);
        this.detalle.set(data);
      },
      error: (err: Error) => {
        this.cargandoDetalle.set(false);
        this.errorDetalle.set(err.message);
      },
    });
  }

  private recargarDetalle(): void {
    const idPago = this.detalle()?.pago?.idPago;
    if (idPago) this.verDetalle(idPago);
  }

  /** "Ir a la etapa": la ruta de la etapa actual, o la del origen si la etapa actual es el origen mismo. */
  rutaAccionEtapa(): string | null {
    const d = this.detalle();
    return d?.acciones?.rutaEtapaActual || d?.origen?.ruta || null;
  }

  irAEtapa(): void {
    const ruta = this.rutaAccionEtapa();
    if (ruta) this.router.navigateByUrl(ruta);
  }

  anular(): void {
    const d = this.detalle();
    if (!d?.acciones?.puedeAnular) return;

    const data: MotivoDialogData = {
      titulo: `Anular pago N° ${d.pago.idPago}`,
      advertencia: 'El pago se cancela. Esta acción no se deshace desde acá.',
      textoConfirmar: 'Sí, anular',
    };

    this.dialog.open(MotivoDialogComponent, { width: '480px', data }).afterClosed().subscribe((motivo) => {
      if (!motivo) return;
      this.anulando.set(true);
      this.pagoS.anular(d.pago.idPago, { motivo, idUsuario: this.idUsuarioSesion() }).subscribe({
        next: (resp) => {
          this.anulando.set(false);
          this.snackBar.open(resp.mensaje ?? 'Pago anulado correctamente.', 'Cerrar', { duration: 5000 });
          this.recargarDetalle();
        },
        error: (err: Error) => {
          this.anulando.set(false);
          this.snackBar.open(err.message, 'Cerrar', { duration: 6000 });
        },
      });
    });
  }

  revertir(): void {
    const d = this.detalle();
    if (!d?.acciones?.puedeRevertir) return;

    const data: MotivoDialogData = {
      titulo: `Revertir pago confirmado N° ${d.pago.idPago}`,
      advertencia: 'Este pago ya generó asiento contable y movimiento bancario. Al revertirlo se deshace esa contabilidad y el documento de origen recupera su saldo.',
      textoConfirmar: 'Sí, revertir',
      requiereDobleConfirmacion: true,
    };

    this.dialog.open(MotivoDialogComponent, { width: '520px', data }).afterClosed().subscribe((motivo) => {
      if (!motivo) return;
      this.revirtiendo.set(true);
      this.pagoS.revertirConfirmado(d.pago.idPago, { motivo, idUsuario: this.idUsuarioSesion() }).subscribe({
        next: (resp) => {
          this.revirtiendo.set(false);
          this.snackBar.open(resp.mensaje ?? 'Pago reversado.', 'Cerrar', { duration: 6000 });
          this.recargarDetalle();
        },
        error: (err: Error) => {
          this.revirtiendo.set(false);
          this.snackBar.open(err.message, 'Cerrar', { duration: 6000 });
        },
      });
    });
  }

  // ═══ PRESENTACIÓN ═══════════════════════════════════════

  etiquetaEstado(estado: number, estadoTexto: string): { texto: string; clase: string } {
    // El texto lo manda el backend (fuente de verdad); la clase de color sale del mismo catálogo
    // que usan las otras pantallas de pagos, indexado por el mismo código de estado.
    const clase = ESTADO_PAGO_PROGRAMADO_LABELS[estado]?.clase ?? 'badge-neutro';
    return { texto: estadoTexto, clase };
  }

  claseEtapa(etapa: EtapaSeguimiento): string {
    if (etapa.clave === 'RECHAZADO' || etapa.clave === 'ANULADO') return 'etapa-rechazada';
    if (etapa.situacion === 'HECHA') return 'etapa-hecha';
    if (etapa.situacion === 'ACTUAL') return 'etapa-actual';
    return 'etapa-pendiente';
  }

  iconoEtapa(etapa: EtapaSeguimiento): string {
    if (etapa.clave === 'RECHAZADO' || etapa.clave === 'ANULADO') return 'cancel';
    if (etapa.situacion === 'HECHA') return 'check_circle';
    if (etapa.situacion === 'ACTUAL') return 'radio_button_checked';
    return 'radio_button_unchecked';
  }

  formatearFecha(fecha: any): string {
    if (!fecha) return '—';
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatearMonto(monto: number | null | undefined): string {
    return (Number(monto) || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private idUsuarioSesion(): number {
    return +(sessionStorage.getItem('idUsuario') || localStorage.getItem('idUsuario') || '0');
  }
}
