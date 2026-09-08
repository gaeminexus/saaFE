import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { AppStateService } from '../../../../../shared/services/app-state.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { Periodo } from '../../../../cnt/model/periodo';
import { PeriodoService } from '../../../../cnt/service/periodo.service';
// InlineAutocompleteComponent vive en rrh/forms/comunes — es genérico (sin ningún acoplamiento a
// Empleado/RRHH en su código), y ya tiene CVA + valorPor + etiquetaVacio de las fases 1-2 de la
// migración de combos. Importarlo tal cual desde acá crea una dependencia tsr → rrh que hoy no
// existe, pero es la misma clase de dependencia cruzada que ya existe al revés (tsr ya lo
// consume `cxp`, `cxp` ya consume `tsr`) — no es un precedente nuevo en este repo. Moverlo a
// `shared/` es la respuesta más limpia a mediano plazo (así lo pidió el árbitro), pero se deja
// para su propio lote: mover el archivo toca los ~6 usos de `rrh` que están en medio de su
// propia migración de combos (lote A), y esta pantalla no debería ser la que la destsabilice.
import { InlineAutocompleteComponent } from '../../../../rrh/forms/comunes/inline-autocomplete/inline-autocomplete.component';
import { CuentaBancaria } from '../../../model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../service/cuenta-bancaria.service';
import { Conciliacion, ESTADO_CIERRE_CONCILIACION } from '../../../model/conciliacion';
import { ConciliacionService } from '../../../service/conciliacion.service';
import {
  CerrarConciliacionRequest,
  ConciliadoDelMes,
  PartidaDeclarada,
  PrepararCierreResponse,
  TIPO_TRANSITO_LABELS,
  TipoTransito,
  coeficienteTransito,
} from '../../../model/conciliacion-cierre';
import { ConciliacionCierreService } from '../../../service/conciliacion-cierre.service';

/** Tolerancia de la ecuación clásica — la misma que usa el cierre de caja chica y conciliarGrupo. */
const TOLERANCIA_DIFERENCIA = 0.01;

/** Claves de `localStorage` para recordar si cada sección quedó abierta o cerrada. */
const CLAVE_CONCILIADOS_ABIERTO = 'conciliacion-cierre.conciliados.abierto';
const CLAVE_PENDIENTES_ABIERTO = 'conciliacion-cierre.pendientes.abierto';

/**
 * Fila unificada para la tabla de pendientes. El backend las devuelve en dos
 * arrays separados (`pendientesAsiento`/`pendientesExtracto`, con distintos
 * campos de id cada uno) — se combinan acá solo para pintar una tabla, pero
 * el payload de cierre sigue mandando cada una por su campo real: las de
 * origen LIBROS anclan en `idDetalleAsiento` (siempre presente),
 * `idMovimientoBanco` viaja aparte como dato informativo opcional; las de
 * origen EXTRACTO anclan en `idDetalleExtracto`. Toda fila es declarable
 * desde la corrección del 2026-08-27 (§7bis/§10.4 en saaBE) — ya no existe
 * el caso de una línea de libros sin `MovimientoBanco` que no se pueda
 * declarar.
 */
interface FilaPendiente {
  key: string;
  origen: 'LIBROS' | 'EXTRACTO';
  idDetalleAsiento: number | null;
  idMovimientoBanco: number | null;
  idDetalleExtracto: number | null;
  fecha: unknown;
  descripcion: string;
  valor: number;
  esArrastrada: boolean;
  tipoSugerido: number | null;

  // ── Campos nuevos (solo lado LIBROS) — ver nota de "sin confirmar" en el modelo ──
  numeroAlternoAsiento: string | null;
  numeroAsiento: number | null;
  observacionAsiento: string | null;
  origenPago: string | null;
  idOrigenPago: number | null;
  referenciaBanco: string | null;
  idPago: number | null;
}

/** Estado de clasificación de una fila pendiente, editable por el usuario. */
interface EstadoFila {
  declarada: boolean;
  tipo: number;
  observacion: string;
}

/**
 * Cierre de conciliación con partidas en tránsito. Ver
 * docs/logica-negocio/tsr/DISENO-CONCILIACION-PARTIDAS-EN-TRANSITO.md en
 * saaBE — la ecuación clásica reemplaza la exigencia de "cero pendientes":
 * el mes cierra si (saldoLibros − t1 + t2 + t3 − t4) cuadra con
 * saldoExtracto dentro de la tolerancia (ver `coeficienteTransito` en el
 * modelo para el razonamiento completo, con ejemplo numérico).
 */
