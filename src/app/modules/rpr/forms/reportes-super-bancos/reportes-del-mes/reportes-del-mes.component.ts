import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap, throwError } from 'rxjs';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { guardarArchivo, mensajeReporteFallido } from '../../../../../shared/services/descarga-reporte';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import {
  EstadoFinancieroOficialService,
  SolicitudEstadoFinanciero,
} from '../../../../cnt/service/estado-financiero-oficial.service';
import {
  EstructuraReporteService,
  LineaEstructura,
  ResultadoEstructura,
  SolicitudEstructura,
} from '../../../service/estructura-reporte.service';
import {
  FlujoEfectivoService,
  ResultadoFlujoEfectivo,
  SolicitudFlujoEfectivo,
} from '../../../service/flujo-efectivo.service';
import {
  ArchivoReporte,
  corteParaNombre,
  csvDeFilas,
  isoFecha,
  nombreDeRespuesta,
  ultimoDiaDelMes,
} from '../archivo-reporte';

/** Estado de un reporte en el SAA para el mes elegido. */
export type EstadoReporte = 'sin-revisar' | 'revisando' | 'disponible' | 'preliminar' | 'no-disponible';

/** Estado de las G40–G51 que calcula la pantalla madre (ejecución consultada o generada). */
export interface EstadoG {
  estado: EstadoReporte;
  motivo: string;
}

interface Descarga {
  etiqueta: string;
  icono: string;
  /** Entra en "Descargar todos". */
  enTodo: boolean;
  obtener: () => Observable<ArchivoReporte[]>;
}

interface FilaReporte {
  clave: string;
  nombre: string;
  periodicidad: string;
  /** Lo que pide la Superintendencia o ASOPREP. */
  salida: string;
  /** De dónde sale en el SAA. */
  origen: string;
  estado: EstadoReporte;
  motivo: string;
  descargas: Descarga[];
}

/**
 * Tipos de reporte de la empresa usados por los estados oficiales (`CNT.RPRT.RPRTALTR`, semilla C19-04):
 * 1 = Balance general (ESTADO DE SITUACIÓN FINANCIERA), 3 = ESTADO DE RESULTADOS.
 */
const ALTERNO_SITUACION = 1;
const ALTERNO_RESULTADOS = 3;

/** Código de entidad de ASOPREP en la Superintendencia (nombre de los archivos). */
const ENTIDAD = '3968';

/** Subcuentas de 6 dígitos que el formato de comparativo de ASOPREP muestra aparte. */
const SUBCUENTAS_COMPARATIVO = ['150210', '150299', '190205', '190290', '190299', '199990'];

/**
 * C36 — Todos los reportes del mes para la Superintendencia y ASOPREP en un solo lugar: B17 (.txt del backend,
 * sin tocar sus bytes), G40–G51 (.txt que arma la pantalla madre), flujo de caja (estructura FLC, provisional),
 * estados financieros oficiales y comparativo. Cada uno muestra si está disponible, preliminar o no disponible en
 * el SAA y por qué. Sin librería de .zip en el proyecto, "Descargar todos" entrega los archivos sueltos uno tras
 * otro (ver cuadreSuper `03-trabajo/cambios-saa/C36-REPORTES-SUPER-EN-PANTALLA.md`).
 *
 * C38 — El estado de flujos de efectivo (mes y acumulado), el flujo de caja real (BIESS) y el comparativo con el
 * formato de ASOPREP salen de `/flef` (saaBE `FlujoEfectivoRest`), con PRELIMINAR / DEFINITIVO como el B17
 * (cuadreSuper `03-trabajo/cambios-saa/C38-FLUJO-Y-COMPARATIVO.md`).
 */
@Component({
  selector: 'app-reportes-del-mes',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './reportes-del-mes.component.html',
  styleUrls: ['./reportes-del-mes.component.scss'],
})
export class ReportesDelMesComponent {
  private estructuraService = inject(EstructuraReporteService);
  private estadoOficialService = inject(EstadoFinancieroOficialService);
  private flujoService = inject(FlujoEfectivoService);
  private appState = inject(AppStateService);

