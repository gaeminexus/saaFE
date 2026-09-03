import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

import { CargaArchivo } from '../../../../model/carga-archivo';
import { DetalleCargaArchivo } from '../../../../model/detalle-carga-archivo';
import { ParticipeXCargaArchivo } from '../../../../model/participe-x-carga-archivo';
import { NovedadParticipeCarga } from '../../../../model/novedad-participe-carga';
import { PrevueloAfectacionCarga } from '../../../../model/prevuelo-afectacion';

import { CargaArchivoService } from '../../../../service/carga-archivo.service';
import { DetalleCargaArchivoService } from '../../../../service/detalle-carga-archivo.service';
import { ParticipeXCargaArchivoService } from '../../../../service/participe-x-carga-archivo.service';
import { NovedadParticipeCargaService } from '../../../../service/novedad-participe-carga.service';
import { ServiciosAsoprepService } from '../../../../../asoprep/service/servicios-asoprep.service';

import { AfectacionParticipeDialogComponent } from '../../../../dialog/afectacion-participe-dialog/afectacion-participe-dialog.component';

type EstadoParticipe = 'EXCESO' | 'FALTANTE' | 'SIN_DATO';

interface ParticipeConNovedades {
  codigoPetro: number;
  nombre: string;
  /**
   * `SUM(PXCA.PXCADSDO)` de este partícipe en la carga — el DESCONTADO, no el pozo afectable.
   *
   * ⛔ NO es lo mismo que el `disponible` de `/asgn/topeAfectacion` (encontrado con datos reales
   * 2026-09-03, caso SANCHEZ 7508: descontado 406,73, pozo real 298,19). El endpoint del tope
   * aplica `min(descontado, pool)` y otras reglas que esta pantalla no reimplementa — mostrar esta
   * suma como si fuera "disponible para afectar" es exactamente la contradicción que el rediseño
   * vino a eliminar, reintroducida en la lista. Se muestra igual, pero rotulado "Descontado" — el
   * pozo real solo se sabe abriendo el detalle del partícipe (mismo `topeAfectacion` que ya usa el
   * diálogo).
   */
  totalDescontado: number;
  /** Motivos (tipoNovedad > 3) — lo que se muestra en la fila y lo que ve el diálogo como "MOTIVOS". */
  novedades: NovedadParticipeCarga[];
  /**
   * TODAS las novedades de este partícipe en la carga, sin el filtro `tipoNovedad > 3` — el
   * diálogo las necesita completas para el fan-out de afectaciones ya guardadas y para decidir de
   * qué novedad cuelga cada destino. Filtrarlas acá fue el origen del bug de "asignado" contado de
   * menos (2026-09-03): una novedad con `tipoNovedad <= 3` puede tener afectaciones guardadas que
   * este filtro dejaba afuera del fan-out.
   */
  todasNovedades: NovedadParticipeCarga[];
  estado: EstadoParticipe;
  /** Solo con estado EXCESO o FALTANTE — viene del prevuelo, nunca inventado acá. */
  monto?: number;
  /** Mensaje del backend, tal cual — solo con EXCESO o FALTANTE. */
  mensaje?: string;
  /**
   * Pozo real a repartir (`TopeAfectacionManual.disponible` / `Prevuelo...disponible`, MISMO
   * campo que usa el diálogo) — nunca el `totalDescontado` de arriba. `undefined` mientras se
   * calcula (ver `cargarDesglosePendientes`).
   */
  aRepartir?: number;
  /** `totalDescontado - aRepartir`, redondeado — lo que el flujo automático aplica solo, sin pasar por reparto manual. */
  seAplicaSolo?: number;
}