@Component({
  selector: 'app-conciliacion-cierre',
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
    MatSortModule,
    MatPaginatorModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatSnackBarModule,
    InlineAutocompleteComponent,
  ],
  templateUrl: './conciliacion-cierre.component.html',
  styleUrls: ['./conciliacion-cierre.component.scss'],
})
export class ConciliacionCierreComponent implements OnInit, AfterViewChecked {
  private cierreS = inject(ConciliacionCierreService);
  private conciliacionS = inject(ConciliacionService);
  private cuentaS = inject(CuentaBancariaService);
  private periodoS = inject(PeriodoService);
  private appState = inject(AppStateService);
  private funcionesDatosS = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  readonly ESTADO_CIERRE_CONCILIACION = ESTADO_CIERRE_CONCILIACION;

  readonly TipoTransito = TipoTransito;
  readonly tipoTransitoOptions = Object.entries(TIPO_TRANSITO_LABELS).map(([codigo, texto]) => ({
    codigo: Number(codigo),
    texto,
  }));

  cuentas = signal<CuentaBancaria[]>([]);
  periodos = signal<Periodo[]>([]);
  cargandoCatalogos = signal(false);

  cuentaSeleccionada = signal<CuentaBancaria | null>(null);
  periodoSeleccionado = signal<Periodo | null>(null);

  // ── Histórico de cierres de la cuenta/período seleccionados (ítem 1.3 del lote) ──
  historicoCierres = signal<Conciliacion[]>([]);
  cargandoHistorico = signal(false);
  anulandoCierre = signal<number | null>(null);

  onCuentaChange(cuenta: CuentaBancaria | null): void {
    this.cuentaSeleccionada.set(cuenta);
    this.cargarHistoricoCierres();
  }

  onPeriodoChange(periodo: Periodo | null): void {
    this.periodoSeleccionado.set(periodo);
    this.cargarHistoricoCierres();
  }

  // ── Combos: etiqueta/búsqueda para InlineAutocomplete (ítem 2) ──
  etiquetaCuenta = (c: CuentaBancaria | null): string => c ? `${c.banco?.nombre ?? 'Banco'} — ${c.numeroCuenta}` : '';
  buscarPorCuenta = (c: CuentaBancaria): string[] => [c.banco?.nombre ?? '', c.numeroCuenta ?? ''];
  etiquetaPeriodo = (p: Periodo | null): string => p ? (p.nombre || `${p.mes}/${p.anio}`) : '';
  buscarPorPeriodo = (p: Periodo): string[] => [p.nombre ?? '', String(p.mes ?? ''), String(p.anio ?? '')];

  preparando = signal(false);
  preparado = signal<PrepararCierreResponse | null>(null);
  filas = signal<FilaPendiente[]>([]);
  /** Estado editable de cada fila, por key — no vive dentro de `preparado` para que la ecuación en vivo sea siempre un computed() sobre signals. */
  estadoFilas = signal<Record<string, EstadoFila>>({});

  /**
   * Saldo del extracto: arranca en `saldoExtractoSugerido` cuando el backend
   * lo trae. Puede venir `null` (sin filas de extracto en el período de qué
   * tomarlo) — en ese caso NO se asume 0: queda `null` hasta que el usuario
   * lo escriba a mano, y la ecuación no se muestra mientras tanto.
   */
  saldoExtracto = signal<number | null>(null);

  cerrando = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  columnasConciliados = ['idGrupo', 'fecha', 'valorAsiento', 'valorExtracto', 'usuario'];
  columnasPendientes = ['declarar', 'origen', 'fecha', 'descripcion', 'valor', 'tipo', 'observacion', 'detalle'];

  // ── Secciones colapsables (ítem 1) ──────────────────────────────────
  conciliadosAbierto = signal<boolean>(this.leerEstadoPanel(CLAVE_CONCILIADOS_ABIERTO, false));
  pendientesAbierto = signal<boolean>(this.leerEstadoPanel(CLAVE_PENDIENTES_ABIERTO, true));

