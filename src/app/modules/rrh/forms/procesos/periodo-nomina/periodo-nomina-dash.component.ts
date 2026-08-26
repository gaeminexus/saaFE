import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import {
  AccionPeriodo,
  ESTADOS_PREVISUALIZA_ASIENTO,
  EstadoPeriodo,
  accionesDisponibles,
  esHistorico,
  estadoEn,
  motivoBloqueado,
} from '../../../model/estados-nomina';
import { PeriodoNomina } from '../../../model/periodo-nomina';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { NovedadNominaService } from '../../../service/novedad-nomina.service';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import { MotivoDialogComponent } from './motivo-dialog.component';
import { NominasPeriodoComponent } from './nominas-periodo.component';
import { PrevisualizacionAsientoDialogComponent } from './previsualizacion-asiento-dialog.component';
import { ProvisionesPeriodoComponent } from './provisiones-periodo.component';
import { opcionesAviso } from '../../comunes/avisos';

/** Tipos de asiento que acepta `previsualizarAsiento/{idPeriodo}/{tipo}`. */
const TIPO_ASIENTO_ROL = 1;
const TIPO_ASIENTO_PROVISIONES = 2;

/**
 * Pantalla central del módulo: el período de nómina.
 *
 * Reúne la cabecera con el estado y el modo, la barra que refleja la máquina de estados, el
 * detalle por colaborador y los totales. Los mensajes de la validación se muestran en un panel
 * y no en un `snackbar`: suelen ser varios y el usuario necesita leerlos con calma.
 */
@Component({
  selector: 'app-periodo-nomina-dash',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    NominasPeriodoComponent,
    ProvisionesPeriodoComponent,
  ],
  templateUrl: './periodo-nomina-dash.component.html',
  styleUrls: ['./periodo-nomina-dash.component.scss'],
})
export class PeriodoNominaDashComponent implements OnInit {
  periodo = signal<PeriodoNomina | null>(null);
  mensajesValidacion = signal<string[] | null>(null);
  erroresCalculo = signal<string[]>([]);
  /**
   * Por qué el backend no dejó cerrar, cuando el motivo son novedades del IESS sin declarar.
   *
   * Va a un panel y no al `snackbar` por lo mismo que los mensajes de la validación: es
   * accionable y ocho segundos no bastan para leerlo y decidir. Además el panel puede llevar el
   * enlace a la pantalla donde se resuelve, que es lo único que el usuario necesita hacer a
   * continuación; un `snackbar` lo obligaría a recordar el mensaje mientras navega.
   */
  bloqueoCierre = signal<string | null>(null);
  cargando = signal<boolean>(true);
  ocupado = signal<boolean>(false);
  /** Cambia al recalcular para que la tabla de colaboradores vuelva a pedir sus datos. */
  versionDatos = signal<number>(0);

  /**
   * Cuántas novedades del período siguen sin aprobar — Corrección 3, sobre la Corrección 3.
   *
   * La aprobación en lote de Novedades dejó un hueco: capturar veinte, aprobar dieciocho y
   * calcular sin las otras dos no da ni un aviso hoy — `validarPeriodo` no mira las novedades,
   * sus seis comprobaciones son de infraestructura del período (fechas, tipo, contratos).
   * Verificado en el backend. El aviso es cliente puro: mismos datos que ya trae
   * `NovedadNomina.aprobada`.
   */
  novedadesSinAprobar = signal<number>(0);

  acciones = computed(() => accionesDisponibles(this.periodo()));
  historico = computed(() => esHistorico(this.periodo()));

  /** Previsualizar necesita nóminas calculadas: antes de CALCULADO no hay líneas que armar. */
  puedePrevisualizar = computed(
    () => estadoEn(this.periodo(), ESTADOS_PREVISUALIZA_ASIENTO) && !this.ocupado(),
  );

