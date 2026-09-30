import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { guardarArchivo } from '../../../../shared/services/descarga-reporte';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { JasperReportesService } from '../../../../shared/services/jasper-reportes.service';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import { formatearMoneda } from '../../../../shared/utils/moneda.util';
import { ConfirmarDeclaracionDialogComponent } from '../../dialog/plazo-vencido/confirmar-declaracion-dialog.component';
import { RevertirDeclaracionDialogComponent } from '../../dialog/plazo-vencido/revertir-declaracion-dialog.component';
import {
  CuadroPlazoVencido,
  DeclaracionPlazoVencido,
  EstadoPlazoVencido,
  FiltrosListarPlazoVencido,
  FormatoDocumentoPlazoVencido,
  PrestamoADeclararPlazoVencido,
  ResultadoDeclaracionPlazoVencido,
  TEXTO_ESTADO_PLAZO_VENCIDO,
} from '../../model/plazo-vencido/plazo-vencido.model';
import { PlazoVencidoService } from '../../service/plazo-vencido.service';

/**
 * Fila de la tabla de candidatos (pestaña 1). El nro. de memorando NO vive acá — vive en el signal
 * `memorandos` (Map por `idPrestamo`): un `computed` no reacciona a la mutación de una propiedad
 * plana de un objeto, así que si estuviera acá `puedeDeclarar` podía quedar colgado con "false"
 * después de escribir el memorando (defecto reportado el 2026-09-30, ver `memorandos` más abajo).
 */
interface FilaCandidatoPlazoVencido {
  cuadro: CuadroPlazoVencido;
}

/** `Todos` | solo `valido=true` | solo `valido=false` — filtro de "estado del cálculo" (ítem 1). */
type FiltroEstadoCalculo = 'todos' | 'habilitados' | 'inconsistencias';

/** Columnas ordenables de la tabla de candidatos (ítem 2 — mínimo pedido por el árbitro). */
type ColumnaOrdenCandidatos = 'numero' | 'participe' | 'inicioMora' | 'total';

/** Fila mutable de la bandeja "Por liquidar" (pestaña 2): cada una lleva su propia fecha de corte. */
interface FilaPorLiquidar {
  declaracion: DeclaracionPlazoVencido;
  fechaCorte: Date;
  liquidando: boolean;
}

/**
 * Declaración de plazo vencido — memorando, liquidación y reverso (§11,
 * docs/crd/API-PASE-A-PLAZO-VENCIDO.md).
 *
 * El backend recalcula SIEMPRE (§2.1 del contrato): esta pantalla nunca manda un monto que ella
 * misma calculó. Lo que muestra la tabla de candidatos es una vista previa; `declarar` vuelve a
 * calcular todo a la fecha de corte y graba eso.
 *
 * ⛔ H13: un 409/422 del backend se muestra TAL CUAL (`PlazoVencidoService` ya lo entrega así, sin
 * convertirlo en "sin datos"). No se reemplaza por un mensaje genérico.
 */
