import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { empresaSesionCodigo } from '../../../../../shared/services/empresa-sesion';

import { PlanCuentaService } from '../../../../cnt/service/plan-cuenta.service';

import { CuentaContableRef, CuentaTipoAporte } from '../../../model/cuenta-tipo-aporte';
import { TipoAporte } from '../../../model/tipo-aporte';
import { CuentaTipoAporteService, ResultadoOperacionCtap } from '../../../service/cuenta-tipo-aporte.service';
import { TipoAporteService } from '../../../service/tipo-aporte.service';

type Modo = 'lista' | 'crear' | 'editar';
type CampoCuenta = 'pasivo' | 'liquidacion';

/**
 * Prefijos de trabajo para poblar el selector sin traer el plan de cuentas completo (miles de
 * filas) — docs/crd/API-CUENTAS-TIPO-APORTE.md §3: "~10 candidatas entre las 2.1.xx y ~5 entre
 * las 2.3.01.xx". Es un punto de partida, no una restricción dura: "Buscar en todo el plan de
 * cuentas" (por número o por nombre) cubre cualquier cuenta fuera de este prefijo.
 */
const PREFIJO_PASIVO = '2.1';
const PREFIJO_LIQUIDACION = '2.3.01';

/**
 * Mantenimiento de `CRD.CTAP` — cuentas contables por tipo de aporte y empresa
 * (docs/crd/API-CUENTAS-TIPO-APORTE.md, contrato congelado).
 *
 * Sin selector de empresa a propósito (mismo criterio que `cierre-cartera`/`bandas-cartera`):
 * la empresa de la sesión es la única que existe hoy (`EMPRESA = 1236` en login.component.ts).
 *
 * Sin `DELETE`: baja lógica (`desactivar`/`activar`) — una fila borrada perdería el rastro de
 * con qué cuenta se contabilizó lo que ya se contabilizó (§3 del contrato).
 */