  /** Cuántas de las pendientes ya se marcaron como declaradas — visible aunque la sección esté cerrada. */
  pendientesClasificadas = computed(() => {
    const estados = this.estadoFilas();
    return this.filas().filter((f) => estados[f.key]?.declarada).length;
  });
  pendientesFaltantes = computed(() => this.filas().length - this.pendientesClasificadas());

  private leerEstadoPanel(clave: string, porDefecto: boolean): boolean {
    try {
      const guardado = localStorage.getItem(clave);
      return guardado === null ? porDefecto : guardado === 'true';
    } catch {
      return porDefecto;
    }
  }

  private guardarEstadoPanel(clave: string, valor: boolean): void {
    try {
      localStorage.setItem(clave, String(valor));
    } catch {
      // Sin persistencia disponible (modo privado, storage lleno, etc.): la pantalla sigue
      // funcionando con el valor en memoria, solo no se recuerda entre visitas.
    }
  }

  onConciliadosToggle(abierto: boolean): void {
    this.conciliadosAbierto.set(abierto);
    this.guardarEstadoPanel(CLAVE_CONCILIADOS_ABIERTO, abierto);
  }

  onPendientesToggle(abierto: boolean): void {
    this.pendientesAbierto.set(abierto);
    this.guardarEstadoPanel(CLAVE_PENDIENTES_ABIERTO, abierto);
  }

  // ── Fila expandida (ítem 3 — origen del movimiento) ─────────────────
  private expandidas = signal<Set<string>>(new Set());

  toggleExpandir(key: string): void {
    this.expandidas.update((set) => {
      const nuevo = new Set(set);
      if (nuevo.has(key)) nuevo.delete(key); else nuevo.add(key);
      return nuevo;
    });
  }

  estaExpandida(key: string): boolean {
    return this.expandidas().has(key);
  }

  /**
   * Solo tiene sentido expandir una fila de LIBROS: es la única que puede traer observación de
   * asiento, origen del pago o referencia bancaria. Una línea de extracto no tiene nada de eso.
   */
  esExpandible(f: FilaPendiente): boolean {
    return f.origen === 'LIBROS';
  }

  /**
   * Número de asiento a mostrar: el alterno (el que usa contabilidad para identificarlo) cuando
   * lo haya, y el consecutivo interno como respaldo — mismo criterio que
   * `numeroAsientoMostrar()` de conciliación contable, reusado acá tal cual.
   */
  numeroAsientoMostrar(f: FilaPendiente): string {
    const alterno = f.numeroAlternoAsiento;
    if (alterno != null && alterno.trim() !== '') return alterno;
    return f.numeroAsiento != null ? String(f.numeroAsiento) : '—';
  }

  /** Consulta y gestión no filtra todavía por `idPago` — el queryParam queda listo para cuando esa pantalla lo lea. */
  irAConsultaPago(idPago: number): void {
    this.router.navigate(['/menutesoreria/pagos/consulta'], { queryParams: { idPago } });
  }

  // ── Tabla "Conciliados del mes" — matSort + paginador (85 filas típicas) ──
  readonly dataSourceConciliados = new MatTableDataSource<ConciliadoDelMes>([]);
  @ViewChild('sortConciliados') sortConciliados?: MatSort;
  @ViewChild('paginadorConciliados') paginadorConciliados?: MatPaginator;

  // ── Tabla "Pendientes" — matSort SIN paginador a propósito: `todoDeclarado()` exige ver
  // TODAS las filas, y paginar podría esconder una sin declarar detrás de otra página, haciendo
  // parecer terminada una clasificación que no lo está. La tabla scrollea sola en su lugar.
  readonly dataSourcePendientes = new MatTableDataSource<FilaPendiente>([]);
  @ViewChild('sortPendientes') sortPendientes?: MatSort;

