import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { CuentaBancaria } from '../../../../tsr/model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../../tsr/service/cuenta-bancaria.service';
import {
  ConciliarPlanillaIessResponse,
  DetallePlanillaIess,
  EstadoPlanillaIess,
  PlanillaIess,
  TipoPlanillaIess,
} from '../../../model/planilla-iess';
import { PeriodoNomina } from '../../../model/periodo-nomina';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import { PlanillaIessService } from '../../../service/planilla-iess.service';
import { mensajeDeError } from '../../comunes/mensajes';
import { aniosDisponibles, criteriosPorEmpresa, filtrarPorAnio } from '../../parametrizacion/utiles-parametrizacion';
import { opcionesAviso } from '../../comunes/avisos';
import { MotivoDialogComponent } from '../periodo-nomina/motivo-dialog.component';
import {
  PagarPlanillaDialogComponent,
  PagarPlanillaDialogResult,
} from './pagar-planilla-dialog.component';
import {
  RegistrarPlanillaDialogComponent,
  RegistrarPlanillaDialogResult,
} from './registrar-planilla-dialog.component';

/** Una fila fija de la pantalla: el tipo, y la planilla del período si ya se registró. */
interface FilaTipo {
  tipo: number;
  tipoLabel: string;
  planilla: PlanillaIess | null;
}

/**
 * Planillas del IESS (`docs/rrh/API-PLANILLA-IESS.md` §7.b): registrar el comprobante que emite
 * el portal, conciliarlo contra la planilla de control (ítem 5), y pagar por tesorería.
 *
 * **Por qué son cuatro filas fijas y no una lista.** El IESS emite hasta cuatro comprobantes por
 * período —rol normal, quirografarios, hipotecarios, fondos de reserva—, cada uno con su propio
 * ciclo. Mostrarlas como filas fijas deja ver de un vistazo cuáles faltan por registrar, en vez de
 * obligar a recordar qué tipos existen.
 *
 * **Por qué "Pagar" no dice "enviar pago".** El IESS cobra por débito automático: cuando esta
 * pantalla se usa, el banco ya debitó. "Pagar" aquí es dejar constancia del hecho —cuenta y fecha
 * reales— para que tesorería concilie el extracto, no una orden que se despacha.
 */
@Component({
  selector: 'app-planillas-iess',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './planillas-iess.component.html',
  styleUrls: ['./planillas-iess.component.scss'],
})
export class PlanillasIessComponent implements OnInit {
  readonly EstadoPlanillaIess = EstadoPlanillaIess;

  readonly anios = aniosDisponibles();
  readonly anio = signal<number>(new Date().getFullYear());
  readonly periodos = signal<PeriodoNomina[]>([]);
  readonly periodoSeleccionado = signal<number | null>(null);

  readonly cargando = signal<boolean>(false);
  readonly filas = signal<FilaTipo[]>([]);

  /** Código de planilla sobre la que hay una acción en curso: deshabilita sus botones. */
  readonly procesando = signal<number | null>(null);

  /** Tipo (rubro 330) que se está registrando: todavía no tiene código de planilla. */
  readonly registrandoTipo = signal<number | null>(null);

  /** Renglones ya traídos con `getId`, por código de planilla — se piden una sola vez por fila. */
  readonly renglonesPorPlanilla = signal<Map<number, DetallePlanillaIess[]>>(new Map());
  readonly expandido = signal<Set<number>>(new Set());

  /** El resultado de conciliar queda visible en la fila hasta que se navega a otro período. */
  readonly resultadoConciliacion = signal<Map<number, ConciliarPlanillaIessResponse>>(new Map());

  private cuentasBancarias: CuentaBancaria[] = [];

  private readonly TIPOS_ORDEN = [
    TipoPlanillaIess.ROL_NORMAL,
    TipoPlanillaIess.PRESTAMOS_QUIROGRAFARIOS,
    TipoPlanillaIess.PRESTAMOS_HIPOTECARIOS,
    TipoPlanillaIess.FONDOS_DE_RESERVA,
  ];

