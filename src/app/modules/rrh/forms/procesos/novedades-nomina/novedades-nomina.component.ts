import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { ConceptoNomina } from '../../../model/concepto-nomina';
import { ContratoEmpleado } from '../../../model/contrato-empleado';
import { Empleado } from '../../../model/empleado';
import { NovedadNomina } from '../../../model/novedad-nomina';
import { PeriodoNomina } from '../../../model/periodo-nomina';
import { ConceptoNominaService } from '../../../service/concepto-nomina.service';
import { ContratoEmpleadoService } from '../../../service/contrato-empleado.service';
import { EmpleadoService } from '../../../service/empleado.service';
import { NovedadNominaService } from '../../../service/novedad-nomina.service';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import { aniosDisponibles, filtrarPorAnio, criteriosPorEmpresa } from '../../parametrizacion/utiles-parametrizacion';
import { referencia } from '../../comunes/cuerpo-entidad';
import { registrarEjercicios } from '../../comunes/ejercicios';
import { opcionesAviso } from '../../comunes/avisos';
import { InlineAutocompleteComponent } from '../../comunes/inline-autocomplete/inline-autocomplete.component';

/**
 * Novedades del período (RHH.NVNM) — captura en línea.
 *
 * Rediseño de 2026-08-25: deja de colgar de `app-table-basic-hijos`. Es la vía de carga manual de
 * la nómina histórica de enero–julio de 2026, pensada para carga rápida —seleccionar período y
 * añadir filas seguidas—, así que la captura vive en la propia tabla: Tab entre campos, Enter
 * confirma la fila y deja el foco listo para la siguiente, Esc la descarta. Nunca se sale de la
 * tabla a un diálogo.
 */

/** `NVNMESTD` con `DEFAULT 1` en el DDL que JPA nunca aplica: se manda explícito. */
const ESTADO_ACTIVO = 1;

/** `MPLDESTD` = 4. El mismo valor con el que `selectActivosEnPeriodo` descarta a una persona. */
const ESTADO_EMPLEADO_CESANTE = 4;

/**
 * Si el motor va a mirar esta novedad. Las dos condiciones de `selectAprobadas`, no una.
 * Sin cambios desde antes del rediseño — D19.
 */
function entraEnElCalculo(novedad: NovedadNomina): boolean {
  return novedad?.aprobada === 'S' && Number(novedad?.estado) === ESTADO_ACTIVO;
}

/** Por qué no entra, que es más útil que un «No» a secas. D19. */
function motivoFueraDelCalculo(novedad: NovedadNomina): string {
  if (novedad?.aprobada !== 'S') return 'No · sin aprobar';
  return 'No · sin estado';
}

/** Una fecha del backend —arreglo, cadena o `Date`— comparable, a medianoche. */
function aFecha(valor: any): Date | null {
  if (valor === null || valor === undefined) return null;
  if (Array.isArray(valor) && valor.length >= 3) {
    return new Date(Number(valor[0]), Number(valor[1]) - 1, Number(valor[2]));
  }
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime())
      ? null
      : new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
  }
  if (typeof valor === 'string') {
    const partes = valor.slice(0, 10).split('-');
    if (partes.length === 3) {
      const fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
      return Number.isNaN(fecha.getTime()) ? null : fecha;
    }
  }
  return null;
}

/** La fila en captura: nada todavía tiene código, y `aprobada` no se pregunta aquí — Corrección 3. */
interface FilaBorrador {
  empleado: Empleado | null;
  conceptoNomina: ConceptoNomina | null;
  cantidad: number | null;
  valor: number | null;
  descripcion: string;
}

function filaVacia(): FilaBorrador {
  return { empleado: null, conceptoNomina: null, cantidad: null, valor: null, descripcion: '' };
}

/** Campos del borrador, en el orden en que se tabula. Sirve para saber cuál falla primero. */
const CAMPOS_BORRADOR = ['empleado', 'conceptoNomina', 'valor'] as const;

