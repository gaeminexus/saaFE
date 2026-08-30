import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppStateService } from '../../../../../shared/services/app-state.service';
import { empresaSesionCodigo } from '../../../../../shared/services/empresa-sesion';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../shared/services/funciones-datos.service';
import { FormaPagoAplicacion } from '../../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { CuentaBancaria } from '../../../model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../service/cuenta-bancaria.service';
import {
  AprobarPagosResponse,
  DisponibilidadCuenta,
  ORIGEN_PAGO_LABELS,
  OrigenPago,
  PagoPorAprobar,
} from '../../../../cxp/model/pago-programado';
import { PagoProgramadoService } from '../../../../cxp/service/pago-programado.service';

/**
 * Aprobación de pagos en lote. Ver
 * docs/logica-negocio/pagos/PLAN-REDISENO-APROBACION-PAGOS.md en saaBE —
 * la solicitud nace sin cuenta bancaria ni forma de pago (`POR_APROBAR`);
 * tesorería ve todos los pagos pendientes juntos, elige una cuenta y
 * aprueba en bloque. Al elegir cuenta se consulta GET /pgtr/disponibilidad
 * (§3.3/§7 del plan) y se advierte si el total seleccionado la supera, pero
 * no bloquea el botón: la validación real (y bloqueante) la hace el backend
 * al aprobar — esto es solo para que el usuario no llegue a intentarlo a
 * ciegas.
 *
 * Vive en tsr (no en cxp): quien aprueba, elige el banco y gira el cheque es
 * tesorería, aunque el pago se haya originado en CxP, TSR, RRHH o CRD. El
 * servicio que consume /pgtr/* se queda en cxp/service — un componente de
 * tsr importándolo no es un problema de Angular.
 */
@Component({
  selector: 'app-aprobacion-pagos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatCheckboxModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './aprobacion-pagos.component.html',
  styleUrls: ['./aprobacion-pagos.component.scss'],
})
export class AprobacionPagosComponent implements OnInit {
  private pagoS = inject(PagoProgramadoService);
  private cuentaS = inject(CuentaBancariaService);
  private appState = inject(AppStateService);
  private snackBar = inject(MatSnackBar);
  private funcionesDatos = inject(FuncionesDatosService);

  readonly FormaPagoAplicacion = FormaPagoAplicacion;
  readonly origenOptions = (Object.entries(ORIGEN_PAGO_LABELS) as [OrigenPago, string][]).map(
    ([codigo, texto]) => ({ codigo, texto }),
  );

  // ── Filtros y bandeja ──────────────────────────────────────────────
  filtroOrigen = signal<OrigenPago | null>(null);
  filtroDesde = signal<string>('');
  filtroHasta = signal<string>('');

  pagos = signal<PagoPorAprobar[]>([]);
  seleccionados = signal<Set<number>>(new Set());
  cargando = signal(false);
  errorCarga = signal('');

  columnas = ['sel', 'origen', 'beneficiario', 'concepto', 'valor', 'fechaSolicitada'];

  totalSeleccionado = computed(() => {
    const sel = this.seleccionados();
    return this.pagos()
      .filter((p) => sel.has(p.id))
      .reduce((s, p) => s + (Number(p.valor) || 0), 0);
  });

  // ── Cuenta y forma de pago ─────────────────────────────────────────
  cuentas = signal<CuentaBancaria[]>([]);
  cuentaSeleccionada = signal<CuentaBancaria | null>(null);
  formaPago = signal<number>(FormaPagoAplicacion.TRANSFERENCIA);
  fechaPago = signal<string>('');

  get cuentaManejaChequera(): boolean {
    return Number(this.cuentaSeleccionada()?.manejaChequera) === 1;
  }

  /**
   * `null` = desconocida (nada seleccionado todavía, o falló el GET) — nunca se muestra 0 ni un
   * número inventado, mismo criterio que el interruptor de contabilidad de CRD.
   */
  disponibilidad = signal<DisponibilidadCuenta | null>(null);
  cargandoDisponibilidad = signal(false);
  disponibilidadDesconocida = signal(false);

  excedeDisponible = computed(() => {
    const d = this.disponibilidad();
    return d != null && this.totalSeleccionado() > d.disponible;
  });

  aprobando = signal(false);
  errorAprobar = signal('');
  resultado = signal<AprobarPagosResponse | null>(null);

  puedeAprobar = computed(() => {
    if (this.seleccionados().size === 0) return false;
    if (!this.cuentaSeleccionada()) return false;
    if (this.formaPago() === FormaPagoAplicacion.CHEQUE && !this.cuentaManejaChequera) return false;
    return !this.aprobando();
  });