  /** Mes (1–12) y año elegidos en la pantalla. */
  mes = input.required<number>();
  anio = input.required<number>();
  /** Estado de las G40–G51 según la ejecución consultada en la pantalla madre. */
  estadoG = input<EstadoG>({ estado: 'sin-revisar', motivo: 'Consulte o genere las G del mes.' });
  /** Los .txt de las G40–G51 tal como los arma la pantalla madre. */
  archivosG = input<(() => Observable<ArchivoReporte[]>) | null>(null);

  readonly etiquetaEstado: Record<EstadoReporte, string> = {
    'sin-revisar': 'Sin revisar',
    revisando: 'Revisando…',
    disponible: 'Disponible',
    preliminar: 'Preliminar',
    'no-disponible': 'No disponible',
  };

  readonly iconoEstado: Record<EstadoReporte, string> = {
    'sin-revisar': 'help_outline',
    revisando: 'hourglass_empty',
    disponible: 'check_circle',
    preliminar: 'pending',
    'no-disponible': 'block',
  };

  /** Período al que corresponden los estados mostrados ("m-aaaa"). */
  periodoRevisado = signal<string>('');
  private filasBase = signal<FilaReporte[]>(this.armarFilas());
  descargando = signal<string>('');
  progresoTodos = signal<string>('');
  erroresTodos = signal<string[]>([]);

  /** B17 del mes: true = el mes no está cerrado y se pide con `preliminar: true`. */
  private b17Preliminar = false;
  /** Flujo de efectivo, flujo de caja y comparativo con formato (C38, `/flef`): igual que el B17. */
  private flefPreliminar = false;
  /** Descarta respuestas de una revisión anterior (cambio de mes a mitad de camino). */
  private turno = 0;

  filas = computed<FilaReporte[]>(() => {
    const g = this.estadoG();
    return this.filasBase().map((f) => (f.clave === 'G' ? { ...f, estado: g.estado, motivo: g.motivo } : f));
  });

  /** La revisión mostrada es de otro mes que el elegido. */
  desactualizado = computed(() => this.periodoRevisado() !== '' && this.periodoRevisado() !== this.clave());

  puedeDescargarTodos = computed(
    () =>
      !this.desactualizado() &&
      this.descargando() === '' &&
      this.filas().some((f) => this.descargable(f) && f.descargas.some((d) => d.enTodo)),
  );

  descargable(f: FilaReporte): boolean {
    return f.estado === 'disponible' || f.estado === 'preliminar';
  }

  private clave(): string {
    return `${this.mes()}-${this.anio()}`;
  }

  // ─────────────────────────────────────────────────────────────── revisión de disponibilidad