@Component({
  selector: 'app-novedades-nomina',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
    InlineAutocompleteComponent,
  ],
  templateUrl: './novedades-nomina.component.html',
  styleUrls: ['./novedades-nomina.component.scss'],
})
export class NovedadesNominaComponent implements OnInit {
  anios = aniosDisponibles();
  anio = signal<number>(new Date().getFullYear());
  periodos = signal<PeriodoNomina[]>([]);
  periodoSeleccionado = signal<number | null>(null);
  novedades = signal<NovedadNomina[]>([]);
  /** Mientras esto sea cierto, un desplegable vacío significa «todavía no sé», no «no hay». D17. */
  cargandoPeriodos = signal<boolean>(true);
  cargandoNovedades = signal<boolean>(false);

  // ─── Captura en línea ──────────────────────────────────────────────────
  borrador = signal<FilaBorrador>(filaVacia());
  guardandoBorrador = signal<boolean>(false);
  /** Si el servidor rechazó la fila: se queda escrita, marcada, con el motivo a la vista. D15/D22 son la misma familia — nunca perder el dato tecleado. */
  errorBorrador = signal<string | null>(null);
  /** Se puso a `true` en el primer Enter que no pasó la validación: recién ahí se pinta en rojo. */
  intentoConfirmar = signal<boolean>(false);
  /** El concepto de la última fila confirmada: menos tecleo si la siguiente es igual. */
  ultimoConcepto = signal<ConceptoNomina | null>(null);
  /** Fila recién agregada, con temporizador para poder deshacerla sin ir a buscarla. */
  deshacer = signal<{ codigo: number; venceEn: number } | null>(null);
  private temporizadorDeshacer: ReturnType<typeof setTimeout> | null = null;

  // ─── Edición en sitio de filas existentes ─────────────────────────────
  editando = signal<number | null>(null);
  edicion = signal<FilaBorrador>(filaVacia());
  guardandoEdicion = signal<boolean>(false);
  errorEdicion = signal<string | null>(null);

  // ─── Aprobación en lote — Corrección 3 ─────────────────────────────────
  /**
   * Captura y aprobación se separan a propósito: el modelo ya tiene `usuarioAprueba`/
   * `fechaAprobacion` (NVNMUSAP/NVNMFCAP) y hoy nadie los escribe con sentido, porque aprobar era
   * responder un campo del mismo formulario de alta. Aquí se escriben de verdad, en el momento en
   * que alguien aprueba, no en el momento en que alguien teclea. No hay pantalla ni permiso propio
   * todavía —eso es backend y va por otra vía— pero el flujo ya vive separado de la captura, listo
   * para que el día que haya permiso, sea mover este bloque, no rehacerlo.
   */
  seleccionAprobar = signal<Set<number>>(new Set());
  aprobando = signal<boolean>(false);