@Component({
  selector: 'app-plazo-vencido',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './plazo-vencido.component.html',
  styleUrl: './plazo-vencido.component.scss',
})
export class PlazoVencidoComponent {
  private servicio = inject(PlazoVencidoService);
  private funcionesDatos = inject(FuncionesDatosService);
  private jasperReportes = inject(JasperReportesService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly hoy = new Date();
  readonly EstadoPlazoVencido = EstadoPlazoVencido;
  readonly textoEstado = TEXTO_ESTADO_PLAZO_VENCIDO;
  formatMoneda = formatearMoneda;

  // ========================= Pestaña 1: Declarar =========================

  fechaCorteDeclarar = signal<Date>(new Date());
  consultandoCandidatos = signal(false);
  errorCandidatos = signal<string | null>(null);
  filasCandidatos = signal<FilaCandidatoPlazoVencido[]>([]);
  /**
   * Claves de `idPrestamo`, nunca de fila ni de índice de página: así la selección sobrevive a
   * cambiar de filtro o de página (ítem 2, regla dura del árbitro). `FilaCandidatoPlazoVencido`
   * tampoco se clona al filtrar/ordenar/paginar — es siempre la misma referencia de
   * `filasCandidatos()` — así que `numeroMemorando` tecleado en una fila que un filtro esconde
   * después no se pierde.
   */
  seleccionados = signal<Set<number>>(new Set());

  /**
   * Nro. de memorando por `idPrestamo`, en un signal (no una propiedad plana de la fila): así
   * `puedeDeclarar` y compañía SÍ se recalculan cuando el usuario lo teclea, sea cual sea el orden
   * en que seleccionó la fila y escribió el memorando. Igual que `seleccionados`, sobrevive a
   * filtros/orden/página porque está indexado por `idPrestamo`, no por posición en ningún arreglo.
   */
  memorandos = signal<Map<number, string>>(new Map());

  // ---- filtros en memoria sobre `filasCandidatos()` (ítem 1) — no vuelven a llamar al backend ----
  filtroTexto = signal('');
  filtroTipoCredito = signal<string | null>(null);
  filtroMoraDesde = signal<Date | null>(null);
  filtroMoraHasta = signal<Date | null>(null);
  filtroTotalMin = signal<number | null>(null);
  filtroTotalMax = signal<number | null>(null);
  filtroEstadoCalculo = signal<FiltroEstadoCalculo>('todos');

  // ---- orden y paginado, también en memoria (ítem 2) ----
  ordenColumna = signal<ColumnaOrdenCandidatos | null>(null);
  ordenDireccion = signal<'asc' | 'desc'>('asc');
  paginaActual = signal(0);
  tamanoPagina = signal(25);
  readonly opcionesTamanoPagina = [25, 50, 100];

  tiposCreditoDisponibles = computed(() => {
    const set = new Set<string>();
    for (const f of this.filasCandidatos()) if (f.cuadro.tipoCredito) set.add(f.cuadro.tipoCredito);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  });

  /** Filtrado en memoria (ítem 1): texto sin mayúsculas ni tildes, tipo, rango de mora, rango de total, estado del cálculo. */
  filasFiltradas = computed(() => {
    const texto = this.normalizarTexto(this.filtroTexto());
    const tipo = this.filtroTipoCredito();
    const desde = this.filtroMoraDesde();
    const hasta = this.filtroMoraHasta();
    const min = this.filtroTotalMin();
    const max = this.filtroTotalMax();
    const estadoCalculo = this.filtroEstadoCalculo();

    return this.filasCandidatos().filter((f) => {
      const c = f.cuadro;
      if (estadoCalculo === 'habilitados' && !c.valido) return false;
      if (estadoCalculo === 'inconsistencias' && c.valido) return false;
      if (tipo && c.tipoCredito !== tipo) return false;

      if (texto) {
        const encontrado =
          this.normalizarTexto(c.numeroPrestamo).includes(texto) ||
          this.normalizarTexto(c.nombreParticipe).includes(texto) ||
          this.normalizarTexto(c.cedula).includes(texto);
        if (!encontrado) return false;
      }

      if (desde && (!c.fechaInicioMora || c.fechaInicioMora.getTime() < this.inicioDelDia(desde).getTime())) return false;
      if (hasta && (!c.fechaInicioMora || c.fechaInicioMora.getTime() > this.finDelDia(hasta).getTime())) return false;

      if (min != null && (c.totalPorCobrar ?? 0) < min) return false;
      if (max != null && (c.totalPorCobrar ?? 0) > max) return false;

      return true;
    });
  });

  /** Solo las filtradas que además se pueden seleccionar — para el checkbox de cabecera y su contador. */
  filasFiltradasHabilitadas = computed(() => this.filasFiltradas().filter((f) => f.cuadro.valido));

  todosVisiblesSeleccionados = computed(() => {
    const habilitadas = this.filasFiltradasHabilitadas();
    if (!habilitadas.length) return false;
    const set = this.seleccionados();
    return habilitadas.every((f) => set.has(f.cuadro.idPrestamo));
  });

  algunosVisiblesSeleccionados = computed(() => {
    const set = this.seleccionados();
    return this.filasFiltradasHabilitadas().some((f) => set.has(f.cuadro.idPrestamo));
  });

  filasOrdenadas = computed(() => {
    const columna = this.ordenColumna();
    const filtradas = this.filasFiltradas();
    if (!columna) return filtradas;

    const factor = this.ordenDireccion() === 'asc' ? 1 : -1;
    return [...filtradas].sort((a, b) => {
      switch (columna) {
        case 'numero':
          return factor * a.cuadro.numeroPrestamo.localeCompare(b.cuadro.numeroPrestamo, 'es', { numeric: true });
        case 'participe':
          return factor * a.cuadro.nombreParticipe.localeCompare(b.cuadro.nombreParticipe, 'es');
        case 'inicioMora':
          return factor * this.compararFechas(a.cuadro.fechaInicioMora, b.cuadro.fechaInicioMora);
        case 'total':
          return factor * ((a.cuadro.totalPorCobrar ?? 0) - (b.cuadro.totalPorCobrar ?? 0));
      }
    });
  });

  /** Página actual, ya filtrada y ordenada — lo único que el `@for` de la tabla recorre. */
  filasPagina = computed(() => {
    const inicio = this.paginaActual() * this.tamanoPagina();
    return this.filasOrdenadas().slice(inicio, inicio + this.tamanoPagina());
  });

  paraNombre = signal('');
  paraCargo = signal('');
  ccNombre = signal('');
  ccCargo = signal('');
  cargandoEncabezado = signal(false);

  declarando = signal(false);
  resultadoDeclaracion = signal<ResultadoDeclaracionPlazoVencido[] | null>(null);

  filasSeleccionadas = computed(() => {
    const set = this.seleccionados();
    return this.filasCandidatos().filter((f) => set.has(f.cuadro.idPrestamo));
  });

  totalSeleccionado = computed(() =>
    +this.filasSeleccionadas().reduce((s, f) => s + (f.cuadro.totalPorCobrar ?? 0), 0).toFixed(2)
  );

  cuotasSinSeguroSeleccionado = computed(() =>
    this.filasSeleccionadas().reduce((s, f) => s + (f.cuadro.cuotasConSeguroAAnular ?? 0), 0)
  );

  encabezadoCompleto = computed(
    () => !!this.paraNombre().trim() && !!this.paraCargo().trim() && !!this.ccNombre().trim() && !!this.ccCargo().trim()
  );

  /** Cuántas filas seleccionadas todavía no tienen memorando — para el aviso bajo el botón. */
  seleccionadosSinMemorando = computed(() => {
    const memos = this.memorandos();
    return this.filasSeleccionadas().filter((f) => !this.memorandoValido(memos.get(f.cuadro.idPrestamo))).length;
  });

  puedeDeclarar = computed(() => {
    if (this.declarando() || !this.seleccionados().size || !this.encabezadoCompleto()) return false;
    return this.seleccionadosSinMemorando() === 0;
  });

  /** Una sola línea explicando por qué el botón está deshabilitado — `null` cuando SÍ se puede declarar. */
  motivoNoPuedeDeclarar = computed(() => {
    if (this.declarando() || this.puedeDeclarar()) return null;
    if (!this.seleccionados().size) return 'Seleccione al menos un préstamo.';
    if (!this.encabezadoCompleto()) return 'Complete PARA y CC.';
    const faltantes = this.seleccionadosSinMemorando();
    return `Falta el Nro. de memorando en ${faltantes} préstamo${faltantes === 1 ? '' : 's'} seleccionado${faltantes === 1 ? '' : 's'}.`;
  });

  constructor() {
    this.cargarEncabezado();
    this.cargarPorLiquidar();
    this.buscarHistorial();

    // Cualquier cambio de filtro vuelve a la página 0 — si no, se puede quedar viendo una página
    // vacía porque el filtro nuevo dejó menos filas de las que había antes.
    effect(() => {
      this.filtroTexto();
      this.filtroTipoCredito();
      this.filtroMoraDesde();
      this.filtroMoraHasta();
      this.filtroTotalMin();
      this.filtroTotalMax();
      this.filtroEstadoCalculo();
      this.paginaActual.set(0);
    });
  }

  private cargarEncabezado(): void {
    this.cargandoEncabezado.set(true);
    this.servicio.ultimoEncabezado().subscribe({
      next: (enc) => {
        this.cargandoEncabezado.set(false);
        this.paraNombre.set(enc.paraNombre ?? '');
        this.paraCargo.set(enc.paraCargo ?? '');
        this.ccNombre.set(enc.ccNombre ?? '');
        this.ccCargo.set(enc.ccCargo ?? '');
      },
      error: (e: Error) => {
        this.cargandoEncabezado.set(false);
        this.mostrarError(e.message);
      },
    });
  }

  consultarCandidatos(): void {
    const fecha = this.servicio.formatearFecha(this.fechaCorteDeclarar());
    if (!fecha) {
      this.errorCandidatos.set('Indique una fecha de corte válida.');
      return;
    }

    this.consultandoCandidatos.set(true);
    this.errorCandidatos.set(null);
    this.resultadoDeclaracion.set(null);
    this.seleccionados.set(new Set());
    this.memorandos.set(new Map());
    this.limpiarFiltrosCandidatos();

    this.servicio.candidatos(fecha).subscribe({
      next: (filas) => {
        this.consultandoCandidatos.set(false);
        this.filasCandidatos.set(filas.map((cuadro) => ({ cuadro })));
      },
      error: (e: Error) => {
        this.consultandoCandidatos.set(false);
        this.filasCandidatos.set([]);
        this.errorCandidatos.set(e.message);
      },
    });
  }

  alternarSeleccion(fila: FilaCandidatoPlazoVencido): void {
    if (!fila.cuadro.valido) return;
    const set = new Set(this.seleccionados());
    if (set.has(fila.cuadro.idPrestamo)) set.delete(fila.cuadro.idPrestamo);
    else set.add(fila.cuadro.idPrestamo);
    this.seleccionados.set(set);
  }

  estaSeleccionado(fila: FilaCandidatoPlazoVencido): boolean {
    return this.seleccionados().has(fila.cuadro.idPrestamo);
  }

  memorandoDe(idPrestamo: number): string {
    return this.memorandos().get(idPrestamo) ?? '';
  }

  /** Solo dígitos, máximo 5 (D26): lo que se teclea de más se filtra, nunca se rechaza en silencio. */
  setMemorando(idPrestamo: number, valor: string): void {
    const soloDigitos = (valor ?? '').replace(/\D/g, '').slice(0, 5);
    const map = new Map(this.memorandos());
    map.set(idPrestamo, soloDigitos);
    this.memorandos.set(map);
  }

  /** Un memorando vacío o «0» cuentan como faltantes (pedido del árbitro, 2026-09-30). */
  private memorandoValido(valor: string | undefined): boolean {
    const limpio = (valor ?? '').trim();
    if (!limpio) return false;
    const numero = parseInt(limpio, 10);
    return Number.isFinite(numero) && numero > 0;
  }

  /** Para resaltar en rojo el campo de una fila seleccionada: vacío o «0» cuentan como faltantes. */
  memorandoFaltante(idPrestamo: number): boolean {
    return !this.memorandoValido(this.memorandoDe(idPrestamo));
  }

  /**
   * Vista previa informativa de cómo va a quedar el memorando compuesto (D26,
   * docs/crd/API-PASE-A-PLAZO-VENCIDO.md §5): `ASOPREP-FCPC-CREDITO-GR-` + el número con ceros a
   * la izquierda hasta 3 dígitos + el año actual del navegador. El que compone de verdad es el
   * backend — esto nunca se manda tal cual, solo el número (`memorandoDe`).
   */
  previsualizarMemorando(idPrestamo: number): string {
    const digitos = this.memorandoDe(idPrestamo);
    if (!this.memorandoValido(digitos)) return '';
    const numero = parseInt(digitos, 10);
    const anio = new Date().getFullYear();
    return `ASOPREP-FCPC-CREDITO-GR-${String(numero).padStart(3, '0')}-${anio}`;
  }

  /**
   * Cabecera «seleccionar todos los visibles habilitados» (ítem 2): opera sobre TODO lo que pasa
   * el filtro actual (`filasFiltradasHabilitadas()`), no solo la página en pantalla — y nunca toca
   * un `idPrestamo` que ya estuviera seleccionado desde otro filtro/página. Los `valido=false`
   * jamás entran acá: `filasFiltradasHabilitadas()` ya los excluye.
   */
  alternarSeleccionTodosVisibles(): void {
    const habilitadas = this.filasFiltradasHabilitadas();
    const set = new Set(this.seleccionados());
    if (this.todosVisiblesSeleccionados()) {
      for (const f of habilitadas) set.delete(f.cuadro.idPrestamo);
    } else {
      for (const f of habilitadas) set.add(f.cuadro.idPrestamo);
    }
    this.seleccionados.set(set);
  }

  // ---- filtros / orden / paginado (ítems 1 y 2) ----

  limpiarFiltrosCandidatos(): void {
    this.filtroTexto.set('');
    this.filtroTipoCredito.set(null);
    this.filtroMoraDesde.set(null);
    this.filtroMoraHasta.set(null);
    this.filtroTotalMin.set(null);
    this.filtroTotalMax.set(null);
    this.filtroEstadoCalculo.set('todos');
  }

  alternarOrden(columna: ColumnaOrdenCandidatos): void {
    if (this.ordenColumna() === columna) {
      this.ordenDireccion.set(this.ordenDireccion() === 'asc' ? 'desc' : 'asc');
    } else {
      this.ordenColumna.set(columna);
      this.ordenDireccion.set('asc');
    }
  }

  cambiarPagina(evento: PageEvent): void {
    this.paginaActual.set(evento.pageIndex);
    this.tamanoPagina.set(evento.pageSize);
  }

  private normalizarTexto(texto: string): string {
    return texto
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  private inicioDelDia(fecha: Date): Date {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0, 0);
  }

  private finDelDia(fecha: Date): Date {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59, 999);
  }