  constructor() {
    this.dataSourceConciliados.sortingDataAccessor = (row: ConciliadoDelMes, property: string): string | number => {
      switch (property) {
        case 'fecha': {
          const d = this.funcionesDatosS.convertirFechaDesdeBackend(row.fechaConciliacion as any);
          return d ? d.getTime() : 0;
        }
        case 'valorAsiento': return Number(row.valorAsiento) || 0;
        case 'valorExtracto': return Number(row.valorExtracto) || 0;
        case 'usuario': return row.usuarioConcilia ?? '';
        default: return (row as any)[property] ?? '';
      }
    };

    // `[dataSource]` de "Pendientes" tiene que ser un MatTableDataSource, no el arreglo plano de
    // la señal `filas`: matSort no reordena nada sobre un array crudo, solo sobre un
    // MatTableDataSource con `.sort` conectado — asignarlo directo dejaría las flechas de orden
    // moviéndose sin que la tabla cambiara una sola fila de lugar.
    this.dataSourcePendientes.sortingDataAccessor = (row: FilaPendiente, property: string): string | number => {
      switch (property) {
        case 'fecha': {
          const d = this.funcionesDatosS.convertirFechaDesdeBackend(row.fecha as any);
          return d ? d.getTime() : 0;
        }
        case 'origen': return this.origenLabel(row.origen);
        case 'valor': return Number(row.valor) || 0;
        case 'descripcion': return row.descripcion ?? '';
        default: return (row as any)[property] ?? '';
      }
    };
  }

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  ngAfterViewChecked(): void {
    if (this.sortConciliados && this.dataSourceConciliados.sort !== this.sortConciliados) {
      this.dataSourceConciliados.sort = this.sortConciliados;
    }
    if (this.paginadorConciliados && this.dataSourceConciliados.paginator !== this.paginadorConciliados) {
      this.dataSourceConciliados.paginator = this.paginadorConciliados;
    }
    if (this.sortPendientes && this.dataSourcePendientes.sort !== this.sortPendientes) {
      this.dataSourcePendientes.sort = this.sortPendientes;
    }
  }

  private cargarCatalogos(): void {
    const idEmpresa = this.appState.getEmpresa()?.codigo;
    if (!idEmpresa) {
      this.cuentas.set([]);
      this.periodos.set([]);
      this.errorMsg.set('No se pudo determinar la empresa de la sesión');
      return;
    }

    this.cargandoCatalogos.set(true);

    this.cuentaS.getAll().subscribe({
      next: (data) => this.cuentas.set(Array.isArray(data) ? (data as CuentaBancaria[]).filter((c) => Number(c.estado) === 1) : []),
      error: () => this.cuentas.set([]),
    });

    this.periodoS.getAll().subscribe({
      next: (data) => {
        const todos = Array.isArray(data) ? data : [];
        this.periodos.set(todos.filter((p) => p.empresa?.codigo === idEmpresa));
        this.cargandoCatalogos.set(false);
      },
      error: () => {
        this.periodos.set([]);
        this.cargandoCatalogos.set(false);
      },
    });
  }

  puedePreparar(): boolean {
    return !!this.cuentaSeleccionada() && !!this.periodoSeleccionado() && !this.preparando();
  }

  /**
   * Cierres ya declarados (`TSR.CNCL`) para la cuenta/período seleccionados — vía el CRUD
   * genérico `GET /cncl/selectByCriteria` (ver `ConciliacionRest`/`ConciliacionService`), el
   * mismo mecanismo estándar de listado por criterios usado en todo el resto del sistema. No
   * existe un endpoint dedicado a "listar cierres": este es el que ya lista TSR.CNCL, filtrado
   * por cuenta y período. Se descartan las filas con `estadoCierre` nulo — son del mecanismo
   * viejo (`insertaConciliacion`) que nunca llegó a producción y no tiene anulación.
   */
  private cargarHistoricoCierres(): void {
    const cuenta = this.cuentaSeleccionada();
    const periodo = this.periodoSeleccionado();
    if (!cuenta || !periodo) {
      this.historicoCierres.set([]);
      return;
    }

    this.cargandoHistorico.set(true);

    const dbCuenta = new DatosBusqueda();
    dbCuenta.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'cuentaBancaria', 'codigo', String(cuenta.codigo), TipoComandosBusqueda.IGUAL);

