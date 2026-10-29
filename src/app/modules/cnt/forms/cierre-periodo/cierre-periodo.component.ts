import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { Permisos } from '../../../../shared/model/permisos';
import { PermisosService } from '../../../../shared/services/permisos.service';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import { mensajeDeError } from '../../../../shared/utils/mensaje-error.util';
import {
  CorridaCierreCartera,
  corridasVigentesPorMes,
} from '../../../crd/model/cierre-cartera/cierre-cartera.model';
import { CierreCarteraService } from '../../../crd/service/cierre-cartera.service';
import {
  MotivoCierreDialogComponent,
  MotivoCierreDialogData,
  MotivoCierreDialogResult,
} from '../../dialog/motivo-cierre-dialog/motivo-cierre-dialog.component';
import { ControlCierre, EstadoPeriodo, HistorialCierrePeriodo, Periodo } from '../../model/periodo';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { CierrePeriodoService, formatoFecha, nombreMes, periodoCerrado } from '../../service/cierre-periodo.service';
import { PeriodoService } from '../../service/periodo.service';

/** Una fila de la pantalla: el período contable con su estado de cierre contable y de cartera. */
export interface FilaCierre {
  periodo: Periodo;
  /** anio * 100 + mes */
  clave: number;
  cerrado: boolean;
  mayorizado: boolean;
  carteraCerrada: boolean;
  corrida: CorridaCierreCartera | null;
}

function claveSiguiente(clave: number): number {
  const anio = Math.floor(clave / 100);
  const mes = clave % 100;
  return mes === 12 ? (anio + 1) * 100 + 1 : clave + 1;
}

/**
 * C17 — Cierre y reapertura del período contable (Contabilidad > Procesos > Cierre de Períodos).
 *
 * Lista los períodos de la empresa con su estado contable (ABIERTO/CERRADO, mayorización, fecha y usuario
 * de cierre) y de cartera (corrida EJECUTADA vigente), permite cerrar el siguiente período en orden y
 * reabrir el último cerrado (motivo obligatorio) y muestra la bitácora CNT.HCPR. El backend valida todas
 * las reglas igual; sus mensajes se muestran tal cual. saaBE docs/logica-negocio/cnt/CIERRES-BLOQUEANTES.md.
 */