  private compararFechas(a: Date | null, b: Date | null): number {
    const ta = a ? a.getTime() : -Infinity;
    const tb = b ? b.getTime() : -Infinity;
    return ta - tb;
  }

  declararPlazoVencido(): void {
    if (!this.puedeDeclarar()) return;

    this.dialog
      .open(ConfirmarDeclaracionDialogComponent, {
        data: {
          cantidadPrestamos: this.seleccionados().size,
          totalPorCobrar: this.totalSeleccionado(),
          cuotasSinSeguro: this.cuotasSinSeguroSeleccionado(),
          filas: this.filasSeleccionadas().map((f) => ({
            numeroPrestamo: f.cuadro.numeroPrestamo,
            numeroMemorandoPreview: this.previsualizarMemorando(f.cuadro.idPrestamo),
          })),
        },
        width: '480px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((confirmado?: boolean) => {
        if (confirmado) this.confirmarDeclaracion();
      });
  }

  private confirmarDeclaracion(): void {
    const fecha = this.servicio.formatearFecha(this.fechaCorteDeclarar());
    if (!fecha) return;

    const memos = this.memorandos();
    const prestamos: PrestamoADeclararPlazoVencido[] = this.filasSeleccionadas().map((f) => ({
      idPrestamo: f.cuadro.idPrestamo,
      numeroMemorando: (memos.get(f.cuadro.idPrestamo) ?? '').trim(),
    }));

    this.declarando.set(true);
    this.servicio
      .declarar({
        fechaCorte: fecha,
        usuario: usuarioSesion(),
        paraNombre: this.paraNombre().trim(),
        paraCargo: this.paraCargo().trim(),
        ccNombre: this.ccNombre().trim(),
        ccCargo: this.ccCargo().trim(),
        prestamos,
      })
      .subscribe({
        next: (resultado) => {
          this.declarando.set(false);
          this.resultadoDeclaracion.set(resultado);
          this.snackBar.open(
            `${resultado.length} préstamo${resultado.length === 1 ? '' : 's'} declarado${resultado.length === 1 ? '' : 's'} en plazo vencido.`,
            'Cerrar',
            { duration: 5000 }
          );
          this.consultarCandidatos();
          this.cargarPorLiquidar();
          this.buscarHistorial();
        },
        error: (e: Error) => {
          this.declarando.set(false);
          this.mostrarError(e.message);
        },
      });
  }