@Component({
  selector: 'app-cuentas-tipo-aporte',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './cuentas-tipo-aporte.component.html',
  styleUrl: './cuentas-tipo-aporte.component.scss',
})
export class CuentasTipoAporteComponent {
  private ctapService = inject(CuentaTipoAporteService);
  private tipoAporteService = inject(TipoAporteService);
  private planCuentaService = inject(PlanCuentaService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  idEmpresa: number | null = null;

  cargando = signal(false);
  filas = signal<CuentaTipoAporte[]>([]);
  soloActivas = signal(true);

  filasVisibles = computed(() => {
    const soloActivas = this.soloActivas();
    return this.filas().filter((f) => !soloActivas || Number(f.estado) === 1);
  });

  // ---- alta / edición ----
  modo = signal<Modo>('lista');
  filaEnEdicion: CuentaTipoAporte | null = null;

  tiposAporte = signal<TipoAporte[]>([]);
  /** Solo se elige al CREAR — al editar, tipoAporte no cambia (el PUT lo ignora). */
  tipoAporteSeleccionado = signal<TipoAporte | null>(null);

  cuentaPasivoSeleccionada = signal<CuentaContableRef | null>(null);
  cuentaLiquidacionSeleccionada = signal<CuentaContableRef | null>(null);

  candidatosPasivo = signal<CuentaContableRef[]>([]);
  candidatosLiquidacion = signal<CuentaContableRef[]>([]);
  cargandoPasivo = signal(false);
  cargandoLiquidacion = signal(false);
  filtroPasivo = '';
  filtroLiquidacion = '';

  candidatosPasivoFiltrados = computed(() => this.filtrarCandidatos(this.candidatosPasivo(), this.filtroPasivo));
  candidatosLiquidacionFiltrados = computed(() => this.filtrarCandidatos(this.candidatosLiquidacion(), this.filtroLiquidacion));

  guardando = signal(false);
  procesandoCodigo = signal<number | null>(null);

  puedeGuardar = computed(() => {
    if (this.guardando()) return false;
    if (this.modo() === 'crear' && !this.tipoAporteSeleccionado()) return false;
    return !!this.cuentaPasivoSeleccionada() && !!this.cuentaLiquidacionSeleccionada();
  });

  constructor() {
    this.idEmpresa = empresaSesionCodigo();
    if (this.idEmpresa == null) return;
    this.cargarTiposAporte();
    this.cargar();
  }

  cargar(): void {
    if (this.idEmpresa == null) return;
    this.cargando.set(true);
    this.ctapService.getAll().subscribe((lista) => {
      this.cargando.set(false);
      // getAll trae TODAS las empresas — acá solo mostramos la de la sesión.
      this.filas.set(lista.filter((f) => f.empresa?.codigo === this.idEmpresa));
    });
  }

  private cargarTiposAporte(): void {
    this.tipoAporteService.getAll().subscribe({
      next: (tipos) => this.tiposAporte.set(tipos ?? []),
      error: () => this.tiposAporte.set([]),
    });
  }

  // ================= alta / edición =================

  abrirCrear(): void {
    this.modo.set('crear');
    this.filaEnEdicion = null;
    // A propósito SIN precargar nada — el operador decide el tipo de aporte (§3 del contrato).
    this.tipoAporteSeleccionado.set(null);
    this.cuentaPasivoSeleccionada.set(null);
    this.cuentaLiquidacionSeleccionada.set(null);
    this.filtroPasivo = '';
    this.filtroLiquidacion = '';
    this.cargarCandidatosPorPrefijo('pasivo', PREFIJO_PASIVO);
    this.cargarCandidatosPorPrefijo('liquidacion', PREFIJO_LIQUIDACION);
  }

  abrirEditar(fila: CuentaTipoAporte): void {
    this.modo.set('editar');
    this.filaEnEdicion = fila;
    this.tipoAporteSeleccionado.set(null);
    this.cuentaPasivoSeleccionada.set(fila.cuentaPasivo);
    this.cuentaLiquidacionSeleccionada.set(fila.cuentaLiquidacion);
    this.filtroPasivo = '';
    this.filtroLiquidacion = '';
    this.cargarCandidatosPorPrefijo('pasivo', PREFIJO_PASIVO);
    this.cargarCandidatosPorPrefijo('liquidacion', PREFIJO_LIQUIDACION);
  }

  cancelarEdicion(): void {
    this.modo.set('lista');
    this.filaEnEdicion = null;
  }

  seleccionarCuenta(campo: CampoCuenta, cuenta: CuentaContableRef): void {
    if (campo === 'pasivo') this.cuentaPasivoSeleccionada.set(cuenta);
    else this.cuentaLiquidacionSeleccionada.set(cuenta);
  }

  etiquetaCuenta(cuenta: CuentaContableRef | null | undefined): string {
    if (!cuenta) return '—';
    return `${cuenta.cuentaContable ?? '—'} — ${cuenta.nombre ?? ''}`;
  }

  private filtrarCandidatos(lista: CuentaContableRef[], texto: string): CuentaContableRef[] {
    const q = texto.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter(
      (c) => (c.cuentaContable ?? '').toLowerCase().includes(q) || (c.nombre ?? '').toLowerCase().includes(q),
    );
  }

  /** Puebla el selector con las cuentas del prefijo de trabajo (número Y nombre después se filtran en el cliente). */
  private cargarCandidatosPorPrefijo(campo: CampoCuenta, prefijo: string): void {
    const cargando = campo === 'pasivo' ? this.cargandoPasivo : this.cargandoLiquidacion;
    const destino = campo === 'pasivo' ? this.candidatosPasivo : this.candidatosLiquidacion;

    const criterioNumero = new DatosBusqueda();
    criterioNumero.asignaUnCampoSinTrunc(TipoDatosBusqueda.STRING, 'cuentaContable', prefijo, TipoComandosBusqueda.LIKE);
    const criterioEstado = new DatosBusqueda();
    criterioEstado.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'estado', '1', TipoComandosBusqueda.IGUAL);

    cargando.set(true);
    this.planCuentaService.selectByCriteria([criterioNumero, criterioEstado]).subscribe({
      next: (cuentas) => {
        cargando.set(false);
        destino.set((cuentas ?? []).map((c) => ({ codigo: c.codigo, cuentaContable: c.cuentaContable, nombre: c.nombre })));
      },
      error: () => {
        cargando.set(false);
        destino.set([]);
      },
    });
  }

