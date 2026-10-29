import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { UsuarioService } from '../../../../shared/services/usuario.service';
import {
  CierreCartera,
  CorridaCierreCartera,
  ESTADO_CORRIDA,
  NOMBRE_ESTADO_CORRIDA,
  SolicitudCierreCartera,
  SubProcesoCierre,
  TIPO_CARTERA_CIERRE,
  corridasVigentesPorMes,
} from '../../model/cierre-cartera/cierre-cartera.model';
import { CierreCarteraService } from '../../service/cierre-cartera.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Permisos } from '../../../../shared/model/permisos';
import { PermisosService } from '../../../../shared/services/permisos.service';
import {
  MotivoCierreDialogComponent,
  MotivoCierreDialogData,
  MotivoCierreDialogResult,
} from '../../../cnt/dialog/motivo-cierre-dialog/motivo-cierre-dialog.component';
import { Periodo } from '../../../cnt/model/periodo';
import { periodoCerrado } from '../../../cnt/service/cierre-periodo.service';
import { PeriodoService } from '../../../cnt/service/periodo.service';

/** C17 — un mes CERRADO para cartera, con el estado contable del mes y del siguiente. */
interface FilaEstadoCartera {
  clave: number;
  anio: number;
  mes: number;
  corrida: CorridaCierreCartera;
  /** null si el período contable no existe. */
  contableCerrado: boolean | null;
  contableSiguienteCerrado: boolean | null;
}

/** De dónde salió el resultado que se está mostrando: cambia el encabezado y las acciones. */
type OrigenResultado = 'previsualizacion' | 'ejecucion' | 'consulta';

/** Tolerancia de cuadre para el indicador visual D = H (el backend usa 0.5 en plantillas). */
const TOLERANCIA_CUADRE = 0.005;

const MESES = [
  { valor: 1, nombre: 'Enero' },
  { valor: 2, nombre: 'Febrero' },
  { valor: 3, nombre: 'Marzo' },
  { valor: 4, nombre: 'Abril' },
  { valor: 5, nombre: 'Mayo' },
  { valor: 6, nombre: 'Junio' },
  { valor: 7, nombre: 'Julio' },
  { valor: 8, nombre: 'Agosto' },
  { valor: 9, nombre: 'Septiembre' },
  { valor: 10, nombre: 'Octubre' },
  { valor: 11, nombre: 'Noviembre' },
  { valor: 12, nombre: 'Diciembre' },
];

/**
 * Pantalla del cierre mensual de cartera (Fase 2).
 *
 * Flujo: elegir período → previsualizar → revisar → ejecutar → consultar → (si hace falta)
 * reversar. Las tres fechas y los rangos/asientos los calcula el backend; la pantalla los
 * muestra. Contrato: docs/crd/API-CIERRE-CARTERA.md.
 */
@Component({
  selector: 'app-cierre-cartera',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule,
  ],
  templateUrl: './cierre-cartera.component.html',
  styleUrl: './cierre-cartera.component.scss',
})
export class CierreCarteraComponent implements OnInit {
  readonly ESTADO_CORRIDA = ESTADO_CORRIDA;
  readonly MESES = MESES;

  /**
   * El combo muestra "Cierre Jul / Apertura Ago" en vez de solo "Julio": el proceso cierra un
   * mes Y abre el siguiente en el mismo acto, y los asientos que genera salen con DOS fechas
   * distintas (casi todos con el último día del mes que se cierra, el de apertura con el día 1
   * del siguiente) — con el combo mostrando un solo mes no se entendía cuál de los dos era
   * (pedido explícito del usuario, 2026-08-31).
   *
   * ⚠️ Cambia SOLO la etiqueta. El valor que viaja en `SolicitudCierreCartera` sigue siendo el
   * mes/año que se CIERRA (el primero de los dos) — ver `construirSolicitud()`. Tocar esa
   * semántica correría todos los asientos un mes, en silencio.
   *
   * En diciembre, "Apertura" cae en el año siguiente — la etiqueta lo muestra (`Cierre Dic 2026 /
   * Apertura Ene 2027`) solo ahí, que es el único caso donde el año podría no ser obvio.
   */
  get opcionesMes(): { valor: number; etiqueta: string }[] {
    return MESES.map((m) => {
      const esDiciembre = m.valor === 12;
      const siguiente = esDiciembre ? MESES[0] : MESES[m.valor];
      const sufijoCierre = esDiciembre ? ` ${this.anio}` : '';
      const sufijoApertura = esDiciembre ? ` ${this.anio + 1}` : '';
      return {
        valor: m.valor,
        etiqueta: `Cierre ${this.abreviarMes(m.nombre)}${sufijoCierre} / Apertura ${this.abreviarMes(siguiente.nombre)}${sufijoApertura}`,
      };
    });
  }