  constructor(
    private periodoService: PeriodoNominaService,
    private planillaIessS: PlanillaIessService,
    private cuentaBancariaS: CuentaBancariaService,
    private detalleRubroService: DetalleRubroService,
    private funcionesDatosS: FuncionesDatosService,
    private appState: AppStateService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarPeriodos();
    this.cargarCuentasBancarias();
  }

  // ─── Período ───────────────────────────────────────────────────────────────

  onAnioChange(anio: number): void {
    this.anio.set(anio);
    this.periodoSeleccionado.set(null);
    this.limpiar();
    this.cargarPeriodos();
  }

  onPeriodoChange(codigo: number | null): void {
    this.periodoSeleccionado.set(codigo);
    this.limpiar();
    if (codigo !== null) this.cargar();
  }

  private cargarPeriodos(): void {
    this.periodoService.selectByCriteria(criteriosPorEmpresa('mes')).subscribe({
      next: (filas) => this.periodos.set(filtrarPorAnio(filas ?? [], this.anio())),
      error: (err) => {
        this.periodos.set([]);
        this.avisar(mensajeDeError(err, 'No se pudieron cargar los períodos.'), true);
      },
    });
  }

  etiquetaPeriodo(periodo: PeriodoNomina): string {
    return `${String(periodo.mes).padStart(2, '0')}/${periodo.anio}`;
  }

  private get periodo(): PeriodoNomina | null {
    return this.periodos().find((p) => p.codigo === this.periodoSeleccionado()) ?? null;
  }

  private cargarCuentasBancarias(): void {
    const idEmpresa = this.appState.getEmpresa()?.codigo;
    this.cuentaBancariaS.getAll().subscribe({
      next: (data) => {
        let lista = Array.isArray(data) ? data : [];
        lista = lista.filter((c) => Number(c.estado) === 1);
        if (idEmpresa) {
          lista = lista.filter(
            (c: any) => c.banco?.empresa?.codigo === idEmpresa || c.empresa?.codigo === idEmpresa,
          );
        }
        this.cuentasBancarias = lista;
      },
      error: () => (this.cuentasBancarias = []),
    });
  }

  // ─── Carga de las planillas del período ─────────────────────────────────────

  private cargar(): void {
    const idPeriodo = this.periodoSeleccionado();
    if (idPeriodo === null) return;

    this.cargando.set(true);
    this.planillaIessS.porPeriodo(idPeriodo).subscribe({
      next: (planillas) => {
        this.cargando.set(false);
        this.armarFilas(planillas ?? []);
      },
      error: (err) => {
        this.cargando.set(false);
        this.filas.set([]);
        this.avisar(mensajeDeError(err, 'No se pudieron cargar las planillas del período.'), true);
      },
    });
  }

  private armarFilas(planillas: PlanillaIess[]): void {
    // Una planilla anulada no bloquea un nuevo registro del mismo tipo (el backend sólo exige que
    // no exista ya una ACTIVA): si hay más de una para el mismo tipo, se muestra la vigente
    // (la que no está anulada), y si todas están anuladas, la más reciente por código.
    const porTipo = new Map<number, PlanillaIess>();
    for (const p of planillas) {
      const tipo = Number(p.tipo);
      const actual = porTipo.get(tipo);
      if (!actual) {
        porTipo.set(tipo, p);
        continue;
      }
      const actualAnulada = Number(actual.estado) === EstadoPlanillaIess.ANULADA;
      const nuevaAnulada = Number(p.estado) === EstadoPlanillaIess.ANULADA;
      if (actualAnulada && !nuevaAnulada) porTipo.set(tipo, p);
      else if (actualAnulada === nuevaAnulada && p.codigo > actual.codigo) porTipo.set(tipo, p);
    }

    this.filas.set(
      this.TIPOS_ORDEN.map((tipo) => ({
        tipo,
        tipoLabel: this.etiquetaTipo(tipo),
        planilla: this.normalizarPlanilla(porTipo.get(tipo) ?? null),
      })),
    );
  }