  ngOnInit(): void {
    this.cargarCuentas();
    this.buscar();
  }

  private idEmpresa(): number | null {
    return empresaSesionCodigo() ?? this.appState.getEmpresa()?.codigo ?? null;
  }

  private cargarCuentas(): void {
    this.cuentaS.getAll().subscribe({
      next: (data) => this.cuentas.set(Array.isArray(data) ? (data as CuentaBancaria[]).filter((c) => Number(c.estado) === 1) : []),
      error: () => this.cuentas.set([]),
    });
  }

  buscar(): void {
    const idEmpresa = this.idEmpresa();
    if (!idEmpresa) {
      this.pagos.set([]);
      this.errorCarga.set('No se pudo determinar la empresa de la sesión');
      return;
    }

    this.cargando.set(true);
    this.errorCarga.set('');
    this.resultado.set(null);

    this.pagoS.porAprobar({
      idEmpresa,
      origen: this.filtroOrigen() ?? undefined,
      desde: this.filtroDesde() || undefined,
      hasta: this.filtroHasta() || undefined,
    }).subscribe({
      next: (data) => {
        this.pagos.set(Array.isArray(data) ? data : []);
        this.seleccionados.set(new Set());
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.pagos.set([]);
        this.errorCarga.set(mensajeDeError(err, 'No se pudieron cargar los pagos por aprobar'));
      },
    });
  }

  limpiarFiltros(): void {
    this.filtroOrigen.set(null);
    this.filtroDesde.set('');
    this.filtroHasta.set('');
    this.buscar();
  }

  estaSeleccionado(id: number): boolean {
    return this.seleccionados().has(id);
  }

  toggleSeleccion(id: number, marcado: boolean): void {
    this.seleccionados.update((set) => {
      const nuevo = new Set(set);
      if (marcado) nuevo.add(id);
      else nuevo.delete(id);
      return nuevo;
    });
  }

  get todosSeleccionados(): boolean {
    return this.pagos().length > 0 && this.pagos().every((p) => this.seleccionados().has(p.id));
  }

  toggleTodos(marcado: boolean): void {
    this.seleccionados.set(marcado ? new Set(this.pagos().map((p) => p.id)) : new Set());
  }

  onCambioCuenta(): void {
    if (this.formaPago() === FormaPagoAplicacion.CHEQUE && !this.cuentaManejaChequera) {
      this.formaPago.set(FormaPagoAplicacion.TRANSFERENCIA);
    }
    this.consultarDisponibilidad();
  }

  /** GET /pgtr/disponibilidad/{idCuenta} al elegir cuenta (§3.3/§7 del plan). */
  private consultarDisponibilidad(): void {
    const cuenta = this.cuentaSeleccionada();
    this.disponibilidad.set(null);
    this.disponibilidadDesconocida.set(false);
    if (!cuenta) return;

    const hoy = this.funcionesDatos.formatearFechaParaBackend(new Date(), TipoFormatoFechaBackend.SOLO_FECHA)!;
    this.cargandoDisponibilidad.set(true);
    this.pagoS.disponibilidad(cuenta.codigo, hoy).subscribe({
      next: (d) => {
        this.cargandoDisponibilidad.set(false);
        this.disponibilidad.set(d);
      },
      error: () => {
        this.cargandoDisponibilidad.set(false);
        this.disponibilidadDesconocida.set(true);
      },
    });
  }

  origenLabel(origen: string): string {
    return ORIGEN_PAGO_LABELS[origen as OrigenPago] || origen;
  }

  aprobar(): void {
    const cuenta = this.cuentaSeleccionada();
    if (!this.puedeAprobar() || !cuenta) return;

    this.aprobando.set(true);
    this.errorAprobar.set('');
    this.resultado.set(null);

    this.pagoS.aprobar({
      idsPagos: Array.from(this.seleccionados()),
      idCuentaBancaria: cuenta.codigo,
      formaPago: this.formaPago(),
      fechaPago: this.fechaPago() || undefined,
      idUsuario: this.appState.getIdUsuario(),
    }).subscribe({
      next: (resp) => {
        this.aprobando.set(false);
        this.resultado.set(resp);
        this.snackBar.open(resp.mensaje || 'Pagos aprobados', 'Cerrar', {
          duration: 5000,
          panelClass: ['snackbar-success'],
        });
        this.buscar();
      },
      error: (err) => {
        this.aprobando.set(false);
        // El backend rechaza el lote completo si un solo pago no está
        // POR_APROBAR y nombra cuáles — no resumir este mensaje.
        this.errorAprobar.set(mensajeDeError(err, 'No se pudo aprobar el lote'));
      },
    });
  }

  cerrarResultado(): void {
    this.resultado.set(null);
  }
}
