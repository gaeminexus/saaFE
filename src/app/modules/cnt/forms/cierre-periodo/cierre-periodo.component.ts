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
import { EstadoPeriodo, HistorialCierrePeriodo, Periodo } from '../../model/periodo';
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
      () => this.confirmarYEjecutar(f, 'cerrar'),
      (mensaje) => this.notificar(mensaje.toUpperCase(), false),
    );
  }

  reabrir(f: FilaCierre): void {
    if (!this.puedeReabrir(f) || this.procesando()) return;
    this.permisosService.ejecutarSiPermitido(
      Permisos.CNT_REABRIR_PERIODO,
      () => this.confirmarYEjecutar(f, 'reabrir'),
      (mensaje) => this.notificar(mensaje.toUpperCase(), false),
    );
  }

  private confirmarYEjecutar(f: FilaCierre, accion: 'cerrar' | 'reabrir'): void {
    const periodo = this.etiqueta(f);
    const data: MotivoCierreDialogData =
      accion === 'cerrar'
        ? {
            titulo: `Cerrar el período contable ${periodo}`,
            mensaje:
              'El período queda CERRADO para contabilidad: ningún módulo podrá registrar, editar ni eliminar asientos ' +
              'con fecha en este mes, y sus estados financieros salen como DEFINITIVOS.',
            advertencias: [
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