  /** Consulta al backend el estado de cada reporte para el mes elegido. */
  revisar(): void {
    const turno = ++this.turno;
    this.periodoRevisado.set(this.clave());
    this.erroresTodos.set([]);
    this.progresoTodos.set('');
    this.filasBase.set(this.armarFilas());
    for (const c of ['B17', 'FLE', 'FLC', 'ESF', 'ER', 'CMP']) {
      this.actualizar(c, { estado: 'revisando', motivo: '' });
    }

    // B17: primero definitivo; si el mes no está cerrado, preliminar.
    this.b17Preliminar = false;
    this.estructuraService
      .generar(this.solicitudB17(false))
      .pipe(
        map((r) => ({ r, preliminar: false, aviso: '' })),
        catchError((err) => {
          const msg = mensajeDeError(err, 'No se pudo generar el B17.');
          if (/REPORTE_MES_NO_CERRADO/.test(msg)) {
            return this.estructuraService
              .generar(this.solicitudB17(true))
              .pipe(map((r) => ({ r, preliminar: true, aviso: msg.replace(/^REPORTE_MES_NO_CERRADO:\s*/, '') })));
          }
          return throwError(() => err);
        }),
      )
      .subscribe({
        next: ({ r, preliminar, aviso }) => {
          if (turno !== this.turno) return;
          this.b17Preliminar = preliminar;
          const adv = r.advertencias?.length ? ` ${r.advertencias.length} advertencia(s) de cuentas sin renglón o excluidas.` : '';
          const suma = r.sumaControl != null ? ` Suma de control ${this.numero(r.sumaControl)}.` : '';
          this.actualizar('B17', preliminar
            ? { estado: 'preliminar', motivo: `Mes sin cerrar: sale como ${r.nombreArchivo ?? 'B17…_PRELIMINAR.txt'}, no presentable. ${aviso}${suma}${adv}`.trim() }
            : { estado: 'disponible', motivo: `Mes cerrado: ${r.nombreArchivo ?? this.nombreB17(false)}.${suma}${adv}` });
        },
        error: (err) => {
          if (turno !== this.turno) return;
          this.actualizar('B17', { estado: 'no-disponible', motivo: mensajeDeError(err, 'No se pudo generar el B17.') });
        },
      });

    // Estado de flujos de efectivo (indirecto) y flujo de caja (directo, BIESS) del mes: /flef (C38). Como el B17:
    // primero definitivo; si el mes no está cerrado, preliminar.
    this.flefPreliminar = false;
    this.flujoService
      .generar(this.solicitudFlujo('MES', false, true))
      .pipe(
        map((r: ResultadoFlujoEfectivo) => ({ r, aviso: '' })),
        catchError((err) => {
          const msg = mensajeDeError(err, 'No se pudo generar el flujo de efectivo.');
          if (/REPORTE_MES_NO_CERRADO/.test(msg)) {
            return this.flujoService
              .generar(this.solicitudFlujo('MES', true, true))
              .pipe(map((r) => ({ r, aviso: msg.replace(/^REPORTE_MES_NO_CERRADO:\s*/, '') })));
          }
          return throwError(() => err);
        }),
      )
      .subscribe({
        next: ({ r, aviso }) => {
          if (turno !== this.turno) return;
          this.flefPreliminar = r.preliminar;
          const estado: EstadoReporte = r.preliminar ? 'preliminar' : 'disponible';
          const linea = (c: string) => r.lineas?.find((l) => l.codigo === c)?.valor ?? 0;
          const resumen = (controles: { estado: string }[]) => {
            const err = controles.filter((c) => c.estado === 'ERROR').length;
            const adv = controles.filter((c) => c.estado === 'ADVERTENCIA').length;
            return `${controles.length - err - adv} controles OK, ${adv} advertencia(s), ${err} error(es)`;
          };
          const pre = r.preliminar ? `PRELIMINAR (mes sin cerrar, no presentable). ${aviso} ` : 'Mes cerrado. ';
          this.actualizar('FLE', {
            estado,
            motivo:
              `${pre}Caja inicial ${this.numero(linea('FE50'))} + flujo neto ${this.numero(linea('FE48'))} = ` +
              `${this.numero(linea('FE51'))}; ${resumen(r.controles ?? [])}. El acumulado del año sale contra el 31-dic ` +
              'anterior (en 2025, contra el arranque del 31-may-2025).',
          });
          const meses = r.flujoCaja ?? [];
          const ctl = meses.flatMap((m) => m.controles ?? []);
          this.actualizar('FLC', {
            estado,
            motivo:
              `${pre}Método directo por la caja (contrapartidas de 1.1 y cuentas puente), ${resumen(ctl)}. ` +
              'El Excel trae una columna por mes del año hasta el corte.',
          });
        },
        error: (err) => {
          if (turno !== this.turno) return;
          const motivo = mensajeDeError(err, 'No se pudo generar el flujo de efectivo.');
          this.actualizar('FLE', { estado: 'no-disponible', motivo: `${motivo} (¿falta correr la semilla C38-01?)` });
          this.actualizar('FLC', { estado: 'no-disponible', motivo: `${motivo} (¿falta correr la semilla C38-01?)` });
        },
      });

    // Estados oficiales y comparativo: el encabezado trae la leyenda DEFINITIVO / PRELIMINAR.
    const estados: [string, SolicitudEstadoFinanciero][] = [
      ['ESF', this.solicitudEstado(ALTERNO_SITUACION)],
      ['ER', this.solicitudEstado(ALTERNO_RESULTADOS)],
      ['CMP', this.solicitudComparativo()],
    ];
    for (const [clave, s] of estados) {
      this.estadoOficialService.encabezado(s).subscribe({
        next: (e) => {
          if (turno !== this.turno) return;
          const definitivo = (e.leyenda ?? '').toUpperCase().startsWith('DEFINITIVO');
          const extra = clave === 'CMP'
            ? ' «Excel formato» = el de ASOPREP (códigos del B17, /flef/comparativoExcel); «Excel SAA» y PDF = estado del SAA por plan de cuentas (/esfo).'
            : '';
          this.actualizar(clave, definitivo
            ? { estado: 'disponible', motivo: `${e.titulo} ${e.periodo}: DEFINITIVO (período contable cerrado).${extra}` }
            : { estado: 'preliminar', motivo: `${e.titulo} ${e.periodo}: ${e.leyenda}. Las cifras pueden cambiar hasta el cierre.${extra}` });
        },
        error: (err) => {
          if (turno !== this.turno) return;
          this.actualizar(clave, { estado: 'no-disponible', motivo: mensajeDeError(err, 'No se pudo consultar el estado financiero.') });
        },
      });
    }
  }