@Component({
  selector: 'app-cierre-periodo',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './cierre-periodo.component.html',
  styleUrl: './cierre-periodo.component.scss',
})
export class CierrePeriodoComponent implements OnInit {
  private periodoService = inject(PeriodoService);
  private cierreService = inject(CierrePeriodoService);
  private carteraService = inject(CierreCarteraService);
  private permisosService = inject(PermisosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly formatoFecha = formatoFecha;
  readonly nombreMes = nombreMes;

  idEmpresa = parseInt(localStorage.getItem('idSucursal') || '0', 10) || null;

  cargando = signal(false);
  procesando = signal(false);
  error = signal<string | null>(null);
  avisoCartera = signal<string | null>(null);

  filas = signal<FilaCierre[]>([]);
  bitacora = signal<HistorialCierrePeriodo[]>([]);
  cargandoBitacora = signal(false);
  errorBitacora = signal<string | null>(null);

  /** Panel "Controles de cierre": período consultado, resultado y estado de la consulta. */
  filaControles = signal<FilaCierre | null>(null);
  controles = signal<ControlCierre[]>([]);
  cargandoControles = signal(false);
  errorControles = signal<string | null>(null);

  /** Filtro de año de la tabla ('' = todos). */
  anioFiltro = signal<number | ''>('');
  /** Filtro de la bitácora. */
  tipoBitacora = signal<'' | 'CONTABLE' | 'CARTERA'>('');

  anios = computed(() => Array.from(new Set(this.filas().map((f) => f.periodo.anio))).sort((a, b) => b - a));

  filasVisibles = computed(() => {
    const anio = this.anioFiltro();
    return anio === '' ? this.filas() : this.filas().filter((f) => f.periodo.anio === anio);
  });

  bitacoraVisible = computed(() => {
    const tipo = this.tipoBitacora();
    return tipo ? this.bitacora().filter((h) => h.tipo === tipo) : this.bitacora();
  });

  /** Clave del último período cerrado (null si no hay ninguno). */
  ultimoCerrado = computed(() => {
    const cerrados = this.filas().filter((f) => f.cerrado).map((f) => f.clave);
    return cerrados.length ? Math.max(...cerrados) : null;
  });

  textoUltimoCerrado = computed(() => {
    const c = this.ultimoCerrado();
    return c == null ? 'ninguno' : `${nombreMes(c % 100)} ${Math.floor(c / 100)}`;
  });

  /**
   * El único período que se puede cerrar: el siguiente al último cerrado; si no hay ninguno cerrado, el más
   * antiguo abierto que esté mayorizado y con la cartera cerrada (el backend no exige mes anterior cerrado
   * para el primer cierre).
   */
  candidatoCierre = computed<FilaCierre | null>(() => {
    const ultimo = this.ultimoCerrado();
    const filas = this.filas();
    if (ultimo != null) {
      return filas.find((f) => f.clave === claveSiguiente(ultimo)) ?? null;
    }
    const abiertos = filas.filter((f) => !f.cerrado && f.mayorizado && f.carteraCerrada).sort((a, b) => a.clave - b.clave);
    return abiertos[0] ?? null;
  });

  ngOnInit(): void {
    if (!this.idEmpresa) {
      this.error.set('No hay empresa seleccionada. Vuelva a iniciar sesión.');
      return;
    }
    this.cargar();
  }

  cargar(): void {
    if (!this.idEmpresa) return;
    this.cargando.set(true);
    this.error.set(null);
    this.avisoCartera.set(null);
    forkJoin({
      periodos: this.periodoService.getAll(),
      corridas: this.carteraService.corridas(this.idEmpresa).pipe(
        catchError((mensaje: string) => {
          this.avisoCartera.set(`No se pudo leer el estado de cartera: ${mensaje}`);
          return of([] as CorridaCierreCartera[]);
        }),
      ),
    }).subscribe({
      next: ({ periodos, corridas }) => {
        const vigentes = corridasVigentesPorMes(corridas);
        const filas = (periodos ?? [])
          .map((p): FilaCierre => {
            const clave = p.anio * 100 + p.mes;
            const corrida = vigentes.get(clave) ?? null;
            return {
              periodo: p,
              clave,
              cerrado: periodoCerrado(p),
              mayorizado: p.estado === EstadoPeriodo.MAYORIZADO,
              carteraCerrada: corrida != null,
              corrida,
            };
          })
          .sort((a, b) => b.clave - a.clave);
        this.filas.set(filas);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(e, 'Error al cargar los períodos.'));
      },
    });
    this.cargarBitacora();
  }

  cargarBitacora(): void {
    if (!this.idEmpresa) return;
    this.cargandoBitacora.set(true);
    this.errorBitacora.set(null);
    this.cierreService.bitacora(this.idEmpresa).subscribe({
      next: (lista) => {
        this.bitacora.set(lista ?? []);
        this.cargandoBitacora.set(false);
      },
      error: (mensaje: string) => {
        this.bitacora.set([]);
        this.cargandoBitacora.set(false);
        this.errorBitacora.set(mensaje);
      },
    });
  }

  // ===================== Reglas de la vista (el backend valida igual) =====================

  puedeCerrar(f: FilaCierre): boolean {
    return !f.cerrado && f.mayorizado && f.carteraCerrada && this.candidatoCierre()?.clave === f.clave;
  }

  puedeReabrir(f: FilaCierre): boolean {
    return f.cerrado && f.clave === this.ultimoCerrado();
  }

  /** Por qué no se puede cerrar (tooltip). */
  razonNoCierre(f: FilaCierre): string {
    if (f.cerrado) return 'El período ya está cerrado.';
    const candidato = this.candidatoCierre();
    if (candidato && candidato.clave !== f.clave) {
      return `Se cierra en orden: el siguiente a cerrar es ${this.etiqueta(candidato)}.`;
    }
    if (!candidato && this.ultimoCerrado() != null) {
      return 'No existe el período siguiente al último cerrado.';
    }
    if (!f.mayorizado) return 'El período tiene que estar MAYORIZADO antes de cerrarlo.';
    if (!f.carteraCerrada) return 'La cartera del mes tiene que estar cerrada (cierre de cartera ejecutado).';
    return 'Cerrar el período contable';
  }

  etiqueta(f: FilaCierre): string {
    return `${nombreMes(f.periodo.mes)} ${f.periodo.anio}`;
  }

  textoMayorizacion(p: Periodo): string {
    return this.periodoService.getEstadoTexto(p.estado);
  }

  // ===================== Acciones =====================