  private normalizarPlanilla(p: PlanillaIess | null): PlanillaIess | null {
    if (!p) return null;
    return {
      ...p,
      fechaEmision: this.funcionesDatosS.convertirFechaDesdeBackend(p.fechaEmision),
      fechaMaximaPago: this.funcionesDatosS.convertirFechaDesdeBackend(p.fechaMaximaPago),
      fechaPago: p.fechaPago ? this.funcionesDatosS.convertirFechaDesdeBackend(p.fechaPago) : null,
    };
  }

  etiquetaTipo(tipo: number): string {
    return this.detalleRubroService.getDescripcionByParentAndAlterno(RubrosRrh.TIPO_PLANILLA_IESS, tipo) || `Tipo ${tipo}`;
  }

  etiquetaConcepto(conceptoTipo: number | null | undefined): string {
    if (conceptoTipo === null || conceptoTipo === undefined) return 'Sin clasificar';
    return this.detalleRubroService.getDescripcionByParentAndAlterno(RubrosRrh.CONCEPTO_PLANILLA_IESS, conceptoTipo) || `Concepto ${conceptoTipo}`;
  }

  etiquetaEstado(estado: number | undefined): string {
    switch (Number(estado)) {
      case EstadoPlanillaIess.REGISTRADA: return 'Registrada';
      case EstadoPlanillaIess.CONCILIADA: return 'Conciliada';
      case EstadoPlanillaIess.PAGADA: return 'Pagada';
      case EstadoPlanillaIess.ANULADA: return 'Anulada';
      default: return '—';
    }
  }

  private limpiar(): void {
    this.filas.set([]);
    this.renglonesPorPlanilla.set(new Map());
    this.expandido.set(new Set());
    this.resultadoConciliacion.set(new Map());
  }

  // ─── Detalle (renglones) ─────────────────────────────────────────────────────

  estaExpandido(codigo: number): boolean {
    return this.expandido().has(codigo);
  }

  toggleDetalle(planilla: PlanillaIess): void {
    const set = new Set(this.expandido());
    if (set.has(planilla.codigo)) {
      set.delete(planilla.codigo);
      this.expandido.set(set);
      return;
    }
    set.add(planilla.codigo);
    this.expandido.set(set);

    if (this.renglonesPorPlanilla().has(planilla.codigo)) return;
    this.planillaIessS.getId(planilla.codigo).subscribe({
      next: (completa) => {
        const mapa = new Map(this.renglonesPorPlanilla());
        mapa.set(planilla.codigo, completa?.renglones ?? []);
        this.renglonesPorPlanilla.set(mapa);
      },
      error: (err) => this.avisar(mensajeDeError(err, 'No se pudieron cargar los renglones.'), true),
    });
  }

  renglonesDe(codigo: number): DetallePlanillaIess[] {
    return this.renglonesPorPlanilla().get(codigo) ?? [];
  }

  // ─── Registrar ───────────────────────────────────────────────────────────────

  registrar(fila: FilaTipo): void {
    const idEmpresa = this.appState.getEmpresa()?.codigo;
    const periodo = this.periodo;
    if (!idEmpresa || !periodo) return;

    this.dialog
      .open(RegistrarPlanillaDialogComponent, {
        width: '820px',
        maxWidth: '96vw',
        data: { tipo: fila.tipo, tipoLabel: fila.tipoLabel },
      })
      .afterClosed()
      .subscribe((resultado: RegistrarPlanillaDialogResult | null) => {
        if (!resultado) return;

        this.registrandoTipo.set(fila.tipo);
        this.planillaIessS
          .registrar({
            idEmpresa,
            idPeriodo: periodo.codigo,
            tipo: fila.tipo,
            ...resultado,
            idUsuario: this.appState.getIdUsuario(),
          })
          .subscribe({
            next: () => {
              this.registrandoTipo.set(null);
              this.avisar('Planilla registrada.');
              this.cargar();
            },
            error: (err) => {
              this.registrandoTipo.set(null);
              this.avisar(mensajeDeError(err, 'No se pudo registrar la planilla.'), true);
            },
          });
      });
  }

  // ─── Conciliar ───────────────────────────────────────────────────────────────