  // ─────────────────────────────────────────────────────────────── descargas

  descargar(f: FilaReporte, d: Descarga): void {
    const id = `${f.clave}:${d.etiqueta}`;
    this.descargando.set(id);
    this.erroresTodos.set([]);
    d.obtener().subscribe({
      next: (archivos) => {
        this.descargando.set('');
        this.entregar(archivos);
      },
      error: async (err) => {
        this.descargando.set('');
        this.erroresTodos.set([`${f.nombre} (${d.etiqueta}): ${await this.mensaje(err)}`]);
      },
    });
  }

  /**
   * Sin librería de .zip en `package.json` (no se agregan dependencias): se descargan los archivos sueltos, uno
   * tras otro. El navegador puede pedir permiso una vez para "descargar varios archivos".
   */
  async descargarTodos(): Promise<void> {
    const pendientes: { fila: FilaReporte; d: Descarga }[] = [];
    for (const fila of this.filas()) {
      if (!this.descargable(fila)) continue;
      for (const d of fila.descargas) {
        if (d.enTodo) pendientes.push({ fila, d });
      }
    }
    if (!pendientes.length) return;
    this.descargando.set('TODOS');
    this.erroresTodos.set([]);
    const errores: string[] = [];
    let n = 0;
    for (const { fila, d } of pendientes) {
      n++;
      this.progresoTodos.set(`${n} de ${pendientes.length}: ${fila.nombre} (${d.etiqueta})`);
      try {
        const archivos = await this.aPromesa(d.obtener());
        for (const a of archivos) {
          guardarArchivo(a.blob, a.nombre);
          await this.pausa(400);
        }
      } catch (err) {
        errores.push(`${fila.nombre} (${d.etiqueta}): ${await this.mensaje(err)}`);
      }
    }
    this.descargando.set('');
    this.progresoTodos.set(`Listo: ${pendientes.length - errores.length} de ${pendientes.length} descargas.`);
    this.erroresTodos.set(errores);
  }

  private entregar(archivos: ArchivoReporte[]): void {
    archivos.forEach((a, i) => setTimeout(() => guardarArchivo(a.blob, a.nombre), i * 400));
  }

  private aPromesa(o: Observable<ArchivoReporte[]>): Promise<ArchivoReporte[]> {
    return new Promise((resolve, reject) => {
      let ultimo: ArchivoReporte[] = [];
      o.subscribe({ next: (v) => (ultimo = v), error: reject, complete: () => resolve(ultimo) });
    });
  }