  cerrar(f: FilaCierre): void {
    if (!this.puedeCerrar(f) || this.procesando()) return;
    this.permisosService.ejecutarSiPermitido(
      Permisos.CNT_CERRAR_PERIODO,
      () => this.controlarAntesDeCerrar(f),
      (mensaje) => this.notificar(mensaje.toUpperCase(), false),
    );
  }

  // ===================== Controles de cierre (semáforo, pase a producción B-1..B-3) =====================

  /** Consulta los controles del período y los muestra en el panel (no bloquea nada). */
  consultarControles(f: FilaCierre, alTerminar?: (lista: ControlCierre[] | null, error: string | null) => void): void {
    if (!this.idEmpresa) return;
    this.filaControles.set(f);
    this.cargandoControles.set(true);
    this.errorControles.set(null);
    this.controles.set([]);
    this.cierreService.controlCierre(this.idEmpresa, f.periodo.anio, f.periodo.mes).subscribe({
      next: (lista) => {
        this.controles.set(lista ?? []);
        this.cargandoControles.set(false);
        alTerminar?.(lista ?? [], null);
      },
      error: (mensaje: string) => {
        this.cargandoControles.set(false);
        this.errorControles.set(mensaje);
        alTerminar?.(null, mensaje);
      },
    });
  }

  /**
   * Antes de cerrar se consultan los controles. Con algún ERROR (o si no se pudieron consultar) se pide una
   * confirmación explícita; hoy NO se bloquea (opción documentada en saaBE CONTROL-CIERRE-MES.md §5).
   */
  private controlarAntesDeCerrar(f: FilaCierre): void {
    this.consultarControles(f, (lista, error) => {
      const errores = (lista ?? []).filter((c) => c.estado === 'ERROR');
      const advertencias = (lista ?? []).filter((c) => c.estado === 'ADVERTENCIA');
      if (!error && errores.length === 0) {
        this.confirmarYEjecutar(f, 'cerrar', advertencias.length);
        return;
      }
      const data: ConfirmDialogData = error
        ? {
            title: `No se pudieron consultar los controles de ${this.etiqueta(f)}`,
            message: `${error}. ¿Desea continuar con el cierre sin ver los controles?`,
            confirmText: 'Continuar sin controles',
            type: 'warning',
          }
        : {
            title: `${errores.length} control(es) de cierre en ERROR`,
            message:
              `Los controles de ${this.etiqueta(f)} muestran diferencias (detalle en el panel "Controles de cierre"). ` +
              'Cerrar con diferencias deja el mes DEFINITIVO tal como está. ¿Confirma que desea cerrar de todos modos?',
            confirmText: 'Cerrar con diferencias',
            type: 'danger',
            details: errores.slice(0, 8).map((c) => ({
              label: c.descripcion,
              value: c.diferencia != null ? `Diferencia ${this.formatoMonto(c.diferencia)}` : c.estado,
            })),
          };
      this.dialog
        .open(ConfirmDialogComponent, { data, width: '640px' })
        .afterClosed()
        .subscribe((ok?: boolean) => {
          if (ok) this.confirmarYEjecutar(f, 'cerrar', advertencias.length, errores.length);
        });
    });
  }

  /** Peor estado de la lista (para el semáforo general). */
  estadoGeneral = computed<'OK' | 'ADVERTENCIA' | 'ERROR' | null>(() => {
    const lista = this.controles();
    if (!lista.length) return null;
    if (lista.some((c) => c.estado === 'ERROR')) return 'ERROR';
    if (lista.some((c) => c.estado === 'ADVERTENCIA')) return 'ADVERTENCIA';
    return 'OK';
  });

  conteoControles = computed(() => {
    const lista = this.controles();
    return {
      ok: lista.filter((c) => c.estado === 'OK').length,
      advertencia: lista.filter((c) => c.estado === 'ADVERTENCIA').length,
      error: lista.filter((c) => c.estado === 'ERROR').length,
    };
  });

  readonly nombreGrupoControl: Record<string, string> = {
    PUENTES: 'Cuentas puente (D-024)',
    ECUACION: 'Ecuación contable',
    CARTERA: 'Cartera vs contabilidad',
    BANCOS: 'Bancos vs extracto',
    ASIENTOS: 'Asientos del mes',
    B17_G: 'Cuadratura B17 ↔ G',
  };

  iconoEstado(estado: string | null): string {
    return estado === 'OK' ? 'check_circle' : estado === 'ERROR' ? 'cancel' : 'warning';
  }