  // ========================= Pestaña 2: Por liquidar =========================

  filasPorLiquidar = signal<FilaPorLiquidar[]>([]);
  cargandoPorLiquidar = signal(false);
  errorPorLiquidar = signal<string | null>(null);

  cargarPorLiquidar(): void {
    this.cargandoPorLiquidar.set(true);
    this.errorPorLiquidar.set(null);
    this.servicio.listar({ estado: EstadoPlazoVencido.DECLARADA }).subscribe({
      next: (lista) => {
        this.cargandoPorLiquidar.set(false);
        this.filasPorLiquidar.set(lista.map((declaracion) => ({ declaracion, fechaCorte: new Date(), liquidando: false })));
      },
      error: (e: Error) => {
        this.cargandoPorLiquidar.set(false);
        this.errorPorLiquidar.set(e.message);
      },
    });
  }

  liquidar(fila: FilaPorLiquidar): void {
    const fecha = this.servicio.formatearFecha(fila.fechaCorte);
    if (!fecha) {
      this.mostrarError('Indique una fecha de corte válida.');
      return;
    }

    fila.liquidando = true;
    this.servicio.liquidar(fila.declaracion.idDeclaracion, { fechaCorte: fecha, usuario: usuarioSesion() }).subscribe({
      next: (declaracionLiquidada) => {
        fila.liquidando = false;
        this.snackBar.open(
          `Declaración ${declaracionLiquidada.numeroMemorando} liquidada. Ya puede descargar la liquidación desde Historial.`,
          'Cerrar',
          { duration: 6000 }
        );
        this.filasPorLiquidar.update((filas) => filas.filter((f) => f !== fila));
        this.buscarHistorial();
      },
      error: (e: Error) => {
        fila.liquidando = false;
        this.mostrarError(e.message);
      },
    });
  }