  private pausa(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async mensaje(err: any): Promise<string> {
    if (err?.error instanceof Blob) {
      return mensajeReporteFallido(err);
    }
    return mensajeDeError(err, 'No se pudo generar el archivo.');
  }

  // ─────────────────────────────────────────────────────────────── archivos de cada reporte

  /** B17 tal como lo devuelve `/esrp/archivo`: el Blob se entrega sin leerlo ni recodificarlo. */
  private archivoB17(): Observable<ArchivoReporte[]> {
    const preliminar = this.b17Preliminar;
    return this.estructuraService.archivo(this.solicitudB17(preliminar)).pipe(
      map((resp) => {
        if (!resp.body) throw new Error('El backend no devolvió el archivo del B17.');
        return [{ nombre: nombreDeRespuesta(resp, this.nombreB17(preliminar)), blob: resp.body }];
      }),
    );
  }

  /** Flujo de caja FLC como CSV de trabajo (el SAA no genera el Excel del formato BIESS). */
  private archivoFlc(): Observable<ArchivoReporte[]> {
    return this.estructuraService.generar(this.solicitudFlc()).pipe(
      map((r) => {
        const filas: (string | number | null)[][] = [
          ['ASOPREP FCPC'],
          [`${r.titulo ?? 'FLUJO DE CAJA'} - PROVISIONAL (C19-03), NO PRESENTABLE`],
          [`Del ${this.fechaInicioMes()} al ${this.fechaCorte()}`],
          [],
          ['Renglón', 'Concepto', 'Valor'],
          ...r.lineas.map((l) => [l.codigo, l.nombre, l.valor ?? 0]),
        ];
        return [{ nombre: `FLUJO_CAJA_PROVISIONAL_${this.periodoNombre()}.csv`, blob: csvDeFilas(filas) }];
      }),
    );
  }

  private archivoEstado(s: SolicitudEstadoFinanciero, formato: 'PDF' | 'EXCEL', alternativo: string): Observable<ArchivoReporte[]> {
    return this.conUsuario((usuario) =>
      this.estadoOficialService.imprimir({ ...s, formato, usuario }).pipe(
        map((resp) => {
          if (!resp.body) throw new Error('El backend no devolvió el archivo.');
          const ext = formato === 'PDF' ? 'pdf' : 'xlsx';
          return [{ nombre: nombreDeRespuesta(resp, `${alternativo}_${this.periodoNombre()}.${ext}`), blob: resp.body }];
        }),
      ),
    );
  }

  /**
   * Comparativo con los códigos del B17 (como `COMPARATIVO_01_2026_FORMATO.xlsx` de ASOPREP): activo, pasivo y
   * patrimonio en grupos y cuentas de hasta 4 dígitos más las subcuentas de 6 que trae el formato; diciembre del
   * año anterior, mes y variación con el signo del formato (columna H: activo = diciembre − mes; pasivo y
   * patrimonio = mes − diciembre, es decir, el efecto en caja).
   */
  private archivoComparativoB17(): Observable<ArchivoReporte[]> {
    const dic = isoFecha(this.anio() - 1, 12, 31);
    return this.estructuraService
      .generar({ ...this.solicitudB17(this.b17Preliminar), fechaComparacion: dic, fechaInicioComparacion: isoFecha(this.anio() - 1, 12, 1) })
      .pipe(
        map((r: ResultadoEstructura) => {
          const lineas = r.lineas.filter(
            (l: LineaEstructura) => /^[123]\d{0,3}$/.test(l.codigo) || SUBCUENTAS_COMPARATIVO.includes(l.codigo),
          );
          const filas: (string | number | null)[][] = [
            ['ASOPREP FCPC'],
            [`BALANCE COMPARATIVO (códigos del B17)${r.preliminar ? ' - PRELIMINAR' : ''}`],
            [],
            ['CODIGO', 'CUENTA', `31/12/${this.anio() - 1}`, this.fechaCorteTexto(), 'VARIACIÓN (efecto en caja)'],
            ...lineas.map((l) => {
              const ant = l.valorComparativo ?? 0;
              const act = l.valor ?? 0;
              const variacion = l.codigo.startsWith('1') ? ant - act : act - ant;
              return [l.codigo, l.nombre, ant, act, Math.round(variacion * 100) / 100];
            }),
          ];
          return [{ nombre: `COMPARATIVO_B17_${this.periodoNombre()}${r.preliminar ? '_PRELIMINAR' : ''}.csv`, blob: csvDeFilas(filas) }];
        }),
      );
  }

  /** Estado de flujos de efectivo con el formato de ASOPREP (`/flef/excel`, C38): del mes o acumulado del año. */
  private archivoFlujoEfectivo(periodo: 'MES' | 'ACUMULADO'): Observable<ArchivoReporte[]> {
    const s: SolicitudFlujoEfectivo = { ...this.solicitudFlujo(periodo, this.flefPreliminar, false), reporte: 'INDIRECTO' };
    return this.flujoService.excel(s).pipe(
      map((resp) => {
        if (!resp.body) throw new Error('El backend no devolvió el Excel del flujo de efectivo.');
        const alt = `FLUJO_EFECTIVO_${this.periodoNombre()}_${periodo}${this.flefPreliminar ? '_PRELIMINAR' : ''}.xlsx`;
        return [{ nombre: nombreDeRespuesta(resp, alt), blob: resp.body }];
      }),
    );
  }

  /** Flujo de caja real con el formato BIESS (`/flef/excel` DIRECTO): una columna por mes del año hasta el corte. */
  private archivoFlujoCaja(): Observable<ArchivoReporte[]> {
    const s: SolicitudFlujoEfectivo = { ...this.solicitudFlujo('ACUMULADO', this.flefPreliminar, true), reporte: 'DIRECTO' };
    return this.flujoService.excel(s).pipe(
      map((resp) => {
        if (!resp.body) throw new Error('El backend no devolvió el Excel del flujo de caja.');
        const alt = `FLUJO_CAJA_${this.periodoNombre()}_ACUMULADO${this.flefPreliminar ? '_PRELIMINAR' : ''}.xlsx`;
        return [{ nombre: nombreDeRespuesta(resp, alt), blob: resp.body }];
      }),
    );
  }

  /** Comparativo con el formato de ASOPREP (`/flef/comparativoExcel`, códigos del B17). */
  private archivoComparativoFormato(): Observable<ArchivoReporte[]> {
    return this.flujoService.comparativoExcel(this.solicitudFlujo('MES', this.flefPreliminar, false)).pipe(
      map((resp) => {
        if (!resp.body) throw new Error('El backend no devolvió el Excel del comparativo.');
        const alt = `COMPARATIVO_${this.periodoNombre()}${this.flefPreliminar ? '_PRELIMINAR' : ''}.xlsx`;
        return [{ nombre: nombreDeRespuesta(resp, alt), blob: resp.body }];
      }),
    );
  }

  private archivosDeG(): Observable<ArchivoReporte[]> {
    const fn = this.archivosG();
    return fn ? fn() : throwError(() => new Error('Consulte o genere primero las G del mes.'));
  }

  /** `usuarioSesion()` lanza si no hay sesión: se convierte en error del observable. */
  private conUsuario<T>(fn: (usuario: string) => Observable<T>): Observable<T> {
    return of(null).pipe(switchMap(() => fn(usuarioSesion())));
  }

  // ─────────────────────────────────────────────────────────────── solicitudes

  private empresa(): number {
    return this.appState.getEmpresa()?.codigo ?? parseInt(localStorage.getItem('idSucursal') || '0', 10);
  }

  private fechaCorte(): string {
    return isoFecha(this.anio(), this.mes(), ultimoDiaDelMes(this.anio(), this.mes()).getDate());
  }

  private fechaInicioMes(): string {
    return isoFecha(this.anio(), this.mes(), 1);
  }

  private fechaCorteTexto(): string {
    const c = corteParaNombre(this.anio(), this.mes());
    return `${c.slice(0, 2)}/${c.slice(2, 4)}/${c.slice(4)}`;
  }

  /** aaaa-mm para los nombres de archivo que arma la pantalla. */
  private periodoNombre(): string {
    return `${this.anio()}-${String(this.mes()).padStart(2, '0')}`;
  }

  private nombreB17(preliminar: boolean): string {
    return `B17M${ENTIDAD}${corteParaNombre(this.anio(), this.mes())}${preliminar ? '_PRELIMINAR' : ''}.txt`;
  }

  private solicitudB17(preliminar: boolean): SolicitudEstructura {
    return { empresa: this.empresa(), codigoEstructura: 'B17', fechaCorte: this.fechaCorte(), preliminar };
  }

  private solicitudFlujo(periodo: 'MES' | 'ACUMULADO', preliminar: boolean, incluirDirecto: boolean): SolicitudFlujoEfectivo {
    return { empresa: this.empresa(), anio: this.anio(), mes: this.mes(), periodo, preliminar, incluirDirecto };
  }

  private solicitudFlc(): SolicitudEstructura {
    return { empresa: this.empresa(), codigoEstructura: 'FLC', fechaCorte: this.fechaCorte(), fechaInicio: this.fechaInicioMes() };
  }

  /** "A fecha de corte": acumulado desde el 1 de enero, igual que Balance General con esa opción. */
  private solicitudEstado(codigoAlterno: number): SolicitudEstadoFinanciero {
    return {
      empresa: this.empresa(),
      codigoAlterno,
      fechaInicio: isoFecha(this.anio(), 1, 1),
      fechaFin: this.fechaCorte(),
      acumulacion: 1,
      eliminarSaldosCero: true,
      comparativo: 'NINGUNO',
    };
  }

  private solicitudComparativo(): SolicitudEstadoFinanciero {
    return { ...this.solicitudEstado(ALTERNO_SITUACION), comparativo: 'CIERRE_ANIO_ANTERIOR', nivelMaximo: 4 };
  }

  // ─────────────────────────────────────────────────────────────── filas

  private actualizar(clave: string, cambios: Partial<FilaReporte>): void {
    this.filasBase.update((fs) => fs.map((f) => (f.clave === clave ? { ...f, ...cambios } : f)));
  }

  private numero(v: number | null | undefined): string {
    return Number(v ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private armarFilas(): FilaReporte[] {
    const sinRevisar = { estado: 'sin-revisar' as EstadoReporte, motivo: 'Pulse «Revisar reportes del mes».' };
    return [
      {
        clave: 'B17', nombre: 'B17 Balance (estructura)', periodicidad: 'Mensual',
        salida: '.txt de estructura (+ .ACU de la Super)', origen: 'POST /esrp/archivo',
        ...sinRevisar,
        descargas: [{ etiqueta: 'TXT', icono: 'description', enTodo: true, obtener: () => this.archivoB17() }],
      },
      {
        clave: 'G', nombre: 'G40–G51 Estructuras de partícipes y cartera', periodicidad: 'Mensual (G40 semestral)',
        salida: '.txt de estructura (12 archivos)', origen: 'POST /ejrc/ejecutar + RPR.CG40…CG51',
        estado: 'sin-revisar', motivo: '',
        descargas: [{ etiqueta: '12 TXT', icono: 'download_for_offline', enTodo: true, obtener: () => this.archivosDeG() }],
      },
      {
        clave: 'ESF', nombre: 'Estado de situación financiera', periodicidad: 'Mensual',
        salida: 'PDF / Excel con encabezado y firmas', origen: 'POST /esfo/imprimir (alterno 1)',
        ...sinRevisar,
        descargas: [
          { etiqueta: 'PDF', icono: 'picture_as_pdf', enTodo: true, obtener: () => this.archivoEstado(this.solicitudEstado(ALTERNO_SITUACION), 'PDF', 'ESTADO_SITUACION') },
          { etiqueta: 'Excel', icono: 'grid_on', enTodo: true, obtener: () => this.archivoEstado(this.solicitudEstado(ALTERNO_SITUACION), 'EXCEL', 'ESTADO_SITUACION') },
        ],
      },
      {
        clave: 'ER', nombre: 'Estado de resultados', periodicidad: 'Mensual',
        salida: 'PDF / Excel con encabezado y firmas', origen: 'POST /esfo/imprimir (alterno 3)',
        ...sinRevisar,
        descargas: [
          { etiqueta: 'PDF', icono: 'picture_as_pdf', enTodo: true, obtener: () => this.archivoEstado(this.solicitudEstado(ALTERNO_RESULTADOS), 'PDF', 'ESTADO_RESULTADOS') },
          { etiqueta: 'Excel', icono: 'grid_on', enTodo: true, obtener: () => this.archivoEstado(this.solicitudEstado(ALTERNO_RESULTADOS), 'EXCEL', 'ESTADO_RESULTADOS') },
        ],
      },
      {
        clave: 'CMP', nombre: 'Balance comparativo (diciembre anterior vs mes)', periodicidad: 'Mensual',
        salida: 'Excel con el formato de ASOPREP (COMPARATIVO_01_2026_FORMATO.xlsx)',
        origen: 'POST /flef/comparativoExcel (B17, formato ASOPREP) y POST /esfo/imprimir (CIERRE_ANIO_ANTERIOR)',
        ...sinRevisar,
        descargas: [
          { etiqueta: 'Excel formato', icono: 'grid_on', enTodo: true, obtener: () => this.archivoComparativoFormato() },
          { etiqueta: 'Excel SAA', icono: 'grid_on', enTodo: false, obtener: () => this.archivoEstado(this.solicitudComparativo(), 'EXCEL', 'BALANCE_COMPARATIVO') },
          { etiqueta: 'PDF', icono: 'picture_as_pdf', enTodo: false, obtener: () => this.archivoEstado(this.solicitudComparativo(), 'PDF', 'BALANCE_COMPARATIVO') },
          { etiqueta: 'CSV B17', icono: 'table_view', enTodo: false, obtener: () => this.archivoComparativoB17() },
        ],
      },
      {
        clave: 'FLE', nombre: 'Estado de flujos de efectivo (indirecto)', periodicidad: 'Mensual y acumulado del año',
        salida: 'Excel con el formato de ASOPREP (FLUJO DE EFECTIVO_ENE_2026 FORMATO.xlsx mensual; FLUJO EFECTIVO_12_2025.xlsx acumulado)',
        origen: 'POST /flef/excel (INDIRECTO, periodo MES o ACUMULADO)',
        ...sinRevisar,
        descargas: [
          { etiqueta: 'Excel mes', icono: 'grid_on', enTodo: true, obtener: () => this.archivoFlujoEfectivo('MES') },
          { etiqueta: 'Excel acumulado', icono: 'grid_on', enTodo: true, obtener: () => this.archivoFlujoEfectivo('ACUMULADO') },
        ],
      },
      {
        clave: 'FLC', nombre: 'Flujo de caja real (formato BIESS, directo)', periodicidad: 'Mensual (columnas por mes)',
        salida: 'Excel con el formato de ASOPREP (FLUJO DE CAJA_12_2025_FORMATO.xlsx)', origen: 'POST /flef/excel (DIRECTO, acumulado del año)',
        ...sinRevisar,
        descargas: [
          { etiqueta: 'Excel', icono: 'grid_on', enTodo: true, obtener: () => this.archivoFlujoCaja() },
          { etiqueta: 'CSV FLC provisional', icono: 'table_view', enTodo: false, obtener: () => this.archivoFlc() },
        ],
      },
      {
        clave: 'Q01', nombre: 'Q01 Quejas', periodicidad: 'Mensual',
        salida: '.txt de estructura (mayo 2025 se presentó solo con la cabecera)', origen: 'No existe en el SAA',
        estado: 'no-disponible',
        motivo: 'El SAA no registra quejas ni genera la Q01. Propuesta en C36-REPORTES-SUPER-EN-PANTALLA.md.',
        descargas: [],
      },
    ];
  }
}