  estadoLabel = computed(() =>
    this.rubro(RubrosRrh.ESTADO_PERIODO_NOMINA, this.periodo()?.estado),
  );
  modoLabel = computed(() => this.rubro(RubrosRrh.MODO_PERIODO_NOMINA, this.periodo()?.modo));
  tipoLabel = computed(() => this.rubro(RubrosRrh.TIPO_PERIODO_NOMINA, this.periodo()?.tipoPeriodo));
  cerrado = computed(() => Number(this.periodo()?.estado) === EstadoPeriodo.CERRADO);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private periodoService: PeriodoNominaService,
    private novedadNominaService: NovedadNominaService,
    private detalleRubroService: DetalleRubroService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const codigo = Number(this.route.snapshot.paramMap.get('codigo'));
    if (!codigo) {
      this.volver();
      return;
    }
    this.recargarPeriodo(codigo);
  }

  private recargarPeriodo(codigo: number): void {
    // El aviso de bloqueo describe un intento concreto. Al releer el período deja de ser
    // cierto —puede que ya se hayan declarado las novedades—, así que se retira en vez de
    // quedarse contradiciendo a la pantalla.
    this.bloqueoCierre.set(null);
    this.cargando.set(true);
    this.periodoService.getById(codigo).subscribe({
      next: (data) => {
        this.cargando.set(false);
        if (!data) {
          this.avisar('No se encontró el período solicitado', true);
          this.volver();
          return;
        }
        this.periodo.set(data);
        this.cargarNovedadesSinAprobar(codigo);
      },
      error: () => {
        this.cargando.set(false);
        this.avisar('No se pudo cargar el período', true);
        this.volver();
      },
    });
  }

  private cargarNovedadesSinAprobar(codigo: number): void {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'periodoNomina',
      'codigo',
      codigo.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    this.novedadNominaService
      .selectByCriteria([db])
      .pipe(catchError(() => of([])))
      .subscribe((novedades) => {
        this.novedadesSinAprobar.set((novedades ?? []).filter((n) => n.aprobada !== 'S').length);
      });
  }

  /** Por qué una acción está gris, en vez de dejarla muda. */
  motivo(accion: AccionPeriodo): string | null {
    return motivoBloqueado(this.periodo(), accion);
  }

  puede(accion: AccionPeriodo): boolean {
    return this.acciones().has(accion) && !this.ocupado();
  }

  validar(): void {
    this.ejecutar(this.periodoService.validar(this.periodo()!.codigo), (mensajes: string[]) => {
      this.mensajesValidacion.set(mensajes ?? []);
      if ((mensajes ?? []).length === 0) {
        this.avisar('El período no tiene observaciones: puede calcularlo.');
      }
    });
  }

  calcular(): void {
    this.ejecutar(this.periodoService.calcular(this.periodo()!.codigo), (resultado) => {
      this.erroresCalculo.set(resultado?.errores ?? []);
      this.avisar(
        `${resultado?.empleadosProcesados ?? 0} colaborador(es) procesados, ` +
          `${resultado?.empleadosConError ?? 0} con error.`,
      );
      this.refrescar();
    });
  }

  aprobar(): void {
    this.ejecutar(this.periodoService.aprobar(this.periodo()!.codigo), () => {
      this.avisar('Período aprobado.');
      this.refrescar();
    });
  }

  contabilizar(): void {
    this.ejecutar(this.periodoService.contabilizar(this.periodo()!.codigo), (asiento) => {
      // En modo histórico el backend responde 204 sin cuerpo, que llega como null: no es error
      this.avisar(
        asiento
          ? 'Período contabilizado; se generó el asiento del rol.'
          : 'Período histórico: avanzó a contabilizado sin generar asiento.',
      );
      this.refrescar();
    });
  }

  /**
   * El asiento de provisiones es distinto del rol y se guarda aparte, en `PRDNASPR`. Un 204 aquí
   * significa período histórico **o** período que no generó provisiones; se distinguen por el
   * modo, que la pantalla ya conoce.
   */
  contabilizarProvisiones(): void {
    this.ejecutar(
      this.periodoService.contabilizarProvisiones(this.periodo()!.codigo),
      (asiento) => {
        if (asiento) {
          this.avisar('Se generó el asiento de provisiones.');
        } else {
          this.avisar(
            this.historico()
              ? 'Período histórico: no se emite el asiento de provisiones.'
              : 'El período no generó provisiones, así que no hay asiento que emitir.',
          );
        }
        this.refrescar();
      },
    );
  }

  previsualizarRol(): void {
    this.previsualizar(TIPO_ASIENTO_ROL, 'Previsualización del asiento del rol');
  }

  previsualizarProvisiones(): void {
    this.previsualizar(TIPO_ASIENTO_PROVISIONES, 'Previsualización del asiento de provisiones');
  }

  /**
   * Previsualizar no persiste nada y **funciona también en modo histórico**: es la única forma
   * de ver qué asiento se emitiría mientras no haya plan de cuentas cargado.
   */
  private previsualizar(tipo: number, titulo: string): void {
    this.ocupado.set(true);
    this.periodoService.previsualizarAsiento(this.periodo()!.codigo, tipo).subscribe({
      next: (lineas) => {
        this.ocupado.set(false);
        this.dialog.open(PrevisualizacionAsientoDialogComponent, {
          width: '900px',
          maxWidth: '95vw',
          data: { titulo, lineas: lineas ?? [] },
        });
      },
      error: (err) => {
        this.ocupado.set(false);
        this.avisar(this.mensajeDeError(err, 'No se pudo previsualizar el asiento.'), true);
      },
    });
  }

  /**
   * Cierra el período, o explica por qué no se pudo.
   *
   * No usa `ejecutar` porque su fallo más frecuente **es informativo, no un error de sistema**:
   * el backend se niega a cerrar mientras queden novedades del IESS sin declarar
   * (`NORMATIVA-IESS-NOVEDADES.md` §5.4.1). Ese rechazo se enseña entero y con la salida a mano,
   * en vez de como un `snackbar` que se va solo.
   *
   * El mensaje llega **tal cual lo escribe el backend**, sin reformular ni resumir: dice cuántas
   * novedades faltan, que es lo único accionable. Si el motivo del rechazo fuera otro, se muestra
   * igual — no se interpreta aquí qué clase de fallo es.
   */
  cerrar(): void {
    this.bloqueoCierre.set(null);
    this.ocupado.set(true);
    this.periodoService.cerrar(this.periodo()!.codigo).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.avisar('Período cerrado. Los acumulados quedaron escritos.');
        this.refrescar();
      },
      error: (err) => {
        this.ocupado.set(false);
        this.bloqueoCierre.set(this.mensajeDeError(err));
      },
    });
  }

  /** Lleva a las novedades del mes, que es donde se resuelve el bloqueo. */
  irANovedadesIess(): void {
    this.router.navigate(['/menurecursoshumanos/procesos/novedades-iess']);
  }

  reabrir(): void {
    this.pedirMotivo('Reabrir el período', 'Motivo de la reapertura').subscribe((motivo) => {
      if (!motivo) return;
      this.ejecutar(this.periodoService.reabrir(this.periodo()!.codigo, motivo), () => {
        this.avisar('Período reabierto.');
        this.refrescar();
      });
    });
  }

  onExcluirEmpleado(evento: { idEmpleado: number; nombre: string }): void {
    this.pedirMotivo(
      `Excluir a ${evento.nombre}`,
      'Motivo de la exclusión del período',
    ).subscribe((motivo) => {
      if (!motivo) return;
      this.ejecutar(
        this.periodoService.excluirEmpleado(this.periodo()!.codigo, evento.idEmpleado, motivo),
        () => {
          this.avisar('Colaborador excluido del período.');
          this.refrescar();
        },
      );
    });
  }

  onRecalcularEmpleado(idEmpleado: number): void {
    this.ejecutar(
      this.periodoService.recalcularEmpleado(this.periodo()!.codigo, idEmpleado, true),
      (resultado) => {
        const advertencias = resultado?.advertencias ?? [];
        this.avisar(
          advertencias.length > 0
            ? `Recalculado con ${advertencias.length} advertencia(s): ${advertencias[0]}`
            : 'Colaborador recalculado.',
        );
        this.refrescar();
      },
    );
  }

  private pedirMotivo(titulo: string, etiqueta: string) {
    return this.dialog
      .open(MotivoDialogComponent, { data: { titulo, etiqueta }, width: '480px' })
      .afterClosed();
  }

  /** Encapsula el patrón ocupado → resultado → error de todos los procesos del período. */
  private ejecutar<T>(peticion: Observable<T>, alTerminar: (resultado: T) => void): void {
    this.ocupado.set(true);
    peticion.subscribe({
      next: (resultado) => {
        this.ocupado.set(false);
        alTerminar(resultado);
      },
      error: (err) => {
        this.ocupado.set(false);
        this.avisar(this.mensajeDeError(err), true);
      },
    });
  }

  private refrescar(): void {
    const codigo = this.periodo()?.codigo;
    if (codigo) this.recargarPeriodo(codigo);
    this.versionDatos.update((v) => v + 1);
  }

  private rubro(rubroAlterno: number, valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '—';
    return this.detalleRubroService.getDescripcionByParentAndAlterno(rubroAlterno, valor) || '—';
  }

  volver(): void {
    this.router.navigate(['/menurecursoshumanos/procesos/periodos-nomina']);
  }

  /** El backend explica el fallo en el cuerpo, a veces como texto plano y a veces como JSON. */
  private mensajeDeError(error: any, generico = 'El proceso no se pudo completar'): string {
    if (typeof error === 'string' && error.trim()) return error;
    return error?.mensaje || error?.message || generico;
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      ...opcionesAviso(esError, mensaje),
    });
  }
}