    const dbPeriodo = new DatosBusqueda();
    dbPeriodo.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'idPeriodo', String(periodo.codigo), TipoComandosBusqueda.IGUAL);

    this.conciliacionS.selectByCriteria([dbCuenta, dbPeriodo]).subscribe({
      next: (data) => {
        const filas = (data || [])
          .filter((c) => c.estadoCierre != null)
          .sort((a, b) => Number(b.codigo) - Number(a.codigo));
        this.historicoCierres.set(filas);
        this.cargandoHistorico.set(false);
      },
      error: () => {
        this.historicoCierres.set([]);
        this.cargandoHistorico.set(false);
      },
    });
  }

  estadoCierreLabel(estado: number | null | undefined): string {
    if (estado === ESTADO_CIERRE_CONCILIACION.CERRADO) return 'Cerrado';
    if (estado === ESTADO_CIERRE_CONCILIACION.ANULADO) return 'Anulado';
    if (estado === ESTADO_CIERRE_CONCILIACION.BORRADOR) return 'Borrador';
    return '—';
  }

  /**
   * Solo el cierre CERRADO más reciente de la cuenta/período es anulable — el backend
   * (`ConciliacionCierreServiceImpl.anularCierre`) rechaza cualquier otro con
   * "Solo se puede anular el ultimo cierre...". Se oculta el botón en los demás para no ofrecer
   * una acción que el servidor va a rechazar siempre.
   */
  esCierreVigente(row: Conciliacion): boolean {
    const cerrados = this.historicoCierres().filter((c) => c.estadoCierre === ESTADO_CIERRE_CONCILIACION.CERRADO);
    if (!cerrados.length) return false;
    const maxCodigo = Math.max(...cerrados.map((c) => Number(c.codigo)));
    return Number(row.codigo) === maxCodigo;
  }

  puedeAnularCierre(row: Conciliacion): boolean {
    return row.estadoCierre === ESTADO_CIERRE_CONCILIACION.CERRADO && this.esCierreVigente(row);
  }

  /**
   * `anularCierre` en saaBE (confirmado leyendo `ConciliacionCierreServiceImpl.java`): borra las
   * filas de `TSR.DTCN` (`DetalleTransito`) que este cierre declaró —las partidas vuelven a
   * Pendiente y reaparecen como "arrastradas" en el próximo `prepararCierre()`— y deja el `CNCL`
   * en ANULADO con el motivo. Rechaza si alguna de esas partidas ya fue saldada (hay que deshacer
   * esa conciliación primero) o si no es el último cierre de la cuenta/período. No revierte
   * ningún asiento contable ni movimiento bancario: este mecanismo de tránsito no genera asiento
   * propio, solo declara partidas ya existentes como "en tránsito".
   */
  anularCierreHistorico(row: Conciliacion): void {
    if (!row.codigo || !this.puedeAnularCierre(row)) return;

    const data: MotivoDialogData = {
      titulo: `Anular cierre N° ${row.codigo}`,
      advertencia:
        `Se anulará el cierre de ${this.etiquetaCuenta(this.cuentaSeleccionada())} del período ` +
        `${this.etiquetaPeriodo(this.periodoSeleccionado())}. Las partidas que este cierre declaró en tránsito ` +
        `volverán a quedar pendientes de conciliar. No se revierte ningún asiento contable ni movimiento ` +
        `bancario — solo esta declaración de tránsito.`,
      textoConfirmar: 'Sí, anular cierre',
    };

    this.dialog.open(MotivoDialogComponent, { width: '560px', data }).afterClosed().subscribe((motivo: string | null) => {
      if (!motivo || !row.codigo) return;

      this.anulandoCierre.set(row.codigo);
      this.errorMsg.set('');
      this.successMsg.set('');

      this.cierreS.anular(row.codigo, { motivo, idUsuario: this.appState.getIdUsuario() }).subscribe({
        next: () => {
          this.anulandoCierre.set(null);
          this.successMsg.set(`Cierre N° ${row.codigo} anulado correctamente.`);
          this.snackBar.open('✓ Cierre anulado correctamente', 'Cerrar', { duration: 4000, panelClass: ['snackbar-success'] });
          this.cargarHistoricoCierres();
          // Si había una preparación en pantalla de esta misma cuenta/período, refrescarla: las
          // partidas que este cierre declaró vuelven a aparecer como pendientes.
          if (this.preparado()) this.prepararCierre();
        },
        error: (err) => {
          this.anulandoCierre.set(null);
          this.errorMsg.set(mensajeDeError(err, 'No se pudo anular el cierre'));
        },
      });
    });
  }

  prepararCierre(): void {
    const cuenta = this.cuentaSeleccionada();
    const periodo = this.periodoSeleccionado();
    if (!cuenta || !periodo) return;

    this.preparando.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');
    this.preparado.set(null);
    this.filas.set([]);
    this.dataSourcePendientes.data = [];
    this.estadoFilas.set({});
    this.expandidas.set(new Set());

    this.cierreS.preparar(cuenta.codigo, periodo.codigo).subscribe({
      next: (resp) => {
        this.preparando.set(false);
        this.preparado.set(resp);
        this.saldoExtracto.set(resp.saldoExtractoSugerido);
        this.dataSourceConciliados.data = resp.conciliadosDelMes ?? [];

        const filasAsiento: FilaPendiente[] = (resp.pendientesAsiento ?? []).map((p) => ({
          key: `asiento-${p.idDetalleAsiento}`,
          origen: 'LIBROS',
          idDetalleAsiento: p.idDetalleAsiento,
          idMovimientoBanco: p.idMovimientoBanco,
          idDetalleExtracto: null,
          fecha: p.fecha,
          descripcion: p.descripcion,
          valor: p.valor,
          esArrastrada: p.esArrastrada,
          tipoSugerido: p.tipoSugerido,
          numeroAlternoAsiento: p.numeroAlternoAsiento ?? null,
          numeroAsiento: p.numeroAsiento ?? null,
          observacionAsiento: p.observacionAsiento ?? null,
          origenPago: p.origen ?? null,
          idOrigenPago: p.idOrigen ?? null,
          referenciaBanco: p.referenciaBanco ?? null,
          idPago: p.idPago ?? null,
        }));
        const filasExtracto: FilaPendiente[] = (resp.pendientesExtracto ?? []).map((p) => ({
          key: `extracto-${p.idDetalleExtracto}`,
          origen: 'EXTRACTO',
          idDetalleAsiento: null,
          idMovimientoBanco: null,
          idDetalleExtracto: p.idDetalleExtracto,
          fecha: p.fecha,
          descripcion: p.descripcion,
          valor: p.valor,
          esArrastrada: p.esArrastrada,
          tipoSugerido: p.tipoSugerido,
          numeroAlternoAsiento: null,
          numeroAsiento: null,
          observacionAsiento: null,
          origenPago: null,
          idOrigenPago: null,
          referenciaBanco: null,
          idPago: null,
        }));
        const todasLasFilas = [...filasAsiento, ...filasExtracto];
        this.filas.set(todasLasFilas);
        this.dataSourcePendientes.data = todasLasFilas;

        const estados: Record<string, EstadoFila> = {};
        for (const f of todasLasFilas) {
          estados[f.key] = {
            // Proponer marcada con el tipo sugerido: el usuario no debería clasificar a mano.
            declarada: f.tipoSugerido != null,
            tipo: f.tipoSugerido ?? TipoTransito.DEPOSITO_EN_TRANSITO,
            observacion: '',
          };
        }
        this.estadoFilas.set(estados);
      },
      error: (err) => {
        this.preparando.set(false);
        this.errorMsg.set(mensajeDeError(err, 'No se pudo preparar el cierre'));
      },
    });
  }

  toggleDeclarada(key: string, valor: boolean): void {
    this.estadoFilas.update((estados) => ({
      ...estados,
      [key]: { ...estados[key], declarada: valor },
    }));
  }

  cambiarTipo(key: string, tipo: number): void {
    this.estadoFilas.update((estados) => ({
      ...estados,
      [key]: { ...estados[key], tipo },
    }));
  }

  cambiarObservacion(key: string, observacion: string): void {
    this.estadoFilas.update((estados) => ({
      ...estados,
      [key]: { ...estados[key], observacion },
    }));
  }

  estadoDe(key: string): EstadoFila | undefined {
    return this.estadoFilas()[key];
  }

  /** Suma con coeficiente de las filas actualmente declaradas — ver coeficienteTransito() en el modelo. */
  sumaDeclaradas = computed(() => {
    const filas = this.filas();
    const estados = this.estadoFilas();
    let suma = 0;
    for (const f of filas) {
      const estado = estados[f.key];
      if (!estado?.declarada) continue;
      suma += coeficienteTransito(estado.tipo) * Number(f.valor || 0);
    }
    return suma;
  });

  /**
   * saldoLibros − t1 + t2 + t3 − t4 (declaradas) − saldoExtracto. `null`
   * mientras no haya `preparado()` O el usuario todavía no ingresó el saldo
   * del extracto — no se muestra una diferencia calculada contra un 0
   * inventado.
   */
  diferenciaViva = computed(() => {
    const prep = this.preparado();
    const saldoExtracto = this.saldoExtracto();
    if (!prep || saldoExtracto == null) return null;
    return prep.saldoLibros + this.sumaDeclaradas() - saldoExtracto;
  });

  cuadra = computed(() => {
    const d = this.diferenciaViva();
    return d != null && Math.abs(d) <= TOLERANCIA_DIFERENCIA;
  });

  /** Ningún pendiente puede quedar sin declarar — igual que exige `verificar()` en el backend (§10.2). */
  todoDeclarado = computed(() => {
    const estados = this.estadoFilas();
    return this.filas().every((f) => estados[f.key]?.declarada);
  });

  puedeCerrar = computed(() => !!this.preparado() && this.cuadra() && this.todoDeclarado() && !this.cerrando());

  cerrarConciliacion(): void {
    const cuenta = this.cuentaSeleccionada();
    const periodo = this.periodoSeleccionado();
    const prep = this.preparado();
    const saldoExtracto = this.saldoExtracto();
    // `puedeCerrar()` ya exige `cuadra()`, que a su vez exige `saldoExtracto != null` —
    // esta comprobación es solo para que TypeScript sepa que no es null al construir el payload.
    if (!cuenta || !periodo || !prep || saldoExtracto == null || !this.puedeCerrar()) return;

    const estados = this.estadoFilas();
    const partidas: PartidaDeclarada[] = this.filas()
      .filter((f) => estados[f.key]?.declarada)
      .map((f) => ({
        idDetalleAsiento: f.origen === 'LIBROS' ? f.idDetalleAsiento : undefined,
        idMovimientoBanco: f.origen === 'LIBROS' ? (f.idMovimientoBanco ?? undefined) : undefined,
        idDetalleExtracto: f.origen === 'EXTRACTO' ? f.idDetalleExtracto : undefined,
        tipo: estados[f.key].tipo,
        observacion: estados[f.key].observacion.trim() || undefined,
      }));

    const payload: CerrarConciliacionRequest = {
      idCuentaBancaria: cuenta.codigo,
      idPeriodo: periodo.codigo,
      partidas,
      saldoExtracto,
      idUsuario: this.appState.getIdUsuario(),
    };

    this.cerrando.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    this.cierreS.cerrar(payload).subscribe({
      next: (resp) => {
        this.cerrando.set(false);
        this.successMsg.set(`Conciliación cerrada correctamente (cierre N° ${resp.idCierre}).`);
        this.snackBar.open('✓ Conciliación cerrada correctamente', 'Cerrar', {
          duration: 4000,
          panelClass: ['snackbar-success'],
        });
        this.preparado.set(null);
        this.filas.set([]);
        this.dataSourcePendientes.data = [];
        this.estadoFilas.set({});
      },
      error: (err) => {
        this.cerrando.set(false);
        this.errorMsg.set(mensajeDeError(err, 'No se pudo cerrar la conciliación'));
      },
    });
  }

  tipoLabel(tipo: number | null | undefined): string {
    if (tipo == null) return '—';
    return TIPO_TRANSITO_LABELS[tipo] || `Tipo ${tipo}`;
  }

  origenLabel(origen: string): string {
    return origen === 'EXTRACTO' ? 'Extracto' : 'Libros';
  }

  fechaDisplay(fecha: unknown): string {
    return this.funcionesDatosS.formatoFecha(fecha as any, FuncionesDatosService.SOLO_FECHA) || '—';
  }

  /**
   * Días desde `fecha` hasta hoy. Para una fila arrastrada, `fecha` YA es la
   * fecha original del movimiento (`fechaTransaccion`/`asiento.fechaAsiento`)
   * — el backend no agregó un campo aparte, según §10.1 en saaBE.
   */
  diasArrastrada(f: FilaPendiente): number {
    if (!f.esArrastrada) return 0;
    const fecha = this.funcionesDatosS.convertirFechaDesdeBackend(f.fecha as any);
    if (!fecha) return 0;
    const ms = Date.now() - fecha.getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  }

  /** Umbral visual: mismo criterio de 60 días del aviso de antigüedad (§8 del diseño). */
  esArrastradaAntigua(f: FilaPendiente): boolean {
    return f.esArrastrada && this.diasArrastrada(f) >= 60;
  }

  get faltaParaCuadrar(): string {
    const d = this.diferenciaViva();
    if (d == null) return '';
    return Math.abs(d).toFixed(2);
  }
}