  // ========================= Pestaña 3: Historial =========================

  filtroEstadoHistorial = signal<EstadoPlazoVencido | null>(null);
  filtroDesdeHistorial = signal<Date | null>(null);
  filtroHastaHistorial = signal<Date | null>(null);
  cargandoHistorial = signal(false);
  errorHistorial = signal<string | null>(null);
  historial = signal<DeclaracionPlazoVencido[]>([]);

  buscarHistorial(): void {
    const filtros: FiltrosListarPlazoVencido = {};
    const estado = this.filtroEstadoHistorial();
    if (estado != null) filtros.estado = estado;
    const desde = this.servicio.formatearFecha(this.filtroDesdeHistorial());
    if (desde) filtros.desde = desde;
    const hasta = this.servicio.formatearFecha(this.filtroHastaHistorial());
    if (hasta) filtros.hasta = hasta;

    this.cargandoHistorial.set(true);
    this.errorHistorial.set(null);
    this.servicio.listar(filtros).subscribe({
      next: (lista) => {
        this.cargandoHistorial.set(false);
        this.historial.set(lista);
      },
      error: (e: Error) => {
        this.cargandoHistorial.set(false);
        this.errorHistorial.set(e.message);
      },
    });
  }

  limpiarFiltrosHistorial(): void {
    this.filtroEstadoHistorial.set(null);
    this.filtroDesdeHistorial.set(null);
    this.filtroHastaHistorial.set(null);
    this.buscarHistorial();
  }