/**
 * Afectación por partícipe (`docs/crd/PLAN-AFECTACION-POR-PARTICIPE.md`). Pieza NUEVA, construida
 * aparte de `detalle-consulta-carga` — esa pantalla no se toca. Reemplaza, para comparación, dos
 * piezas de ella: el listado de novedades (acá agrupado por partícipe, no por novedad) y el
 * diálogo de afectación (acá `AfectacionParticipeDialogComponent`, un partícipe/un pozo/un estado
 * en vez de un diálogo por novedad).
 *
 * ⛔ El criterio de comparación es del usuario: en cuál le resulta más cómodo procesar. Un
 * partícipe con UNA sola novedad tiene que verse igual de simple que hoy (§7.4) — nada de pasos ni
 * clics extra para el caso común.
 *
 * El estado EXCESO/FALTANTE de cada fila sale de `GET /rest/asgn/prevueloAfectacion` (mismo
 * endpoint del botón «Verificar antes de procesar» en `detalle-consulta-carga`) — una sola llamada
 * para toda la carga, sin repetir la validación del backend en el cliente. Un partícipe que no
 * aparece en ninguna de las dos listas del prevuelo se muestra como SIN_DATO: puede estar completo
 * o directamente sin ninguna afectación manual todavía — la cifra exacta se ve al abrir su diálogo
 * (mismo costo que hoy: una consulta de tope por partícipe, no por toda la carga).
 */