  formatoMonto(v: number | null | undefined): string {
    if (v === null || v === undefined) return '—';
    return v.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  reabrir(f: FilaCierre): void {
    if (!this.puedeReabrir(f) || this.procesando()) return;
    this.permisosService.ejecutarSiPermitido(
      Permisos.CNT_REABRIR_PERIODO,
      () => this.confirmarYEjecutar(f, 'reabrir'),
      (mensaje) => this.notificar(mensaje.toUpperCase(), false),
    );
  }

  private confirmarYEjecutar(f: FilaCierre, accion: 'cerrar' | 'reabrir', nAdvertencias = 0, nErrores = 0): void {
    const periodo = this.etiqueta(f);
    const avisosControles: string[] = [];
    if (accion === 'cerrar' && nErrores > 0) {
      avisosControles.push(
        `Se cierra con ${nErrores} control(es) en ERROR confirmados: indique en el motivo por qué (queda en la bitácora).`,
      );
    }
    if (accion === 'cerrar' && nAdvertencias > 0) {
      avisosControles.push(`Hay ${nAdvertencias} control(es) con ADVERTENCIA (ver el panel "Controles de cierre").`);
    }
    const data: MotivoCierreDialogData =
      accion === 'cerrar'
        ? {
            titulo: `Cerrar el período contable ${periodo}`,
            mensaje:
              'El período queda CERRADO para contabilidad: ningún módulo podrá registrar, editar ni eliminar asientos ' +
              'con fecha en este mes, y sus estados financieros salen como DEFINITIVOS.',
            advertencias: [
              ...avisosControles,
              'Las anulaciones de documentos de este mes generarán un asiento de reverso en el primer período abierto.',
              'Para corregir algo después habrá que reabrir el período (queda en la bitácora).',
            ],
            detalles: [
              { etiqueta: 'Mayorización', valor: this.textoMayorizacion(f.periodo) },
              { etiqueta: 'Cartera', valor: f.corrida ? `CERRADA (corrida ${f.corrida.codigo})` : 'ABIERTA' },
            ],
            textoConfirmar: 'Cerrar período',
            color: 'primary',
            icono: 'lock',
            placeholderMotivo: 'Ej. Cierre mensual validado por Contabilidad',
          }
        : {
            titulo: `Reabrir el período contable ${periodo}`,
            mensaje:
              'El período vuelve a quedar ABIERTO para contabilidad (sigue mayorizado) y sus estados financieros ' +
              'pasan a PRELIMINARES hasta que se vuelva a cerrar.',
            advertencias: [
              'Solo se reabre el último período cerrado; para meses anteriores hay que reabrir en cascada.',
              'La reapertura queda registrada con su motivo en la bitácora.',
            ],
            detalles: [
              { etiqueta: 'Cerrado el', valor: formatoFecha(f.periodo.fechaCierreContable, true) },
              { etiqueta: 'Por', valor: f.periodo.usuarioCierreContable || '—' },
            ],
            textoConfirmar: 'Reabrir período',
            color: 'warn',
            icono: 'lock_open',
            placeholderMotivo: 'Ej. Ajuste de provisiones solicitado por el Gerente (correo del ...)',
          };

    this.dialog
      .open(MotivoCierreDialogComponent, { data, width: '600px' })
      .afterClosed()
      .subscribe((r?: MotivoCierreDialogResult) => {
        if (!r?.motivo) return;
        this.ejecutar(f, accion, r.motivo);
      });
  }

  private ejecutar(f: FilaCierre, accion: 'cerrar' | 'reabrir', motivo: string): void {
    if (!this.idEmpresa) return;
    this.procesando.set(true);
    this.error.set(null);
    const datos = { usuario: usuarioSesion(), ip: null, motivo };
    const llamada =
      accion === 'cerrar'
        ? this.cierreService.cerrar(this.idEmpresa, f.periodo.anio, f.periodo.mes, datos)
        : this.cierreService.reabrir(this.idEmpresa, f.periodo.anio, f.periodo.mes, datos);
    llamada.subscribe({
      next: (estado) => {
        this.procesando.set(false);
        this.notificar(
          `Período ${this.etiqueta(f)} ${accion === 'cerrar' ? 'CERRADO' : 'REABIERTO'} (${estado?.leyenda ?? estado?.estado ?? ''}).`,
          true,
        );
        this.cargar();
      },
      error: (mensaje: string) => {
        this.procesando.set(false);
        this.error.set(mensaje);
        this.notificar(mensaje, false);
      },
    });
  }

  private notificar(mensaje: string, exito: boolean): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: exito ? 5000 : 10000,
      panelClass: [exito ? 'success-snackbar' : 'error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }
}