  private abreviarMes(nombre: string): string {
    return nombre.slice(0, 3);
  }

  private cierreService = inject(CierreCarteraService);
  private usuarioService = inject(UsuarioService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private periodoService = inject(PeriodoService);
  private permisosService = inject(PermisosService);

  // Estado de cartera por mes (C17)
  estadoMeses = signal<FilaEstadoCartera[]>([]);
  cargandoEstado = signal(false);

  // Contexto de sesión
  idEmpresa: number | null = null;
  private usuarioAuditoria: string | null = null;

  // Selección de período
  anio = 2026;
  mes = 8;

  // Estado de operaciones
  previsualizando = signal(false);
  ejecutando = signal(false);
  consultando = signal(false);
  reversando = signal(false);
  cargandoCorridas = signal(false);

  // Resultado actual (previsualización, ejecución o consulta)
  resultado = signal<CierreCartera | null>(null);
  origen = signal<OrigenResultado | null>(null);
  error = signal<string | null>(null);

  // Historial
  corridas = signal<CorridaCierreCartera[]>([]);
  mostrarHistorial = signal(false);

  // Snapshot colapsable (son ~143 filas)
  mostrarSnapshot = signal(false);

  ngOnInit(): void {
    this.resolverContextoSesion();
    if (this.idEmpresa == null) {
      this.error.set(
        'No se pudo determinar la empresa de la sesión. Vuelva a iniciar sesión y reintente.',
      );
    } else {
      this.cargarEstadoMeses();
    }
  }

  private resolverContextoSesion(): void {
    const empresa = this.usuarioService.getEmpresaLog();
    if (empresa?.codigo) {
      this.idEmpresa = empresa.codigo;
    } else {
      const raw = sessionStorage.getItem('idEmpresa') ?? localStorage.getItem('idEmpresa');
      const codigo = raw ? parseInt(raw, 10) : NaN;
      this.idEmpresa = isNaN(codigo) ? null : codigo;
    }
    const usuario = this.usuarioService.getUsuarioLog();
    this.usuarioAuditoria = usuario?.nombre ?? sessionStorage.getItem('username') ?? null;
  }

  private construirSolicitud(): SolicitudCierreCartera {
    return {
      idEmpresa: this.idEmpresa as number,
      anio: this.anio,
      mes: this.mes,
      usuario: this.usuarioAuditoria,
      ip: null,
      observacion: `Cierre de ${this.nombreMes(this.mes)} ${this.anio}`,
    };
  }

  private get periodoTexto(): string {
    return `${this.nombreMes(this.mes)} ${this.anio}`;
  }

  // ===================== Previsualizar =====================

  previsualizar(): void {
    if (this.idEmpresa == null || this.ocupado()) {
      return;
    }
    this.error.set(null);
    this.previsualizando.set(true);
    this.cierreService.previsualizar(this.construirSolicitud()).subscribe({
      next: (res) => {
        this.previsualizando.set(false);
        this.resultado.set(res);
        this.origen.set('previsualizacion');
        this.mostrarSnapshot.set(false);
      },
      error: (mensaje: string) => {
        this.previsualizando.set(false);
        this.resultado.set(null);
        this.origen.set(null);
        this.error.set(mensaje);
      },
    });
  }

  // ===================== Ejecutar =====================

  ejecutar(): void {
    const res = this.resultado();
    if (!res || this.origen() !== 'previsualizacion' || this.ocupado()) {
      return;
    }

    const detalles = res.subProcesos
      .filter((sp) => !sp.omitido)
      .map((sp) => ({
        label: `${sp.referencia} ${sp.nombre}`,
        value: `D = H = $${this.money(sp.totalDebe)}`,
      }));
    if (res.advertencias?.length) {
      detalles.push({ label: '⚠ Advertencias', value: `${res.advertencias.length} — revíselas antes de continuar` });
    }

    const data: ConfirmDialogData = {
      title: `Ejecutar cierre de ${this.periodoTexto}`,
      message:
        'Se grabará la corrida y se generarán los asientos contables de los sub-procesos ' +
        'listados. Esta acción contabiliza dinero real y solo se deshace reversando la corrida.',
      confirmText: 'Ejecutar y contabilizar',
      cancelText: 'Cancelar',
      type: 'warning',
      details: detalles,
    };

    this.dialog
      .open(ConfirmDialogComponent, { data, width: '560px' })
      .afterClosed()
      .subscribe((confirmado) => {
        if (confirmado) {
          this.ejecutarConfirmado();
        }
      });
  }

  private ejecutarConfirmado(): void {
    this.error.set(null);
    this.ejecutando.set(true);
    this.cierreService.ejecutar(this.construirSolicitud()).subscribe({
      next: (res) => {
        this.ejecutando.set(false);
        this.resultado.set(res);
        this.origen.set('ejecucion');
        this.notificar(
          `Cierre de ${this.periodoTexto} ejecutado. Corrida ${res.idCorrida ?? ''}.`,
          true,
        );
        this.cargarEstadoMeses();
      },
      error: (mensaje: string) => {
        this.ejecutando.set(false);
        this.error.set(mensaje);
        this.notificar(mensaje, false);
      },
    });
  }

  // ===================== Consultar =====================

  consultar(): void {
    if (this.idEmpresa == null || this.ocupado()) {
      return;
    }
    this.error.set(null);
    this.consultando.set(true);
    this.cierreService.consultar(this.idEmpresa, this.anio, this.mes).subscribe({
      next: (res) => {
        this.consultando.set(false);
        this.resultado.set(res);
        this.origen.set('consulta');
        this.mostrarSnapshot.set(false);
      },
      error: (mensaje: string) => {
        this.consultando.set(false);
        this.resultado.set(null);
        this.origen.set(null);
        this.error.set(mensaje);
      },
    });
  }

  // ===================== Estado de cartera por mes y reapertura (C17) =====================

  /**
   * Meses CERRADOS para cartera (corrida EJECUTADA vigente), del más reciente al más antiguo, con el estado
   * contable del mes y del siguiente (reabrir la cartera de M exige la contabilidad de M y de M+1 abierta).
   */
  cargarEstadoMeses(): void {
    if (this.idEmpresa == null) {
      return;
    }
    this.cargandoEstado.set(true);
    forkJoin({
      corridas: this.cierreService.corridas(this.idEmpresa),
      periodos: this.periodoService.getAll().pipe(catchError(() => of([] as Periodo[]))),
    }).subscribe({
      next: ({ corridas, periodos }) => {
        this.cargandoEstado.set(false);
        this.corridas.set(corridas ?? []);
        const cerradoContable = new Map<number, boolean>();
        for (const p of periodos ?? []) {
          cerradoContable.set(p.anio * 100 + p.mes, periodoCerrado(p));
        }
        const filas: FilaEstadoCartera[] = [];
        corridasVigentesPorMes(corridas ?? []).forEach((corrida, clave) => {
          const siguiente = corrida.mes === 12 ? (corrida.anio + 1) * 100 + 1 : clave + 1;
          filas.push({
            clave,
            anio: corrida.anio,
            mes: corrida.mes,
            corrida,
            contableCerrado: cerradoContable.get(clave) ?? null,
            contableSiguienteCerrado: cerradoContable.get(siguiente) ?? null,
          });
        });
        this.estadoMeses.set(filas.sort((a, b) => b.clave - a.clave));
      },
      error: (mensaje: string) => {
        this.cargandoEstado.set(false);
        this.estadoMeses.set([]);
        this.notificar(mensaje, false);
      },
    });
  }

  /** Clave anio*100+mes del último mes cerrado para cartera. */
  get ultimoMesCerrado(): number | null {
    const filas = this.estadoMeses();
    return filas.length ? filas[0].clave : null;
  }

  puedeReabrirMes(f: FilaEstadoCartera): boolean {
    return f.clave === this.ultimoMesCerrado && !f.contableCerrado && !f.contableSiguienteCerrado && !this.ocupado();
  }

  razonNoReabrir(f: FilaEstadoCartera): string {
    if (f.clave !== this.ultimoMesCerrado) {
      return 'Solo se reabre el último mes cerrado (cascada desde el más reciente).';
    }
    if (f.contableCerrado) {
      return 'El período contable del mes está CERRADO: reábralo primero en Contabilidad > Cierre de Períodos.';
    }
    if (f.contableSiguienteCerrado) {
      return 'El período contable del mes siguiente está CERRADO: el cierre de cartera asienta también en él.';
    }
    return 'Reabrir la cartera del mes (reversa la corrida vigente)';
  }

  reabrirMes(f: FilaEstadoCartera): void {
    if (f.clave !== this.ultimoMesCerrado || this.ocupado()) {
      return;
    }
    this.permisosService.ejecutarSiPermitido(
      Permisos.CRD_REABRIR_CARTERA,
      () => this.confirmarReapertura(f),
      (mensaje) => this.notificar(mensaje.toUpperCase(), false),
    );
  }

  private confirmarReapertura(f: FilaEstadoCartera): void {
    const periodo = `${this.nombreMes(f.mes)} ${f.anio}`;
    const data: MotivoCierreDialogData = {
      titulo: `Reabrir la cartera de ${periodo}`,
      mensaje:
        `Se reversa la corrida ${f.corrida.codigo} del cierre de cartera de ${periodo}: el mes vuelve a quedar ` +
        'ABIERTO para cartera y se puede corregir y volver a cerrar.',
      advertencias: [
        'Se reversan TODOS los asientos contables generados por el cierre (los del último día del mes y los de ' +
          'apertura del día 1 del mes siguiente).',
        'Se anulan los movimientos del cierre (registros de asiento de la corrida) y la corrida queda REVERSADA.',
        'Los reportes G40–G51 / EJCC del mes no se pueden generar hasta volver a cerrar la cartera.',
        'Queda registrado con su motivo en la bitácora de cierres.',
      ],
      detalles: [
        { etiqueta: 'Corrida', valor: String(f.corrida.codigo) },
        { etiqueta: 'Corte', valor: this.formatoFechaArray(f.corrida.fechaCorte) },
        {
          etiqueta: 'Ejecutada',
          valor: `${this.formatoFechaHoraArray(f.corrida.fechaRegistro)} por ${f.corrida.usuarioRegistro || '—'}`,
        },
      ],
      textoConfirmar: 'Reabrir mes',
      color: 'warn',
      icono: 'lock_open',
      placeholderMotivo: 'Ej. Faltaba aplicar el retorno Petro de julio; autorizado por ...',
    };
    this.dialog
      .open(MotivoCierreDialogComponent, { data, width: '620px' })
      .afterClosed()
      .subscribe((r?: MotivoCierreDialogResult) => {
        if (r?.motivo) {
          this.reabrirConfirmado(f, r.motivo);
        }
      });
  }

  private reabrirConfirmado(f: FilaEstadoCartera, motivo: string): void {
    if (this.idEmpresa == null) {
      return;
    }
    this.error.set(null);
    this.reversando.set(true);
    this.cierreService
      .reabrir(this.idEmpresa, f.anio, f.mes, { usuario: this.usuarioAuditoria, ip: null, motivo })
      .subscribe({
        next: (res) => {
          this.reversando.set(false);
          this.notificar(
            `Cartera de ${this.nombreMes(f.mes)} ${f.anio} reabierta (corrida ${f.corrida.codigo} reversada).`,
            true,
          );
          this.cargarEstadoMeses();
          // Si se estaba mostrando esa corrida, refrescar con lo reversado.
          if (this.resultado()?.idCorrida === f.corrida.codigo) {
            this.resultado.set(res);
            this.origen.set('consulta');
          }
        },
        error: (mensaje: string) => {
          this.reversando.set(false);
          this.error.set(mensaje);
          this.notificar(mensaje, false);
        },
      });
  }

  esCorridaVigenteUltimoMes(c: CorridaCierreCartera): boolean {
    const f = this.estadoMeses()[0];
    return !!f && f.corrida.codigo === c.codigo;
  }

  // ===================== Historial =====================

  toggleHistorial(): void {
    const abrir = !this.mostrarHistorial();
    this.mostrarHistorial.set(abrir);
    if (abrir) {
      this.cargarCorridas();
    }
  }

  private cargarCorridas(): void {
    if (this.idEmpresa == null) {
      return;
    }
    this.cargandoCorridas.set(true);
    this.cierreService.corridas(this.idEmpresa).subscribe({
      next: (data) => {
        this.cargandoCorridas.set(false);
        this.corridas.set(data ?? []);
      },
      error: (mensaje: string) => {
        this.cargandoCorridas.set(false);
        this.corridas.set([]);
        this.notificar(mensaje, false);
      },
    });
  }

  // ===================== Derivados de vista =====================

  ocupado(): boolean {
    return (
      this.previsualizando() ||
      this.ejecutando() ||
      this.consultando() ||
      this.reversando()
    );
  }

  get puedeEjecutar(): boolean {
    return this.origen() === 'previsualizacion' && this.resultado() != null && !this.ocupado();
  }

  cuadra(sp: SubProcesoCierre): boolean {
    return Math.abs((sp.totalDebe ?? 0) - (sp.totalHaber ?? 0)) < TOLERANCIA_CUADRE;
  }

  nombreMes(mes: number): string {
    return MESES.find((m) => m.valor === mes)?.nombre ?? String(mes);
  }

  nombreTipoCartera(tipo: number | null | undefined): string {
    return tipo != null ? (TIPO_CARTERA_CIERRE[tipo] ?? String(tipo)) : '';
  }

  nombreEstadoCorrida(idEstado: number | null | undefined): string {
    return idEstado != null ? (NOMBRE_ESTADO_CORRIDA[idEstado] ?? String(idEstado)) : '—';
  }

  claseEstado(idEstado: number | null | undefined): string {
    switch (idEstado) {
      case ESTADO_CORRIDA.EJECUTADA:
        return 'est-ejecutada';
      case ESTADO_CORRIDA.REVERSADA:
        return 'est-reversada';
      case ESTADO_CORRIDA.PREPARADA:
        return 'est-preparada';
      default:
        return '';
    }
  }

  /** Formatea un LocalDate del backend ([y,m,d]) como "dd/MM/yyyy". */
  formatoFechaArray(arr: number[] | null | undefined): string {
    if (!arr || arr.length < 3) {
      return '—';
    }
    const [y, m, d] = arr;
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  }

  /** Formatea un LocalDateTime del backend ([y,m,d,h,mi,s,ns]) como "dd/MM/yyyy HH:mm". */
  formatoFechaHoraArray(arr: number[] | null | undefined): string {
    if (!arr || arr.length < 3) {
      return '—';
    }
    const [y, m, d, h = 0, mi = 0] = arr;
    return (
      `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}` +
      ` ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
    );
  }

  /** Número con 2 decimales y separador de miles. */
  money(n: number | null | undefined): string {
    return (n ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** Entradas visibles de una desviación, para mostrarla sin asumir su forma exacta. */
  entradasDesviacion(d: Record<string, unknown>): { clave: string; valor: string }[] {
    return Object.entries(d)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([clave, v]) => ({ clave, valor: typeof v === 'number' ? this.money(v) : String(v) }));
  }

  private notificar(mensaje: string, exito: boolean): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: exito ? 5000 : 9000,
      panelClass: [exito ? 'success-snackbar' : 'error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  trackSubProceso(_: number, sp: SubProcesoCierre): number {
    return sp.subProceso;
  }

  trackCorrida(_: number, c: CorridaCierreCartera): number {
    return c.codigo;
  }
}