@Component({
  selector: 'app-afectacion-por-participe',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './afectacion-por-participe.component.html',
  styleUrl: './afectacion-por-participe.component.scss',
})
export class AfectacionPorParticipeComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cargaArchivoService = inject(CargaArchivoService);
  private detalleCargaArchivoService = inject(DetalleCargaArchivoService);
  private participeXCargaArchivoService = inject(ParticipeXCargaArchivoService);
  private novedadParticipeCargaService = inject(NovedadParticipeCargaService);
  private serviciosAsoprepService = inject(ServiciosAsoprepService);

  idCarga = 0;
  cargaArchivo = signal<CargaArchivo | null>(null);
  cargando = signal(true);
  errorCarga = signal<string | null>(null);

  private participantes = signal<ParticipeConNovedades[]>([]);
  /**
   * Signal, no una propiedad común (bug encontrado 2026-09-03, reportado por el usuario buscando
   * "cabrera"): `participantesFiltrados` es un `computed`, y un `computed` solo se recalcula
   * cuando cambia una SEÑAL de la que depende — escribir en una propiedad común no invalida nada,
   * así que el filtro quedaba pegado al valor de la última vez que el `computed` se había
   * recalculado por otro motivo.
   */
  filtroTexto = signal('');
  filtroEstado = signal<'TODOS' | EstadoParticipe>('TODOS');

  participantesFiltrados = computed(() => {
    const estado = this.filtroEstado();
    const q = this.normalizarTexto(this.filtroTexto());
    return this.participantes().filter((p) => {
      if (estado !== 'TODOS' && p.estado !== estado) return false;
      if (!q) return true;
      return this.normalizarTexto(p.nombre).includes(q) || String(p.codigoPetro).includes(q);
    });
  });

  totalConExceso = computed(() => this.participantes().filter((p) => p.estado === 'EXCESO').length);
  totalConFaltante = computed(() => this.participantes().filter((p) => p.estado === 'FALTANTE').length);
  totalParticipantes = computed(() => this.participantes().length);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorCarga.set('No se proporcionó ID de carga');
      this.cargando.set(false);
      return;
    }
    this.idCarga = parseInt(id, 10);
    this.cargarTodo();
  }

  volver(): void {
    this.router.navigate(['/menucreditos/archivos-petro/carga/consulta']);
  }

  recargar(): void {
    this.cargarTodo();
  }

  private cargarTodo(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.cargaArchivoService.getById(this.idCarga.toString()).subscribe({
      next: (carga) => {
        if (!carga) {
          this.cargando.set(false);
          this.errorCarga.set('No se encontró la carga de archivo.');
          return;
        }
        this.cargaArchivo.set(carga);
        this.cargarParticipantesYNovedades();
      },
      error: () => {
        this.cargando.set(false);
        this.errorCarga.set('No se pudo cargar la carga de archivo.');
      },
    });
  }

  /**
   * Mismo camino probado que `detalle-consulta-carga.component.ts#cargarDetalles/cargarParticipes`
   * (fan-out por `DetalleCargaArchivo`, un `selectByCriteria` por detalle) — no un atajo nuevo sin
   * probar contra el servidor real, en una pantalla nueva de un control financiero.
   */
  private cargarParticipantesYNovedades(): void {
    const criterioDetalles: DatosBusqueda[] = [];
    const dbDetalle = new DatosBusqueda();
    dbDetalle.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'cargaArchivo',
      'codigo',
      String(this.idCarga),
      TipoComandosBusqueda.IGUAL
    );
    criterioDetalles.push(dbDetalle);

    this.detalleCargaArchivoService.selectByCriteria(criterioDetalles).subscribe({
      next: (detallesData) => {
        const detalles: DetalleCargaArchivo[] = Array.isArray(detallesData)
          ? detallesData
          : detallesData
          ? [detallesData]
          : [];

        if (detalles.length === 0) {
          this.cargando.set(false);
          this.errorCarga.set('No se encontraron detalles para esta carga.');
          return;
        }

        const observablesParticipes = detalles.map((detalle) => {
          const criterio: DatosBusqueda[] = [];
          const db = new DatosBusqueda();
          db.asignaValorConCampoPadre(
            TipoDatosBusqueda.LONG,
            'detalleCargaArchivo',
            'codigo',
            String(detalle.codigo),
            TipoComandosBusqueda.IGUAL
          );
          criterio.push(db);
          return this.participeXCargaArchivoService.selectByCriteria(criterio).pipe(catchError(() => of(null)));
        });

        forkJoin(observablesParticipes).subscribe((resultados) => {
          const registrosParticipesCarga: ParticipeXCargaArchivo[] = [];
          resultados.forEach((r) => {
            if (!r) return;
            registrosParticipesCarga.push(...(Array.isArray(r) ? r : [r]));
          });

          this.cargarNovedadesYArmarLista(registrosParticipesCarga);
        });
      },
      error: () => {
        this.cargando.set(false);
        this.errorCarga.set('No se pudieron cargar los detalles de la carga.');
      },
    });
  }

  /**
   * Misma consulta que ya usa `detalle-consulta-carga` — TODAS las novedades de la carga, SIN el
   * filtro `tipoNovedad > 3` acá (el filtro se aplica después, solo para decidir qué se muestra
   * como "motivo" — nunca para lo que el diálogo necesita completo, ver `todasNovedades`).
   */
  private cargarNovedadesYArmarLista(registrosParticipesCarga: ParticipeXCargaArchivo[]): void {
    const registrosByCodigo = new Map<number, ParticipeXCargaArchivo>(
      registrosParticipesCarga.filter((r) => r.codigo != null).map((r) => [r.codigo, r])
    );

    const criterios: DatosBusqueda[] = [];
    const dbCarga = new DatosBusqueda();
    dbCarga.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.LONG,
      'codigoCargaArchivo',
      String(this.idCarga),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(dbCarga);
    const dbOrden = new DatosBusqueda();
    dbOrden.orderBy('tipoNovedad');
    dbOrden.setTipoOrden(DatosBusqueda.ORDER_ASC);
    criterios.push(dbOrden);

    this.novedadParticipeCargaService
      .selectByCriteria(criterios)
      .pipe(
        map((novedadesData) =>
          (novedadesData || []).map((novedad) => {
            const codigoParticipe = novedad.participeXCargaArchivo?.codigo;
            const participeCompleto = codigoParticipe ? registrosByCodigo.get(codigoParticipe) : undefined;
            return {
              ...novedad,
              participeXCargaArchivo: participeCompleto || novedad.participeXCargaArchivo,
            } as NovedadParticipeCarga;
          })
        ),
        catchError(() => of([] as NovedadParticipeCarga[]))
      )
      .subscribe((todasNovedades) => {
        this.serviciosAsoprepService.prevueloAfectacion(this.idCarga).subscribe({
          next: (prevuelo) => this.armarListaParticipantes(registrosParticipesCarga, todasNovedades, prevuelo),
          // El prevuelo es un PLUS informativo acá (el estado exacto se ve igual al abrir el
          // diálogo, vía tope por partícipe) — si falla, la lista se arma igual, todos SIN_DATO.
          error: () => this.armarListaParticipantes(registrosParticipesCarga, todasNovedades, null),
        });
      });
  }

  private armarListaParticipantes(
    registrosParticipesCarga: ParticipeXCargaArchivo[],
    todasNovedades: NovedadParticipeCarga[],
    prevuelo: PrevueloAfectacionCarga | null
  ): void {
    const descontadoPorRol = new Map<number, number>();
    const nombrePorRol = new Map<number, string>();
    registrosParticipesCarga.forEach((r) => {
      if (!r.codigoPetro) return;
      descontadoPorRol.set(r.codigoPetro, this.redondear((descontadoPorRol.get(r.codigoPetro) || 0) + (r.totalDescontado || 0)));
      if (!nombrePorRol.has(r.codigoPetro)) nombrePorRol.set(r.codigoPetro, r.nombre);
    });

    const todasNovedadesPorRol = new Map<number, NovedadParticipeCarga[]>();
    todasNovedades.forEach((n) => {
      const rol = n.participeXCargaArchivo?.codigoPetro;
      if (!rol) return;
      const lista = todasNovedadesPorRol.get(rol) ?? [];
      lista.push(n);
      todasNovedadesPorRol.set(rol, lista);
    });

    // Mismo filtro que `detalle-consulta-carga` para decidir qué es "motivo" (lo que se muestra
    // en la fila y en el diálogo) — pero solo para ESO. El fan-out de afectaciones y el matching
    // de destinos usan `todasNovedadesPorRol`, sin filtrar (ver comentario de `todasNovedades`).
    const motivosPorRol = new Map<number, NovedadParticipeCarga[]>();
    todasNovedades
      .filter((n) => (n.tipoNovedad || 0) > 3)
      .forEach((n) => {
        const rol = n.participeXCargaArchivo?.codigoPetro;
        if (!rol) return;
        const lista = motivosPorRol.get(rol) ?? [];
        lista.push(n);
        motivosPorRol.set(rol, lista);
      });

    const excesoPorRol = new Map<number, { monto: number; mensaje: string; disponible: number }>(
      (prevuelo?.detalle ?? []).map((d) => [d.codigoPetro, { monto: d.exceso, mensaje: d.mensaje, disponible: d.disponible }])
    );
    const faltantePorRol = new Map<number, { monto: number; mensaje: string; disponible: number }>(
      (prevuelo?.detalleFaltante ?? []).map((d) => [d.codigoPetro, { monto: d.faltante, mensaje: d.mensaje, disponible: d.disponible }])
    );

    const participantes: ParticipeConNovedades[] = Array.from(motivosPorRol.entries()).map(([codigoPetro, novs]) => {
      const exceso = excesoPorRol.get(codigoPetro);
      const faltante = faltantePorRol.get(codigoPetro);
      const totalDescontado = descontadoPorRol.get(codigoPetro) || 0;
      let estado: EstadoParticipe = 'SIN_DATO';
      let monto: number | undefined;
      let mensaje: string | undefined;
      let aRepartir: number | undefined;
      if (exceso) {
        estado = 'EXCESO';
        monto = exceso.monto;
        mensaje = exceso.mensaje;
        aRepartir = exceso.disponible;
      } else if (faltante) {
        estado = 'FALTANTE';
        monto = faltante.monto;
        mensaje = faltante.mensaje;
        aRepartir = faltante.disponible;
      }

      return {
        codigoPetro,
        nombre: nombrePorRol.get(codigoPetro) || novs[0]?.participeXCargaArchivo?.nombre || `Rol ${codigoPetro}`,
        totalDescontado,
        novedades: novs,
        todasNovedades: todasNovedadesPorRol.get(codigoPetro) ?? novs,
        estado,
        monto,
        mensaje,
        aRepartir,
        seAplicaSolo: aRepartir != null ? this.redondear(Math.max(totalDescontado - aRepartir, 0)) : undefined,
      };
    });

    // EXCESO y FALTANTE primero (es lo que el operador necesita ver de un vistazo), después el
    // resto por nombre.
    const prioridad: Record<EstadoParticipe, number> = { EXCESO: 0, FALTANTE: 1, SIN_DATO: 2 };
    participantes.sort((a, b) => prioridad[a.estado] - prioridad[b.estado] || a.nombre.localeCompare(b.nombre));

    this.participantes.set(participantes);
    this.cargando.set(false);
    this.cargarDesglosePendientes();
  }

  /**
   * Para los SIN_DATO (ni exceso ni faltante en el prevuelo) todavía no se sabe el pozo real —
   * el prevuelo no trae `disponible` para ellos. Se pide en paralelo, una vez, después de pintar
   * la lista (nunca bloquea el primer render): mismo `topeAfectacion` que ya usa el diálogo, no
   * una fórmula nueva. Si alguno falla, esa fila se queda sin desglose — nunca se aproxima.
   */
  private cargarDesglosePendientes(): void {
    const pendientes = this.participantes().filter((p) => p.aRepartir === undefined);
    if (pendientes.length === 0) return;

    const consultas = pendientes.map((p) =>
      this.serviciosAsoprepService.topeAfectacion(this.idCarga, p.codigoPetro).pipe(
        map((tope) => ({ codigoPetro: p.codigoPetro, disponible: tope?.disponible })),
        catchError(() => of({ codigoPetro: p.codigoPetro, disponible: undefined as number | undefined }))
      )
    );

    forkJoin(consultas).subscribe((resultados) => {
      const disponiblePorRol = new Map(resultados.map((r) => [r.codigoPetro, r.disponible]));
      this.participantes.update((actuales) =>
        actuales.map((p) => {
          const disponible = disponiblePorRol.get(p.codigoPetro);
          if (disponible === undefined) return p;
          return { ...p, aRepartir: disponible, seAplicaSolo: this.redondear(Math.max(p.totalDescontado - disponible, 0)) };
        })
      );
    });
  }

  abrirParticipe(p: ParticipeConNovedades): void {
    const ref = this.dialog.open(AfectacionParticipeDialogComponent, {
      width: '1100px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        idCarga: this.idCarga,
        codigoPetro: p.codigoPetro,
        nombreParticipe: p.nombre,
        // TODAS las novedades (sin el filtro tipoNovedad > 3) — el diálogo las necesita completas
        // para el fan-out de afectaciones y el matching de destinos (ver `todasNovedades` arriba).
        novedades: p.todasNovedades,
        // Solo las "motivo" (tipoNovedad > 3) para la sección MOTIVOS del diálogo.
        motivos: p.novedades,
      },
    });

    ref.afterClosed().subscribe((guardado) => {
      if (guardado) {
        // El guardado cambió el reparto de este partícipe — refresca la lista completa para que
        // el chip de exceso/faltante (que sale del prevuelo) quede al día.
        this.cargarTodo();
      }
    });
  }

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private redondear(n: number): number {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  /**
   * Mismo criterio que `normalizarNombreParaComparar` (`CargaArchivoPetroServiceImpl`, backend):
   * mayúsculas, Ñ→N explícito, NFD, quitar diacríticos — para que buscar "madronero" o "sebastian"
   * sin tilde encuentre "MADROÑERO"/"SEBASTIÁN" (bug encontrado 2026-09-03 con nombres reales de
   * la carga). Se aplica a los dos lados de la comparación (lo tipeado y `p.nombre`).
   */
  private normalizarTexto(texto: string): string {
    return texto
      .trim()
      .toUpperCase()
      .replace(/Ñ/g, 'N')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  }
}