  /**
   * Búsqueda ampliada (número O nombre) fuera del prefijo de trabajo — dos llamadas de un solo
   * campo cada una, combinadas en el cliente. Evita depender de un OR de dos campos en
   * `DatosBusqueda` que no se puede probar acá contra el backend real.
   */
  buscarEnTodoElPlan(campo: CampoCuenta): void {
    const texto = (campo === 'pasivo' ? this.filtroPasivo : this.filtroLiquidacion).trim();
    if (texto.length < 3) {
      this.snackBar.open('Escriba al menos 3 caracteres para buscar en todo el plan de cuentas.', 'Cerrar', { duration: 3500 });
      return;
    }

    const cargando = campo === 'pasivo' ? this.cargandoPasivo : this.cargandoLiquidacion;
    const destino = campo === 'pasivo' ? this.candidatosPasivo : this.candidatosLiquidacion;

    const dbNumero = new DatosBusqueda();
    dbNumero.asignaUnCampoSinTrunc(TipoDatosBusqueda.STRING, 'cuentaContable', texto, TipoComandosBusqueda.LIKE);
    const dbNombre = new DatosBusqueda();
    dbNombre.asignaUnCampoSinTrunc(TipoDatosBusqueda.STRING, 'nombre', texto, TipoComandosBusqueda.LIKE);

    cargando.set(true);
    forkJoin([
      this.planCuentaService.selectByCriteria([dbNumero]),
      this.planCuentaService.selectByCriteria([dbNombre]),
    ]).subscribe({
      next: ([porNumero, porNombre]) => {
        cargando.set(false);
        const mapa = new Map<number, CuentaContableRef>();
        for (const c of [...(porNumero ?? []), ...(porNombre ?? [])]) {
          if (Number(c.estado) === 1) mapa.set(c.codigo, { codigo: c.codigo, cuentaContable: c.cuentaContable, nombre: c.nombre });
        }
        if (mapa.size === 0) {
          this.snackBar.open('No se encontraron cuentas activas con ese texto.', 'Cerrar', { duration: 4000 });
        }
        destino.set(Array.from(mapa.values()));
      },
      error: () => {
        cargando.set(false);
        this.snackBar.open('No se pudo buscar en el plan de cuentas.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  // ================= guardar =================

  /**
   * ⚠️ Advertencia EXPLÍCITA, no una nota al pie (§3 del contrato): la cuenta de liquidación
   * tiene que coincidir con la del producto de pago de CXP o los dos asientos cuadran contra
   * cuentas distintas sin que nada lo detecte — no hay validación cruzada del lado del backend
   * (decisión: son configuraciones independientes de dos módulos). Esta pantalla es la única
   * defensa, así que el operador tiene que confirmar habiéndola leído, no solo verla de pasada.
   */
  guardar(): void {
    if (!this.puedeGuardar()) return;

    const datosDialogo: ConfirmDialogData = {
      title: 'Confirmar cuenta de liquidación',
      message:
        'La cuenta de liquidación tiene que ser EXACTAMENTE la misma que usa el producto de pago de Cuentas por Pagar ' +
        'para este tipo de aporte. Si no coinciden, el asiento de CRD acredita una cuenta y el de CXP debita otra — y ' +
        'los dos asientos cuadran igual, sin que nada lo detecte. Verifíquelo contra el producto de pago antes de continuar.',
      confirmText: 'Ya lo verifiqué, guardar',
      cancelText: 'Cancelar',
      type: 'warning',
      details: [
        { label: 'Cuenta de pasivo (DEBE)', value: this.etiquetaCuenta(this.cuentaPasivoSeleccionada()) },
        { label: 'Cuenta de liquidación (HABER)', value: this.etiquetaCuenta(this.cuentaLiquidacionSeleccionada()) },
      ],
    };

    this.dialog
      .open(ConfirmDialogComponent, { data: datosDialogo, width: '560px', autoFocus: false })
      .afterClosed()
      .subscribe((confirmado?: boolean) => {
        if (!confirmado) return;
        this.enviarGuardado();
      });
  }

  private enviarGuardado(): void {
    const cuentaPasivo = this.cuentaPasivoSeleccionada();
    const cuentaLiquidacion = this.cuentaLiquidacionSeleccionada();
    if (!cuentaPasivo || !cuentaLiquidacion || this.idEmpresa == null) return;

    this.guardando.set(true);

    if (this.modo() === 'crear') {
      const tipoAporte = this.tipoAporteSeleccionado();
      if (!tipoAporte) {
        this.guardando.set(false);
        return;
      }
      this.ctapService
        .crear({
          tipoAporte: { codigo: tipoAporte.codigo },
          empresa: { codigo: this.idEmpresa },
          cuentaPasivo: { codigo: cuentaPasivo.codigo },
          cuentaLiquidacion: { codigo: cuentaLiquidacion.codigo },
        })
        .subscribe((resp) => this.terminarGuardado(resp, 'Configuración creada correctamente.'));
      return;
    }

    const fila = this.filaEnEdicion;
    if (!fila?.codigo) {
      this.guardando.set(false);
      return;
    }
    // Solo las dos cuentas — tipoAporte/empresa/estado NO se mandan: el PUT los ignora (§2 del
    // contrato) y el tipo de la solicitud ya los excluye, no por descuido.
    this.ctapService
      .editar({
        codigo: fila.codigo,
        cuentaPasivo: { codigo: cuentaPasivo.codigo },
        cuentaLiquidacion: { codigo: cuentaLiquidacion.codigo },
      })
      .subscribe((resp) => this.terminarGuardado(resp, 'Configuración actualizada correctamente.'));
  }

  private terminarGuardado(resp: ResultadoOperacionCtap<CuentaTipoAporte>, mensajeExito: string): void {
    this.guardando.set(false);
    if (!resp.exito) {
      this.snackBar.open(resp.mensaje ?? 'No se pudo guardar la configuración.', 'Cerrar', { duration: 7000 });
      return;
    }
    this.snackBar.open(mensajeExito, 'Cerrar', { duration: 4000 });
    this.cancelarEdicion();
    this.cargar();
  }

  // ================= activar / desactivar =================

  desactivar(fila: CuentaTipoAporte): void {
    if (!fila.codigo || this.procesandoCodigo() != null) return;

    const datosDialogo: ConfirmDialogData = {
      title: 'Desactivar configuración',
      message:
        `¿Desactivar la configuración de "${fila.tipoAporte?.nombre ?? 'este tipo de aporte'}"? ` +
        'Un tipo de aporte sin fila activa NO se puede devolver: el proceso de devolución lo va a rechazar hasta ' +
        'que se reactive esta fila o se cree otra.',
      confirmText: 'Desactivar',
      cancelText: 'Cancelar',
      type: 'danger',
    };

    this.dialog
      .open(ConfirmDialogComponent, { data: datosDialogo, width: '520px', autoFocus: false })
      .afterClosed()
      .subscribe((confirmado?: boolean) => {
        if (!confirmado) return;
        this.procesandoCodigo.set(fila.codigo!);
        this.ctapService
          .desactivar(fila.codigo!)
          .subscribe((resp) => this.terminarActivarDesactivar(resp, 'Configuración desactivada.'));
      });
  }

  activar(fila: CuentaTipoAporte): void {
    if (!fila.codigo || this.procesandoCodigo() != null) return;
    this.procesandoCodigo.set(fila.codigo);
    this.ctapService.activar(fila.codigo).subscribe((resp) => this.terminarActivarDesactivar(resp, 'Configuración reactivada.'));
  }

  private terminarActivarDesactivar(resp: ResultadoOperacionCtap<CuentaTipoAporte>, mensajeExito: string): void {
    this.procesandoCodigo.set(null);
    if (!resp.exito) {
      this.snackBar.open(resp.mensaje ?? 'No se pudo completar la operación.', 'Cerrar', { duration: 7000 });
      return;
    }
    this.snackBar.open(mensajeExito, 'Cerrar', { duration: 4000 });
    this.cargar();
  }
}