  /** Revertir solo aparece en DECLARADA o LIQUIDADA (§7, §11). */
  puedeRevertir(d: DeclaracionPlazoVencido): boolean {
    return d.estado === EstadoPlazoVencido.DECLARADA || d.estado === EstadoPlazoVencido.LIQUIDADA;
  }

  revertir(d: DeclaracionPlazoVencido): void {
    this.dialog
      .open(RevertirDeclaracionDialogComponent, {
        data: { numeroMemorando: d.numeroMemorando, nombreParticipe: d.nombreParticipe },
        width: '480px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((motivo?: string) => {
        if (!motivo) return;
        this.servicio.revertir(d.idDeclaracion, { usuario: usuarioSesion(), motivo }).subscribe({
          next: (resultado) => {
            this.snackBar.open(
              `Declaración revertida. Cuotas restituidas: ${resultado.cuotasRestituidas}, sin restituir: ${resultado.cuotasNoRestituidas}.`,
              'Cerrar',
              { duration: 7000 }
            );
            this.buscarHistorial();
            this.cargarPorLiquidar();
          },
          error: (e: Error) => this.mostrarError(e.message),
        });
      });
  }

  // ========================= Documentos (§8) =========================

  descargarMemorando(idDeclaracion: number, numeroMemorando: string, formato: FormatoDocumentoPlazoVencido): void {
    this.servicio.memorando(idDeclaracion, formato).subscribe({
      next: (doc) => guardarArchivo(doc.blob, doc.nombreArchivo || `ORDEN_DE_COBRO_${numeroMemorando}.${formato.toLowerCase()}`),
      error: (e: Error) => this.mostrarError(e.message),
    });
  }