  conciliar(planilla: PlanillaIess): void {
    this.procesando.set(planilla.codigo);
    this.planillaIessS.conciliar(planilla.codigo, this.appState.getIdUsuario()).subscribe({
      next: (resultado) => {
        this.procesando.set(null);
        const mapa = new Map(this.resultadoConciliacion());
        mapa.set(planilla.codigo, resultado);
        this.resultadoConciliacion.set(mapa);
        this.avisar(resultado.mensaje);
        this.cargar();
        // El detalle recién conciliado ya trae valorControl/diferencia: se refresca el caché de
        // renglones para no dejar en pantalla los que se pidieron antes de conciliar.
        const rmapa = new Map(this.renglonesPorPlanilla());
        rmapa.set(planilla.codigo, resultado.renglones as DetallePlanillaIess[]);
        this.renglonesPorPlanilla.set(rmapa);
        const set = new Set(this.expandido());
        set.add(planilla.codigo);
        this.expandido.set(set);
      },
      error: (err) => {
        this.procesando.set(null);
        this.avisar(mensajeDeError(err, 'No se pudo conciliar la planilla.'), true);
      },
    });
  }

  // ─── Pagar ───────────────────────────────────────────────────────────────────

  pagar(planilla: PlanillaIess): void {
    this.dialog
      .open(PagarPlanillaDialogComponent, {
        width: '520px',
        maxWidth: '96vw',
        data: {
          tipoLabel: this.etiquetaTipo(planilla.tipo),
          numeroComprobante: planilla.numeroComprobante,
          valorIess: planilla.valorIess,
          cuentas: this.cuentasBancarias,
        },
      })
      .afterClosed()
      .subscribe((resultado: PagarPlanillaDialogResult | null) => {
        if (!resultado) return;

        this.procesando.set(planilla.codigo);
        this.planillaIessS
          .pagar(planilla.codigo, { ...resultado, idUsuario: this.appState.getIdUsuario() })
          .subscribe({
            next: (respuesta) => {
              this.procesando.set(null);
              this.avisar(respuesta.mensaje || 'Pago registrado.');
              this.cargar();
            },
            error: (err) => {
              this.procesando.set(null);
              this.avisar(mensajeDeError(err, 'No se pudo registrar el pago.'), true);
            },
          });
      });
  }

  // ─── Reversar pago / anular ──────────────────────────────────────────────────

  reversarPago(planilla: PlanillaIess): void {
    this.dialog
      .open(MotivoDialogComponent, {
        data: {
          titulo: `Reversar el pago de la planilla N.° ${planilla.numeroComprobante}`,
          etiqueta: 'Motivo de la reversión',
        },
        autoFocus: 'dialog',
      })
      .afterClosed()
      .subscribe((motivo: string | null) => {
        if (!motivo) return;

        this.procesando.set(planilla.codigo);
        this.planillaIessS
          .reversarPago(planilla.codigo, { motivo, idUsuario: this.appState.getIdUsuario() })
          .subscribe({
            next: () => {
              this.procesando.set(null);
              this.avisar('Pago reversado: la planilla vuelve a Conciliada.');
              this.cargar();
            },
            error: (err) => {
              this.procesando.set(null);
              this.avisar(mensajeDeError(err, 'No se pudo reversar el pago.'), true);
            },
          });
      });
  }

  anular(planilla: PlanillaIess): void {
    this.dialog
      .open(MotivoDialogComponent, {
        data: {
          titulo: `Anular la planilla N.° ${planilla.numeroComprobante}`,
          etiqueta: 'Motivo de la anulación',
        },
        autoFocus: 'dialog',
      })
      .afterClosed()
      .subscribe((motivo: string | null) => {
        if (!motivo) return;

        this.procesando.set(planilla.codigo);
        this.planillaIessS.anular(planilla.codigo, { motivo, idUsuario: this.appState.getIdUsuario() }).subscribe({
          next: () => {
            this.procesando.set(null);
            this.avisar('Planilla anulada.');
            this.cargar();
          },
          error: (err) => {
            this.procesando.set(null);
            this.avisar(mensajeDeError(err, 'No se pudo anular la planilla.'), true);
          },
        });
      });
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      ...opcionesAviso(esError, mensaje),
    });
  }
}