  /** Totales vivos: se ven sin buscarlos. */
  fueraDelCalculo = computed(() => this.novedades().filter((n) => !entraEnElCalculo(n)).length);
  entranAlCalculo = computed(() => this.novedades().length - this.fueraDelCalculo());
  pendientesAprobar = computed(() => this.novedades().filter((n) => n.aprobada !== 'S'));
  totalesPorConcepto = computed(() => {
    const mapa = new Map<string, number>();
    for (const n of this.novedades()) {
      const nombre = (n.conceptoNomina as any)?.nombre ?? 'Sin concepto';
      mapa.set(nombre, (mapa.get(nombre) ?? 0) + (Number(n.valor) || 0));
    }
    return Array.from(mapa.entries())
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total);
  });

  empleados: Empleado[] = [];
  conceptos: ConceptoNomina[] = [];
  private contratos: ContratoEmpleado[] = [];

  constructor(
    private periodoService: PeriodoNominaService,
    private empleadoService: EmpleadoService,
    private conceptoService: ConceptoNominaService,
    private contratoService: ContratoEmpleadoService,
    private novedadNominaService: NovedadNominaService,
    private snackBar: MatSnackBar,
  ) {}

  /**
   * Los períodos se piden **de entrada y por su cuenta** — D17. Antes colgaban del `forkJoin` de
   * colaboradores y conceptos, así que hasta que ésos no volvían el desplegable de Período estaba
   * vacío, y un desplegable vacío aquí se lee como «el período no está creado».
   */
  ngOnInit(): void {
    this.cargarPeriodos();

    const sinFallo = (fuente: any) =>
      fuente.pipe(
        map((filas: any) => filas ?? []),
        catchError(() => of<any[]>([])),
      );

    forkJoin({
      empleados: sinFallo(this.empleadoService.selectByCriteria(criteriosPorEmpresa('apellidos'))),
      conceptos: sinFallo(this.conceptoService.selectByCriteria(criteriosPorEmpresa('nombre'))),
      contratos: sinFallo(this.contratoService.selectByCriteria([])),
    }).subscribe((datos: any) => {
      this.empleados = datos.empleados;
      this.conceptos = datos.conceptos;
      this.contratos = datos.contratos;
    });
  }

  onAnioChange(anio: number): void {
    this.anio.set(anio);
    this.periodoSeleccionado.set(null);
    this.novedades.set([]);
    this.cargarPeriodos();
  }

  private cargarPeriodos(): void {
    this.cargandoPeriodos.set(true);
    this.periodoService.selectByCriteria(criteriosPorEmpresa('mes')).subscribe({
      next: (data) => {
        registrarEjercicios(data ?? []);
        this.anios = aniosDisponibles();
        this.periodos.set(filtrarPorAnio(data, this.anio()));
        this.cargandoPeriodos.set(false);
      },
      error: () => {
        this.periodos.set([]);
        this.cargandoPeriodos.set(false);
        this.avisar('No se pudieron cargar los períodos de nómina', true);
      },
    });
  }

  onPeriodoChange(codigo: number | null): void {
    this.periodoSeleccionado.set(codigo);
    this.reiniciarBorrador();
    this.editando.set(null);
    this.seleccionAprobar.set(new Set());

    if (codigo === null) {
      this.novedades.set([]);
      return;
    }

    this.cargandoNovedades.set(true);
    this.novedadNominaService.selectByCriteria(this.criteriosDelPeriodo(codigo)).subscribe({
      next: (data) => {
        this.novedades.set(data ?? []);
        this.cargandoNovedades.set(false);
      },
      error: () => {
        this.novedades.set([]);
        this.cargandoNovedades.set(false);
        this.avisar('No se pudieron cargar las novedades del período', true);
      },
    });
  }

  private criteriosDelPeriodo(codigo: number): DatosBusqueda[] {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'periodoNomina',
      'codigo',
      codigo.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    return [db];
  }

  /**
   * Colaboradores a los que tiene sentido registrarle una novedad de **este** período — D18.
   * Sin cambios desde antes del rediseño: mismo criterio que `selectActivosEnPeriodo`, la
   * asimetría incluida (el mes de la salida no va por nómina, lo paga el finiquito).
   */
  empleadosDelPeriodo(): Empleado[] {
    const periodo = this.periodos().find((p) => p.codigo === this.periodoSeleccionado());
    if (!periodo || this.contratos.length === 0) return this.empleados;

    const desde = aFecha(periodo.fechaInicio);
    const hasta = aFecha(periodo.fechaFin);
    if (!desde || !hasta) return this.empleados;

    const conContrato = new Set<number>();
    for (const contrato of this.contratos) {
      const codigo = (contrato.empleado as any)?.codigo;
      if (codigo == null) continue;

      const inicio = aFecha(contrato.fechaInicio);
      if (!inicio || inicio > hasta) continue;

      const fin = aFecha(contrato.fechaFin);
      if (fin && fin < desde) continue;

      const terminacion = aFecha(contrato.fechaTerminacion);
      if (terminacion) {
        if (terminacion <= hasta) continue;
      } else {
        const estado = (contrato.empleado as any)?.estado;
        if (estado != null && Number(estado) === ESTADO_EMPLEADO_CESANTE) continue;
      }

      conContrato.add(Number(codigo));
    }

    const propios = this.empleados.filter((e) => conContrato.has(Number(e.codigo)));
    return propios.length > 0 ? propios : this.empleados;
  }

  etiquetaEmpleado = (empleado: any): string => {
    if (!empleado) return '';
    return `${empleado.identificacion ?? ''} — ${empleado.apellidos ?? ''} ${empleado.nombres ?? ''}`.trim();
  };

  buscarPorEmpleado = (empleado: any): string[] => [
    empleado?.identificacion ?? '',
    empleado?.apellidos ?? '',
    empleado?.nombres ?? '',
  ];

  etiquetaConcepto = (concepto: any): string => concepto?.nombre ?? '';

  buscarPorConcepto = (concepto: any): string[] => [
    concepto?.nombre ?? '',
    concepto?.codigoAlterno != null ? String(concepto.codigoAlterno) : '',
  ];

  etiquetaPeriodo(periodo: PeriodoNomina): string {
    return `${periodo.mes}/${periodo.anio}`;
  }

  calculoLabel(n: NovedadNomina): string {
    return entraEnElCalculo(n) ? 'Sí' : motivoFueraDelCalculo(n);
  }

  /** Envuelve la función de módulo — D19 sin tocar — para que la plantilla pueda llamarla. */
  entra(n: NovedadNomina): boolean {
    return entraEnElCalculo(n);
  }

  /** `conceptoNomina` es `ConceptoNomina | { codigo }` según venga del backend o de un borrador local. */
  nombreConcepto(n: NovedadNomina): string {
    return (n?.conceptoNomina as any)?.nombre ?? '';
  }

  // ─── Captura en línea ──────────────────────────────────────────────────

  private reiniciarBorrador(): void {
    const vacia = filaVacia();
    // Menos tecleo: si la fila anterior fue de este concepto, seguramente la siguiente también.
    const concepto = this.ultimoConcepto();
    if (concepto) {
      vacia.conceptoNomina = concepto;
      if (concepto.valor !== null && concepto.valor !== undefined) vacia.valor = concepto.valor;
    }
    this.borrador.set(vacia);
    this.errorBorrador.set(null);
    this.intentoConfirmar.set(false);
  }

  onBorradorConceptoChange(item: ConceptoNomina | null): void {
    const actual = this.borrador();
    // Si el concepto elegido es de valor fijo, se propone: menos tecleo, y se puede corregir.
    const valor =
      item && item.valor !== null && item.valor !== undefined ? item.valor : actual.valor;
    this.borrador.set({ ...actual, conceptoNomina: item, valor });
  }

  onBorradorCampo(campo: keyof FilaBorrador, valor: any): void {
    this.borrador.set({ ...this.borrador(), [campo]: valor });
  }

  /** Primer campo del borrador que le falta, en el orden en que se tabula, o `null` si está listo. */
  campoBorradorInvalido(): (typeof CAMPOS_BORRADOR)[number] | null {
    const fila = this.borrador();
    if (!fila.empleado) return 'empleado';
    if (!fila.conceptoNomina) return 'conceptoNomina';
    if (fila.valor === null || fila.valor === undefined || Number.isNaN(Number(fila.valor))) {
      return 'valor';
    }
    return null;
  }

  /** Enter en cualquier campo de la fila en captura: confirma, o se queda si algo falta. */
  confirmarBorrador(): void {
    if (this.guardandoBorrador()) return;

    const invalido = this.campoBorradorInvalido();
    if (invalido) {
      this.intentoConfirmar.set(true);
      this.errorBorrador.set(null);
      document.getElementById(`borrador-${invalido}`)?.focus();
      return;
    }

    const fila = this.borrador();
    const cuerpo = {
      periodoNomina: { codigo: this.periodoSeleccionado() },
      empleado: referencia(fila.empleado),
      conceptoNomina: referencia(fila.conceptoNomina),
      cantidad: fila.cantidad,
      valor: fila.valor,
      descripcion: fila.descripcion || null,
      // Corrección 3: la captura no pregunta «Aprobada» fila por fila. Nace sin aprobar y sin
      // firma; la firma de verdad se escribe al aprobar, no al capturar.
      aprobada: 'N',
      estado: ESTADO_ACTIVO,
      usuarioAprueba: null,
      fechaAprobacion: null,
      usuarioRegistro: usuarioSesion(),
    };

    this.guardandoBorrador.set(true);
    this.errorBorrador.set(null);
    this.novedadNominaService.add(cuerpo).subscribe({
      next: (creada) => {
        this.guardandoBorrador.set(false);
        if (creada) {
          // El dato que se ve viene siempre de lo que el servidor devolvió, nunca del tecleo — D11.
          this.novedades.set([...this.novedades(), creada]);
          this.ofrecerDeshacer(creada.codigo);
        } else {
          // El backend respondió sin cuerpo; se relee el período para no enseñar un dato inventado.
          this.recargarNovedades();
        }
        this.ultimoConcepto.set(fila.conceptoNomina);
        this.reiniciarBorrador();
        document.getElementById('borrador-empleado')?.focus();
      },
      error: (err) => {
        this.guardandoBorrador.set(false);
        // La fila NO se pierde ni se vacía: se queda tecleada, con el motivo a la vista.
        this.errorBorrador.set(this.mensajeDeError(err));
      },
    });
  }

  cancelarBorrador(): void {
    this.reiniciarBorrador();
  }

  private ofrecerDeshacer(codigo: number): void {
    if (this.temporizadorDeshacer) clearTimeout(this.temporizadorDeshacer);
    const SEGUNDOS = 8;
    this.deshacer.set({ codigo, venceEn: SEGUNDOS });
    this.temporizadorDeshacer = setTimeout(() => this.deshacer.set(null), SEGUNDOS * 1000);
  }

  deshacerUltimaFila(): void {
    const pendiente = this.deshacer();
    if (!pendiente) return;
    if (this.temporizadorDeshacer) clearTimeout(this.temporizadorDeshacer);
    this.deshacer.set(null);

    this.novedadNominaService.delete(pendiente.codigo).subscribe({
      next: () => {
        this.novedades.set(this.novedades().filter((n) => n.codigo !== pendiente.codigo));
        this.avisar('Fila deshecha.');
      },
      error: (err) => this.avisar(this.mensajeDeError(err, 'No se pudo deshacer la fila.'), true),
    });
  }

  // ─── Edición en sitio ──────────────────────────────────────────────────

  editarFila(fila: NovedadNomina): void {
    if (this.editando() === fila.codigo) return;
    this.editando.set(fila.codigo);
    this.edicion.set({
      empleado: (fila.empleado as any) ?? null,
      conceptoNomina: (fila.conceptoNomina as any) ?? null,
      cantidad: fila.cantidad ?? null,
      valor: fila.valor ?? null,
      descripcion: fila.descripcion ?? '',
    });
    this.errorEdicion.set(null);
  }

  onEdicionConceptoChange(item: ConceptoNomina | null): void {
    this.edicion.set({ ...this.edicion(), conceptoNomina: item });
  }

  onEdicionCampo(campo: keyof FilaBorrador, valor: any): void {
    this.edicion.set({ ...this.edicion(), [campo]: valor });
  }

  cancelarEdicion(): void {
    this.editando.set(null);
    this.errorEdicion.set(null);
  }

  confirmarEdicion(): void {
    const codigo = this.editando();
    if (codigo === null || this.guardandoEdicion()) return;

    const fila = this.edicion();
    if (!fila.empleado || !fila.conceptoNomina || fila.valor === null || fila.valor === undefined) {
      this.errorEdicion.set('Falta colaborador, concepto o valor.');
      return;
    }

    const original = this.novedades().find((n) => n.codigo === codigo);
    if (!original) return;

    const cuerpo = {
      ...original,
      empleado: referencia(fila.empleado),
      conceptoNomina: referencia(fila.conceptoNomina),
      cantidad: fila.cantidad,
      valor: fila.valor,
      descripcion: fila.descripcion || null,
      periodoNomina: referencia(original.periodoNomina),
    };

    this.guardandoEdicion.set(true);
    this.errorEdicion.set(null);
    this.novedadNominaService.update(cuerpo).subscribe({
      next: (actualizada) => {
        this.guardandoEdicion.set(false);
        if (actualizada) {
          this.novedades.set(
            this.novedades().map((n) => (n.codigo === codigo ? actualizada : n)),
          );
        } else {
          this.recargarNovedades();
        }
        this.editando.set(null);
      },
      error: (err) => {
        this.guardandoEdicion.set(false);
        // La edición tampoco se pierde: se queda abierta, con el motivo a la vista.
        this.errorEdicion.set(this.mensajeDeError(err));
      },
    });
  }

  eliminarFila(fila: NovedadNomina): void {
    this.novedadNominaService.delete(fila.codigo).subscribe({
      next: () => {
        this.novedades.set(this.novedades().filter((n) => n.codigo !== fila.codigo));
        if (this.editando() === fila.codigo) this.editando.set(null);
      },
      error: (err) => this.avisar(this.mensajeDeError(err, 'No se pudo eliminar la fila.'), true),
    });
  }

  // ─── Aprobación en lote ────────────────────────────────────────────────

  seleccionadaParaAprobar(codigo: number): boolean {
    return this.seleccionAprobar().has(codigo);
  }

  alternarSeleccion(codigo: number): void {
    const set = new Set(this.seleccionAprobar());
    if (set.has(codigo)) set.delete(codigo);
    else set.add(codigo);
    this.seleccionAprobar.set(set);
  }

  seleccionarTodasPendientes(): void {
    this.seleccionAprobar.set(new Set(this.pendientesAprobar().map((n) => n.codigo)));
  }

  limpiarSeleccion(): void {
    this.seleccionAprobar.set(new Set());
  }

  aprobarSeleccionadas(): void {
    const codigos = Array.from(this.seleccionAprobar());
    if (codigos.length === 0 || this.aprobando()) return;

    const filas = this.novedades().filter((n) => codigos.includes(n.codigo));
    const usuario = usuarioSesion();
    const ahora = new Date();

    this.aprobando.set(true);
    forkJoin(
      filas.map((fila) =>
        this.novedadNominaService.update({
          ...fila,
          empleado: referencia(fila.empleado),
          conceptoNomina: referencia(fila.conceptoNomina),
          periodoNomina: referencia(fila.periodoNomina),
          aprobada: 'S',
          estado: ESTADO_ACTIVO,
          usuarioAprueba: usuario,
          fechaAprobacion: ahora,
        }),
      ),
    ).subscribe({
      next: (actualizadas) => {
        this.aprobando.set(false);
        const porCodigo = new Map(actualizadas.filter(Boolean).map((n) => [n!.codigo, n!]));
        this.novedades.set(this.novedades().map((n) => porCodigo.get(n.codigo) ?? n));
        this.limpiarSeleccion();
        this.avisar(`${actualizadas.filter(Boolean).length} novedad(es) aprobada(s).`);
      },
      error: (err) => {
        this.aprobando.set(false);
        this.avisar(this.mensajeDeError(err, 'No se pudieron aprobar las novedades seleccionadas.'), true);
        this.recargarNovedades();
      },
    });
  }

  private recargarNovedades(): void {
    const codigo = this.periodoSeleccionado();
    if (codigo === null) return;
    this.novedadNominaService.selectByCriteria(this.criteriosDelPeriodo(codigo)).subscribe({
      next: (data) => this.novedades.set(data ?? []),
    });
  }

  private mensajeDeError(error: any, generico = 'El proceso no se pudo completar.'): string {
    if (typeof error === 'string' && error.trim()) return error;
    return error?.mensaje || error?.message || generico;
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', { ...opcionesAviso(esError, mensaje) });
  }
}