  descargarLiquidacion(idDeclaracion: number, numeroMemorando: string, formato: FormatoDocumentoPlazoVencido): void {
    this.servicio.liquidacionDocumento(idDeclaracion, formato).subscribe({
      next: (doc) => guardarArchivo(doc.blob, doc.nombreArchivo || `LIQUIDACION_${numeroMemorando}.${formato.toLowerCase()}`),
      error: (e: Error) => this.mostrarError(e.message),
    });
  }

  /** Mismo llamado que `participe-dash.component.ts:958-976`: el reporte de tabla ya existe, no se crea otro. */
  imprimirTablaAmortizacion(idPrestamo: number, numeroPrestamo: string): void {
    const parametros = {
      P_PRSTCDGO: idPrestamo,
      P_IMAGEN: null,
      P_USUARIO: localStorage.getItem('username') || localStorage.getItem('userName') || '',
    };

    this.snackBar.open('Generando reporte...', '', { duration: 2000 });
    this.jasperReportes.generar('crd', 'RPRT_TBLA_ACML', parametros, 'PDF').subscribe({
      next: (blob) => guardarArchivo(blob, `tabla-amortizacion-${numeroPrestamo}.pdf`),
      error: () => this.mostrarError('No se pudo generar el reporte de la tabla de amortización.'),
    });
  }

  // ========================= utilidades =========================

  formatFecha(fecha: Date | null): string {
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA) || '—';
  }

  formatFechaHora(fecha: Date | null): string {
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.FECHA_HORA) || '—';
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 8000 });
  }
}
