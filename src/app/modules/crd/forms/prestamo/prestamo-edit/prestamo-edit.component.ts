import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { MotivoAnularPrestamoDialogComponent } from './motivo-anular-prestamo-dialog.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetallePrestamo } from '../../../model/detalle-prestamo';
import {
  CLASES_ESTADO_CUOTA,
  CodigoEstadoCuota,
  EstadoCuotaPrestamo,
  NOMBRES_ESTADO_CUOTA,
  obtenerCodigoEstadoCuota as leerCodigoEstadoCuota,
} from '../../../model/estado-cuota-prestamo';
import { Participe } from '../../../model/participe';
import { Prestamo } from '../../../model/prestamo';
import { PrestamoSustituible, TipoOperacionPrestamo } from '../../../model/prestamo-sustituible';
import { Producto } from '../../../model/producto';
import { DetallePrestamoService } from '../../../service/detalle-prestamo.service';
import { EstadoCuotaPrestamoService } from '../../../service/estado-cuota-prestamo.service';
import { ParticipeService } from '../../../service/participe.service';
import { PrestamoService } from '../../../service/prestamo.service';
import { ProductoService } from '../../../service/producto.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { guardarArchivo, mensajeReporteFallido } from '../../../../../shared/services/descarga-reporte';
import { JasperReportesService } from '../../../../../shared/services/jasper-reportes.service';
import { empresaSesionCodigo } from '../../../../../shared/services/empresa-sesion';
import { idUsuarioSesion, usuarioSesion } from '../../../../../shared/services/usuario-sesion';

interface ParticipeOption {
  codigoParticipe: number;
  codigoEntidad: number;
  numeroIdentificacion: string;
  nombre: string;
  label: string;
}

/**
 * Códigos de negocio del estado operativo del préstamo (`Prestamo.idEstado` = PRSTIDST).
 * ⚠️ No confundir con `Prestamo.estadoPrestamo` (ESPSCDGO): esa es la FK al catálogo,
 * no el estado del ciclo de otorgamiento. Contrato: docs/crd/API-CICLO-OTORGAMIENTO.md.
 */
enum CodigoEstadoPrestamo {
  PENDIENTE_DE_APROBACION = 6,
  GENERADO = 1,
  VIGENTE = 2,
  RECHAZADO = 7,
  CANCELADO_POR_NOVACION = 5,
  CANCELADO_POR_REESTRUCTURACION = 13,
  EN_MORA = 11,
  ANULADO = 12,
}

type NombreImpreso = 'RPRT_PRST_SLCT' | 'RPRT_PRST_PGRE' | 'RPRT_TBLA_ACML';

const ETIQUETA_IMPRESO: Record<NombreImpreso, { archivo: string }> = {
  RPRT_PRST_SLCT: { archivo: 'solicitud-credito' },
  RPRT_PRST_PGRE: { archivo: 'pagare' },
  RPRT_TBLA_ACML: { archivo: 'tabla-amortizacion' },
};

const NOMBRES_ESTADO_PRESTAMO: Record<number, string> = {
  [CodigoEstadoPrestamo.PENDIENTE_DE_APROBACION]: 'Pendiente de aprobación',
  [CodigoEstadoPrestamo.GENERADO]: 'Generado',
  [CodigoEstadoPrestamo.VIGENTE]: 'Vigente',
  [CodigoEstadoPrestamo.RECHAZADO]: 'Rechazado',
  [CodigoEstadoPrestamo.EN_MORA]: 'En mora',
  [CodigoEstadoPrestamo.CANCELADO_POR_NOVACION]: 'Cancelado por novación',
  [CodigoEstadoPrestamo.CANCELADO_POR_REESTRUCTURACION]: 'Cancelado por reestructuración',
  [CodigoEstadoPrestamo.ANULADO]: 'Anulado',
};

const CLASES_ESTADO_PRESTAMO: Record<number, string> = {
  [CodigoEstadoPrestamo.PENDIENTE_DE_APROBACION]: 'prestamo-pendiente',
  [CodigoEstadoPrestamo.GENERADO]: 'prestamo-generado',
  [CodigoEstadoPrestamo.VIGENTE]: 'prestamo-vigente',
  [CodigoEstadoPrestamo.RECHAZADO]: 'prestamo-rechazado',
  [CodigoEstadoPrestamo.EN_MORA]: 'prestamo-en-mora',
  [CodigoEstadoPrestamo.CANCELADO_POR_NOVACION]: 'prestamo-anulado',
  [CodigoEstadoPrestamo.CANCELADO_POR_REESTRUCTURACION]: 'prestamo-anulado',
  [CodigoEstadoPrestamo.ANULADO]: 'prestamo-anulado',
};

@Component({
  selector: 'app-prestamo-edit.component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  templateUrl: './prestamo-edit.component.html',
  styleUrl: './prestamo-edit.component.scss',
})
export class PrestamoEditComponent implements OnInit {
  @ViewChild('inputExcel') inputExcelRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaInicioInput', { read: ElementRef }) fechaInicioInputRef!: ElementRef<HTMLInputElement>;
  private _rawFechaInicio = '';
  private fb = inject(FormBuilder);
  private funcionesDatosS = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private jasperReportes = inject(JasperReportesService);

  loading = signal<boolean>(false);

  participesOptions = signal<ParticipeOption[]>([]);
  productosOptions = signal<Producto[]>([]);
  participeQuery = signal<string>('');
  ultimoPrestamoId = signal<number | null>(null);
  generandoTabla = signal<boolean>(false);
  tieneCuotaCero = signal<boolean>(false);
  cargandoExcel = signal<boolean>(false);
  cargandoDetalle = signal<boolean>(false);
  estadosCuota = signal<EstadoCuotaPrestamo[]>([]);
  detallePrestamo = signal<DetallePrestamo[]>([]);
  detallePrestamoRaw = signal<DetallePrestamo[]>([]);
  mostrarCanceladas = signal<boolean>(false);
  modoEdicionPrestamo = signal<boolean>(false);
  idEstadoPrestamo = signal<number | null>(null);
  aprobando = signal<boolean>(false);
  rechazando = signal<boolean>(false);
  anulando = signal<boolean>(false);

  // ---- Reestructuración / novación (docs/crd/API-REESTRUCTURACION-NOVACION.md) ----
  /** Solo en el alta. NUEVO es el comportamiento de siempre. */
  tipoOperacion = signal<TipoOperacionPrestamo>('NUEVO');
  sustituibles = signal<PrestamoSustituible[]>([]);
  cargandoSustituibles = signal<boolean>(false);
  errorSustituibles = signal<string | null>(null);
  originalSeleccionado = signal<PrestamoSustituible | null>(null);
  /** Espejo del control `monto` para los cálculos en vivo del desembolso neto. */
  montoActual = signal<number>(0);
  /** Préstamo existente que sustituye a otro: solo lectura (§3). */
  sustituyeA = signal<{ numero: string | number; tipo: string; vs: number | null } | null>(null);

  readonly esReestructuracionONovacion = computed(() => this.tipoOperacion() !== 'NUEVO');
  /** Desembolso neto de una novación = monto − VS. */
  readonly desembolsoNeto = computed(() => {
    const vs = this.originalSeleccionado()?.valorSustitucion ?? 0;
    return +(this.montoActual() - vs).toFixed(2);
  });
  /** La novación exige monto > VS (RN8). */
  readonly novacionMontoInvalido = computed(
    () => this.tipoOperacion() === 'NOVACION' && !!this.originalSeleccionado() && this.desembolsoNeto() <= 0
  );
  imprimiendo = signal<boolean>(false);
  /** Espejo del control `idasoprep` (deshabilitado, no reactivo): habilita «Imprimir documentos». */
  idAsoprepActual = signal<number | null>(null);
  /** Respuesta de `GET prst/{id}/puedeAnular`; `null` mientras carga o si no aplica al estado. */
  puedeAnularInfo = signal<{ puede: boolean; motivo: string | null } | null>(null);
  private codigoEntidadFija: number | null = null;
  private prestamoDesdeConsulta: Prestamo | null = null;
  private enfocarGenerarTabla = false;

  /** Expuesto para el template: ver `docs/crd/API-CICLO-OTORGAMIENTO.md`. */
  readonly CodigoEstadoPrestamo = CodigoEstadoPrestamo;

  get textoEstadoPrestamo(): string {
    const estado = this.idEstadoPrestamo();
    return estado != null ? (NOMBRES_ESTADO_PRESTAMO[estado] ?? `Estado ${estado}`) : '';
  }

  get claseEstadoPrestamo(): string {
    const estado = this.idEstadoPrestamo();
    return estado != null ? (CLASES_ESTADO_PRESTAMO[estado] ?? 'prestamo-desconocido') : '';
  }

  /** Generar (sin tabla) o regenerar (con tabla) — nunca en VIGENTE ni RECHAZADO. */
  get puedeGenerarTabla(): boolean {
    const estado = this.idEstadoPrestamo();
    return (
      estado === CodigoEstadoPrestamo.PENDIENTE_DE_APROBACION || estado === CodigoEstadoPrestamo.GENERADO
    );
  }

  /** Aprobar y rechazar solo aparecen si hay una transición válida desde el estado actual. */
  get mostrarAprobarRechazar(): boolean {
    const estado = this.idEstadoPrestamo();
    return (
      estado === CodigoEstadoPrestamo.PENDIENTE_DE_APROBACION || estado === CodigoEstadoPrestamo.GENERADO
    );
  }

  /** Sin tabla (PENDIENTE) no hay nada que aprobar todavía. */
  get puedeAprobar(): boolean {
    return this.idEstadoPrestamo() === CodigoEstadoPrestamo.GENERADO;
  }

  get puedeRechazar(): boolean {
    return this.mostrarAprobarRechazar;
  }

  /** Anular solo se ofrece en VIGENTE o EN_MORA (§7.1); habilitarlo depende de `puedeAnular`. */
  get mostrarAnular(): boolean {
    const estado = this.idEstadoPrestamo();
    return estado === CodigoEstadoPrestamo.VIGENTE || estado === CodigoEstadoPrestamo.EN_MORA;
  }

  get habilitarAnular(): boolean {
    return this.puedeAnularInfo()?.puede === true && !this.anulando();
  }

  get tooltipAnular(): string {
    const info = this.puedeAnularInfo();
    if (!info) return 'Verificando si se puede anular…';
    return info.puede ? '' : (info.motivo ?? 'No se puede anular este préstamo.');
  }

  /** La tabla se imprime desde que existe, incluido ANULADO (sale marcado así). */
  get puedeImprimirTabla(): boolean {
    return !!this.ultimoPrestamoId() && this.detallePrestamoRaw().length > 0 && !this.imprimiendo();
  }

  /** Solicitud y pagaré (§7.3): desde GENERADO o PENDIENTE en adelante, salvo RECHAZADO. */
  private get puedeImprimirDocumento(): boolean {
    const estado = this.idEstadoPrestamo();
    return !!this.ultimoPrestamoId() && estado != null && estado !== CodigoEstadoPrestamo.RECHAZADO && !this.imprimiendo();
  }

  get puedeImprimirSolicitud(): boolean {
    return this.puedeImprimirDocumento;
  }

  /** El pagaré necesita tabla y que el préstamo no esté RECHAZADO ni ANULADO. */
  get puedeImprimirPagare(): boolean {
    return (
      this.puedeImprimirTabla && this.puedeImprimirDocumento && this.idEstadoPrestamo() !== CodigoEstadoPrestamo.ANULADO
    );
  }

  /** El lote (§7.4) solo sale con el préstamo aprobado, es decir, con idAsoprep. */
  get puedeImprimirLote(): boolean {
    return this.puedeImprimirDocumento && this.idAsoprepActual() != null;
  }

  get guardarDeshabilitado(): boolean {
    return this.idEstadoPrestamo() === CodigoEstadoPrestamo.RECHAZADO;
  }

  displayedColumnsDetalle: string[] = [
    'numeroCuota',
    'fechaVencimiento',
    'saldoInicialCapital',
    'capital',
    'saldoCapital',
    'interes',
    'interesMora',
    'desgravamen',
    'pagoExtra',
    'cuota',
    'estado',
  ];

  get displayedColumnsCuotas(): string[] {
    const productoSeleccionado = this.productosOptions().find(
      (p) => p.codigo === this.form.get('producto')?.value,
    );
    const esConSeguro = [2, 3, 4, 5].includes(productoSeleccionado?.tipoPrestamo?.codigo ?? 0);
    if (esConSeguro) {
      const cols = [...this.displayedColumnsDetalle];
      const idx = cols.indexOf('pagoExtra');
      cols.splice(idx + 1, 0, 'valorSeguroIncendio');
      return cols;
    }
    return this.displayedColumnsDetalle;
  }

  get tieneCuotasCanceladas(): boolean {
    return this.detallePrestamoRaw().some(
      (d) => this.obtenerCodigoEstadoCuota(d) === CodigoEstadoCuota.CANCELADA_ANTICIPADA,
    );
  }

  toggleMostrarCanceladas(): void {
    this.mostrarCanceladas.update(v => !v);
    const raw = this.detallePrestamoRaw();
    this.detallePrestamo.set(
      this.mostrarCanceladas()
        ? raw
        : raw.filter(
            (d) => this.obtenerCodigoEstadoCuota(d) !== CodigoEstadoCuota.CANCELADA_ANTICIPADA,
          ),
    );
  }

  calcularTotalesDetalle(): { capital: number; interes: number; interesMora: number; desgravamen: number; pagoExtra: number; cuota: number; seguroIncendio: number } {
    return this.detallePrestamoRaw().reduce(
      (acc, d) => {
        const capital      = d.capital ?? 0;
        const interes      = d.interes ?? 0;
        const interesMora  = d.mora ?? 0;
        const desgravamen  = d.desgravamen ?? 0;
        const pagoExtra    = d.saldoOtros ?? 0;
        const seguro       = d.valorSeguroIncendio ?? 0;
        const cuota        = d.total ?? 0;
        return {
          capital:       acc.capital       + capital,
          interes:       acc.interes       + interes,
          interesMora:   acc.interesMora   + interesMora,
          desgravamen:   acc.desgravamen   + desgravamen,
          pagoExtra:     acc.pagoExtra     + pagoExtra,
          cuota:         acc.cuota         + cuota,
          seguroIncendio: acc.seguroIncendio + seguro,
        };
      },
      { capital: 0, interes: 0, interesMora: 0, desgravamen: 0, pagoExtra: 0, cuota: 0, seguroIncendio: 0 },
    );
  }

  participesFiltrados = computed(() => {
    const q = this.participeQuery().trim().toLowerCase();
    const all = this.participesOptions();

    if (!q) {
      return all.slice(0, 50);
    }

    return all.filter(
      (p) => p.numeroIdentificacion.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q),
    );
  });

  tipoAmortizacionOptions = [
    { value: 1, label: 'Francesa' },
    { value: 2, label: 'Alemana' },
    { value: 3, label: 'Americana' },
  ];

  form = this.fb.group({
    participe: [null as number | null, Validators.required],
    producto: [null as number | null, Validators.required],
    // Solo lectura: lo asigna el backend al aprobar (docs/crd/API-CICLO-OTORGAMIENTO.md §3, U6). Deshabilitado
    // no entra en `form.value`, pero acá se lee siempre con `getRawValue()`.
    idasoprep: [{ value: null as number | null, disabled: true }],
    fechaInicio: [null as Date | null, Validators.required],
    tipoAmortizacion: [1 as number | null, Validators.required],
    tasa: [0 as number | null, [Validators.required, Validators.min(0)]],
    monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
    plazo: [null as number | null, Validators.required],
  });

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private prestamoService: PrestamoService,
    private detallePrestamoService: DetallePrestamoService,
    private participeService: ParticipeService,
    private productoService: ProductoService,
    private estadoCuotaPrestamoService: EstadoCuotaPrestamoService,
  ) {
    this.form.controls.monto.valueChanges.subscribe((m) => this.montoActual.set(Number(m) || 0));

    // Consulta `puedeAnular` cada vez que cambia el préstamo o su estado, solo si el botón se ofrece.
    effect(() => {
      const id = this.ultimoPrestamoId();
      const estado = this.idEstadoPrestamo();
      untracked(() => {
        this.puedeAnularInfo.set(null);
        if (!id || (estado !== CodigoEstadoPrestamo.VIGENTE && estado !== CodigoEstadoPrestamo.EN_MORA)) return;
        this.prestamoService.puedeAnular(id).subscribe({
          next: (r) => {
            if (this.ultimoPrestamoId() === id) this.puedeAnularInfo.set(r);
          },
          error: (err) => {
            if (this.ultimoPrestamoId() === id) {
              this.puedeAnularInfo.set({
                puede: false,
                motivo: this.extraerMensajeError(err, 'No se pudo verificar si el préstamo se puede anular.'),
              });
            }
          },
        });
      });
    });
  }

  ngOnInit(): void {
    this.prestamoDesdeConsulta = (history.state?.prestamo as Prestamo) || null;
    this.enfocarGenerarTabla = !!history.state?.enfocarGenerarTabla;

    if (this.prestamoDesdeConsulta?.entidad?.codigo) {
      this.modoEdicionPrestamo.set(true);
      this.codigoEntidadFija = this.prestamoDesdeConsulta.entidad.codigo;
      this.form.get('participe')?.disable({ emitEvent: false });
    }

    this.cargarCatalogos();
  }

  private cargarCatalogos(): void {
    this.loading.set(true);
    if (!this.modoEdicionPrestamo()) {
      this.participeService
        .getAll()
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (participes) => {
            this.participesOptions.set(this.mapParticipes(participes || []));
            this.intentarCargarPrestamoDesdeConsulta();
          },
          error: () => {
            this.snackBar.open('Error cargando partícipes', 'Cerrar', { duration: 3500 });
          },
        });
    }

    this.productoService.getAll().subscribe({
      next: (productos) => {
        this.productosOptions.set(productos || []);
        if (this.modoEdicionPrestamo()) {
          this.loading.set(false);
        }
        this.intentarCargarPrestamoDesdeConsulta();
      },
      error: () => {
        if (this.modoEdicionPrestamo()) {
          this.loading.set(false);
        }
        this.snackBar.open('Error cargando productos', 'Cerrar', { duration: 3500 });
      },
    });

    this.estadoCuotaPrestamoService.getAll().subscribe({
      next: (estados) => this.estadosCuota.set(estados || []),
      error: () => {},
    });
  }

  private intentarCargarPrestamoDesdeConsulta(): void {
    if (!this.prestamoDesdeConsulta) {
      return;
    }

    if (!this.productosOptions().length) {
      return;
    }

    if (!this.modoEdicionPrestamo() && !this.participesOptions().length) {
      return;
    }

    const prestamo = this.prestamoDesdeConsulta;
    const participeSeleccionado = this.participesOptions().find(
      (p) => p.codigoEntidad === prestamo.entidad?.codigo,
    );

    const etiquetaEntidadFija = `${prestamo.entidad?.numeroIdentificacion || '-'} - ${
      prestamo.entidad?.razonSocial || prestamo.entidad?.nombreComercial || 'Sin nombre'
    }`;

    this.idAsoprepActual.set((prestamo as any).idAsoprep ?? null);
    this.form.patchValue({
      participe: this.modoEdicionPrestamo() ? null : (participeSeleccionado?.codigoParticipe ?? null),
      producto: prestamo.producto?.codigo ?? null,
      idasoprep: (prestamo as any).idAsoprep ?? null,
      fechaInicio: prestamo.fechaInicio ? new Date(prestamo.fechaInicio as any) : null,
      tipoAmortizacion: prestamo.tipoAmortizacion ?? 1,
      tasa: prestamo.tasa ?? prestamo.tasaNominal ?? 0,
      monto: prestamo.montoSolicitado ?? 0,
      plazo: prestamo.plazo ?? null,
    });

    this.participeQuery.set(
      this.modoEdicionPrestamo() ? etiquetaEntidadFija : (participeSeleccionado?.label || ''),
    );

    this.ultimoPrestamoId.set(prestamo.codigo || null);
    this.idEstadoPrestamo.set(prestamo.idEstado ?? null);
    this.registrarSustitucion(prestamo);
    if (prestamo.codigo) {
      this.cargarDetallePrestamo(prestamo.codigo);
    }

    this.prestamoDesdeConsulta = null;

    if (this.enfocarGenerarTabla) {
      setTimeout(() => {
        document.getElementById('prestamo-acciones')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }

  private mapParticipes(participes: Participe[]): ParticipeOption[] {
    return participes
      .filter((p) => p?.codigo && p?.entidad?.codigo)
      .map((p) => ({
        codigoParticipe: p.codigo,
        codigoEntidad: p.entidad.codigo,
        numeroIdentificacion: String(p.entidad.numeroIdentificacion || '-'),
        nombre: String(p.entidad.razonSocial || p.entidad.nombreComercial || 'Sin nombre'),
        label: `${p.entidad.numeroIdentificacion || '-'} - ${
          p.entidad.razonSocial || p.entidad.nombreComercial || 'Sin nombre'
        }`,
      }));
  }

  onParticipeInput(event: Event): void {
    if (this.modoEdicionPrestamo()) {
      return;
    }

    const value = (event.target as HTMLInputElement).value || '';
    this.participeQuery.set(value);
    this.form.patchValue({ participe: null }, { emitEvent: false });
  }

  onParticipeSelected(codigoParticipe: number): void {
    if (this.modoEdicionPrestamo()) {
      return;
    }

    const participante = this.participesOptions().find(
      (p) => p.codigoParticipe === codigoParticipe,
    );
    if (!participante) {
      return;
    }

    this.form.patchValue({ participe: codigoParticipe }, { emitEvent: false });
    this.participeQuery.set(participante.label);
    this.cargarSustituibles();
  }

  /** Cambiar el tipo reinicia el original elegido; con R o N recarga la lista del partícipe. */
  onTipoOperacionChange(tipo: TipoOperacionPrestamo): void {
    this.tipoOperacion.set(tipo);
    this.cargarSustituibles();
  }

  private codigoEntidadSeleccionada(): number | null {
    const codigo = this.form.controls.participe.value;
    return this.participesOptions().find((p) => p.codigoParticipe === codigo)?.codigoEntidad ?? null;
  }

  private cargarSustituibles(): void {
    this.seleccionarOriginal(null);
    this.sustituibles.set([]);
    this.errorSustituibles.set(null);

    const tipo = this.tipoOperacion();
    const idEntidad = this.codigoEntidadSeleccionada();
    if (tipo === 'NUEVO' || !idEntidad) {
      return;
    }

    this.cargandoSustituibles.set(true);
    this.prestamoService
      .sustituibles(idEntidad, tipo)
      .pipe(finalize(() => this.cargandoSustituibles.set(false)))
      .subscribe({
        next: (lista) => this.sustituibles.set(lista ?? []),
        error: (err) =>
          this.errorSustituibles.set(this.extraerMensajeError(err, 'No se pudieron cargar los préstamos del partícipe')),
      });
  }

  /** Etiqueta de una fila de la lista de originales. */
  etiquetaSustituible(s: PrestamoSustituible): string {
    return `N° ${s.idAsoprep ?? s.idPrestamo} · ${s.producto} · VS $${s.valorSustitucion.toFixed(2)}`;
  }

  /**
   * Al elegir el original: R fija monto = VS (solo lectura) y N lo deja editable (> VS); en ambos se
   * propone el producto sugerido si existe en el catálogo cargado. `null` deja el monto editable.
   */
  seleccionarOriginal(idPrestamo: number | null): void {
    const monto = this.form.controls.monto;
    const original = idPrestamo == null ? null : (this.sustituibles().find((s) => s.idPrestamo === idPrestamo) ?? null);
    const elegido = original && original.puede ? original : null;
    this.originalSeleccionado.set(elegido);

    if (monto.disabled) {
      monto.enable();
      monto.setValue(null);
    }
    if (!elegido) {
      return;
    }

    const sugerido = elegido.productoSugerido?.idProducto;
    if (sugerido != null && this.productosOptions().some((p) => p.codigo === sugerido)) {
      this.form.controls.producto.setValue(sugerido);
    }
    if (this.tipoOperacion() === 'REESTRUCTURACION') {
      monto.setValue(elegido.valorSustitucion);
      monto.disable();
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Complete los campos obligatorios del préstamo', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    if (this.guardarDeshabilitado) {
      return;
    }

    const v = this.form.getRawValue();
    const codigoEntidad = this.modoEdicionPrestamo()
      ? this.codigoEntidadFija
      : this.participesOptions().find((p) => p.codigoParticipe === v.participe)?.codigoEntidad;

    if (!codigoEntidad) {
      this.snackBar.open('Seleccione un partícipe válido', 'Cerrar', { duration: 3000 });
      return;
    }

    const producto = this.productosOptions().find((p) => p.codigo === v.producto);
    if (!producto) {
      this.snackBar.open('Seleccione un producto válido', 'Cerrar', { duration: 3000 });
      return;
    }

    if (!this.ultimoPrestamoId() && this.esReestructuracionONovacion()) {
      if (!this.originalSeleccionado()) {
        this.snackBar.open('Elija el préstamo original que se va a sustituir', 'Cerrar', { duration: 4000 });
        return;
      }
      if (this.novacionMontoInvalido()) {
        this.snackBar.open('En una novación el monto debe ser mayor que el valor de sustitución', 'Cerrar', { duration: 5000 });
        return;
      }
    }

    const idPrestamoExistente = this.ultimoPrestamoId();
    if (idPrestamoExistente) {
      this.guardarEdicion(idPrestamoExistente, v, producto);
    } else {
      this.guardarAlta(v, codigoEntidad, producto);
    }
  }

  private guardarAlta(v: ReturnType<typeof this.form.getRawValue>, codigoEntidad: number, producto: Producto): void {
    const now = new Date();
    const fechaFin = new Date(now);
    fechaFin.setMonth(fechaFin.getMonth() + Number(v.plazo || 0));

    const username = usuarioSesion();
    const tipoAmortizacionLabel =
      this.tipoAmortizacionOptions.find((t) => t.value === v.tipoAmortizacion)?.label || 'Francesa';

    const payload: any = {
      // For insert, backend must receive null id (sending 0 can be treated as detached entity on merge).
      codigo: null,
      // Nunca 0: el backend lo ignora y lo asigna al aprobar.
      idAsoprep: null,
      entidad: { codigo: codigoEntidad },
      producto: { codigo: v.producto },
      tipoAmortizacion: v.tipoAmortizacion || 1,
      amortizacion: tipoAmortizacionLabel.toUpperCase(),
      fecha: v.fechaInicio || now,
      fechaInicio: v.fechaInicio || now,
      fechaFin: fechaFin,
      interesNominal: v.tasa || 0,
      montoSolicitado: v.monto || 0,
      valorCuota: 0,
      plazo: v.plazo || 0,
      montoLiquidacion: 0,
      filial: { codigo: producto.filial?.codigo || 1 },
      estadoPrestamo: 1,
      tasa: v.tasa || 0,
      totalPagado: 0,
      totalCapital: 0,
      totalInteres: 0,
      totalMora: 0,
      totalInteresVencido: 0,
      totalSeguros: 0,
      totalPrestamo: v.monto || 0,
      saldoPorVencer: 0,
      saldoVencido: 0,
      saldoTotal: v.monto || 0,
      fechaRegistro: now,
      usuarioRegistro: username,
      fechaModificacion: now,
      usuarioModificacion: username,
      observacion: '',
      motivoPrestamo: null,
      estadoOperacion: 1,
      tasaNominal: v.tasa || 0,
      tasaEfectiva: v.tasa || 0,
      esNovacion: 0,
      reprocesado: 0,
      reestructurado: 0,
      refinanciado: 0,
      saldoCapital: v.monto || 0,
      saldoOtros: 0,
      saldoInteres: 0,
      moraCalculada: 0,
      diasVencido: 0,
      montoNovacion: 0,
      interesVariable: 0,
      ajusteAportes: 0,
      mesesACobrar: 0,
      firmadoTitular: 0,
      // Solo en el alta con R o N. VS, reestructurado/esNovacion/montoNovacion los escribe el servidor.
      ...(this.esReestructuracionONovacion() && this.originalSeleccionado()
        ? { idPrestamoOriginal: this.originalSeleccionado()!.idPrestamo }
        : {}),
      // idEstado: NO se manda. El backend lo fuerza a PENDIENTE_DE_APROBACION en el alta
      // (PrestamoServiceImpl.saveSingle, cuando codigo == null) sin mirar lo que llegue acá.
      // La pantalla nunca decide el estado — ver docs/crd/API-CICLO-OTORGAMIENTO.md.
    };

    // Compatibilidad: evitar enviar campo legado "estado" en creación de préstamo.
    if ('estado' in payload) {
      delete payload.estado;
    }

    this.loading.set(true);
    this.prestamoService.add(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        const nuevoPrestamoId = res?.codigo || null;

        this.ultimoPrestamoId.set(nuevoPrestamoId);
        this.idEstadoPrestamo.set(res?.idEstado ?? null);
        this.detallePrestamo.set([]);
        this.detallePrestamoRaw.set([]);
        this.registrarSustitucion(res);

        this.snackBar.open('Préstamo guardado correctamente', 'Cerrar', { duration: 3000 });
      },
      error: (err) => {
        this.loading.set(false);
        this.snackBar.open(this.extraerMensajeError(err, 'Error al guardar el préstamo'), 'Cerrar', {
          duration: 6000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  /**
   * Edición de un préstamo existente. El PUT del backend hace `entityManager.merge()`
   * del objeto completo que llega en el body — sin re-fetch, sin saltar nulos (confirmado
   * contra `PrestamoRest.put` → `PrestamoServiceImpl.saveSingle` → `EntityDaoImpl.save`).
   * Cualquier campo que no viaje en el payload se graba como NULL en la fila real, FKs
   * incluidas. Por eso se relee el préstamo completo del backend justo antes de guardar
   * y se sobrescriben solo los campos que este formulario realmente edita; el resto —
   * incluido `idEstado`, que la pantalla nunca decide— viaja tal cual se acaba de leer.
   */
  private guardarEdicion(idPrestamo: number, v: ReturnType<typeof this.form.getRawValue>, producto: Producto): void {
    this.loading.set(true);
    this.prestamoService.getById(String(idPrestamo)).subscribe({
      next: (prestamoActual) => {
        if (!prestamoActual) {
          this.loading.set(false);
          this.snackBar.open('No se pudo leer el préstamo antes de guardar; intente nuevamente', 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          return;
        }

        const now = new Date();
        const fechaFin = new Date(now);
        fechaFin.setMonth(fechaFin.getMonth() + Number(v.plazo || 0));
        const username = usuarioSesion();
        const tipoAmortizacionLabel =
          this.tipoAmortizacionOptions.find((t) => t.value === v.tipoAmortizacion)?.label || 'Francesa';

        const payload: any = {
          ...prestamoActual,
          // Nunca 0: el backend lo ignora y lo asigna al aprobar.
          idAsoprep: null,
          producto: { codigo: v.producto },
          filial: { codigo: producto.filial?.codigo || prestamoActual.filial?.codigo || 1 },
          tipoAmortizacion: v.tipoAmortizacion || 1,
          amortizacion: tipoAmortizacionLabel.toUpperCase(),
          fecha: v.fechaInicio || prestamoActual.fecha,
          fechaInicio: v.fechaInicio || prestamoActual.fechaInicio,
          fechaFin,
          interesNominal: v.tasa || 0,
          tasa: v.tasa || 0,
          tasaNominal: v.tasa || 0,
          tasaEfectiva: v.tasa || 0,
          montoSolicitado: v.monto || 0,
          plazo: v.plazo || 0,
          fechaModificacion: now,
          usuarioModificacion: username,
        };

        if ('estado' in payload) {
          delete payload.estado;
        }

        this.prestamoService.update(payload).subscribe({
          next: (res) => {
            this.loading.set(false);
            this.ultimoPrestamoId.set(res?.codigo ?? idPrestamo);
            this.idEstadoPrestamo.set(res?.idEstado ?? prestamoActual.idEstado ?? null);
            this.snackBar.open('Préstamo actualizado correctamente', 'Cerrar', { duration: 3000 });
          },
          error: (err) => {
            this.loading.set(false);
            this.snackBar.open(this.extraerMensajeError(err, 'Error al actualizar el préstamo'), 'Cerrar', {
              duration: 6000,
              panelClass: ['error-snackbar'],
            });
          },
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.snackBar.open(
          this.extraerMensajeError(err, 'No se pudo leer el préstamo antes de guardar'),
          'Cerrar',
          { duration: 6000, panelClass: ['error-snackbar'] },
        );
      },
    });
  }

  /** Deja a la vista de solo lectura a qué préstamo sustituye este (si lo hace). */
  private registrarSustitucion(prestamo: Prestamo | null | undefined): void {
    const idOriginal = prestamo?.idPrestamoOriginal;
    if (!prestamo || !idOriginal) {
      this.sustituyeA.set(null);
      return;
    }
    const elegido = this.originalSeleccionado();
    const esNovacion = prestamo.esNovacion === 1 || (prestamo.reestructurado !== 1 && this.tipoOperacion() === 'NOVACION');
    this.sustituyeA.set({
      numero: elegido && elegido.idPrestamo === idOriginal ? (elegido.idAsoprep ?? idOriginal) : idOriginal,
      tipo: esNovacion ? 'novación' : 'reestructuración',
      vs: prestamo.valorSustitucion ?? elegido?.valorSustitucion ?? null,
    });
  }

  limpiar(): void {
    this.tipoOperacion.set('NUEVO');
    this.sustituibles.set([]);
    this.originalSeleccionado.set(null);
    this.sustituyeA.set(null);
    this.errorSustituibles.set(null);
    this.form.controls.monto.enable();
    this.idAsoprepActual.set(null);
    this.form.reset({
      idasoprep: null,
      fechaInicio: null,
      tipoAmortizacion: 1,
      tasa: 0,
    });
    this.participeQuery.set('');
    this.ultimoPrestamoId.set(null);
    this.idEstadoPrestamo.set(null);
    this.detallePrestamo.set([]);
    this.detallePrestamoRaw.set([]);
    this.mostrarCanceladas.set(false);
  }

  generarTablaAmortizacion(): void {
    const idPrestamo = this.ultimoPrestamoId();
    if (!idPrestamo) {
      this.snackBar.open('Primero debe guardar el préstamo para generar la tabla', 'Cerrar', {
        duration: 3500,
      });
      return;
    }

    if (!this.puedeGenerarTabla) {
      return;
    }

    const cuotasExistentes = this.detallePrestamoRaw().length;
    if (cuotasExistentes === 0) {
      this.ejecutarGeneracionTabla(idPrestamo, false);
      return;
    }

    const data: ConfirmDialogData = {
      title: 'Regenerar tabla de amortización',
      message:
        `El préstamo ya tiene ${cuotasExistentes} cuota${cuotasExistentes === 1 ? '' : 's'} generada` +
        `${cuotasExistentes === 1 ? '' : 's'}. Se van a reemplazar todas y la operación no se puede deshacer.`,
      confirmText: 'Regenerar',
      type: 'danger',
    };

    this.dialog
      .open(ConfirmDialogComponent, { data, width: '560px' })
      .afterClosed()
      .subscribe((confirmado) => {
        if (confirmado) {
          this.ejecutarGeneracionTabla(idPrestamo, true);
        }
      });
  }

  private ejecutarGeneracionTabla(idPrestamo: number, regenerar: boolean): void {
    this.generandoTabla.set(true);
    this.prestamoService
      .generarTablaAmortizacion(idPrestamo, this.tieneCuotaCero(), regenerar)
      .pipe(finalize(() => this.generandoTabla.set(false)))
      .subscribe({
        next: (res) => {
          if (res?.idEstado != null) {
            this.idEstadoPrestamo.set(res.idEstado);
          }
          this.snackBar.open('Tabla de amortización generada correctamente', 'Cerrar', {
            duration: 3000,
          });
          this.cargarDetallePrestamo(idPrestamo);
        },
        error: (err) => {
          this.snackBar.open(this.extraerMensajeError(err, 'Error al generar tabla de amortización'), 'Cerrar', {
            duration: 6000,
            panelClass: ['error-snackbar'],
          });
        },
      });
  }

  aprobarPrestamo(): void {
    const idPrestamo = this.ultimoPrestamoId();
    if (!idPrestamo || !this.puedeAprobar) {
      return;
    }

    const data: ConfirmDialogData = {
      title: 'Aprobar préstamo',
      message:
        'Se va a aprobar el préstamo. La tabla de amortización queda congelada a partir de este momento, ' +
        'aunque todavía no tenga pagos registrados. La operación no se puede deshacer.',
      confirmText: 'Aprobar',
      type: 'warning',
    };

    this.dialog
      .open(ConfirmDialogComponent, { data, width: '560px' })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) {
          return;
        }

        const idEmpresa = empresaSesionCodigo();
        const idUsuario = idUsuarioSesion();
        if (idEmpresa == null || idUsuario == null) {
          this.snackBar.open('No se pudo identificar la empresa/usuario de la sesión', 'Cerrar', {
            duration: 6000,
            panelClass: ['error-snackbar'],
          });
          return;
        }

        this.aprobando.set(true);
        this.prestamoService
          .aprobar(idPrestamo, usuarioSesion(), '', idEmpresa, idUsuario)
          .pipe(finalize(() => this.aprobando.set(false)))
          .subscribe({
            next: (res) => {
              if (res?.idEstado != null) {
                this.idEstadoPrestamo.set(res.idEstado);
              }
              // Tras aprobar el servidor ya escribió el VS: se refresca la vista de solo lectura.
              if (res?.idPrestamoOriginal) this.registrarSustitucion(res);
              const original = this.sustituyeA();
              // El número lo asigna el backend al aprobar; si no viene, no se inventa uno.
              const idAsoprep = res?.idAsoprep ?? null;
              if (idAsoprep != null) {
                this.form.controls.idasoprep.setValue(idAsoprep);
                this.idAsoprepActual.set(idAsoprep);
              }
              this.snackBar.open(
                (idAsoprep != null ? `Préstamo aprobado con N° Asoprep ${idAsoprep}` : 'Préstamo aprobado correctamente') +
                  (original ? `. Préstamo original N° ${original.numero} cancelado` : ''),
                'Cerrar',
                { duration: 5000 }
              );
              // §7.4: los tres documentos juntos. El préstamo ya quedó aprobado: si falla es un aviso.
              this.imprimirLote(true);
            },
            error: (err) => {
              this.snackBar.open(this.extraerMensajeError(err, 'Error al aprobar el préstamo'), 'Cerrar', {
                duration: 6000,
                panelClass: ['error-snackbar'],
              });
            },
          });
      });
  }

  anularPrestamo(): void {
    const idPrestamo = this.ultimoPrestamoId();
    if (!idPrestamo || !this.mostrarAnular || !this.habilitarAnular) {
      return;
    }

    const numero = this.form.controls.idasoprep.value ?? idPrestamo;
    this.dialog
      .open(MotivoAnularPrestamoDialogComponent, { data: { numeroPrestamo: numero }, width: '520px' })
      .afterClosed()
      .subscribe((motivo?: string) => {
        if (!motivo) {
          return;
        }

        const idEmpresa = empresaSesionCodigo();
        const idUsuario = idUsuarioSesion();
        if (idEmpresa == null || idUsuario == null) {
          this.snackBar.open('No se pudo identificar la empresa/usuario de la sesión', 'Cerrar', {
            duration: 6000,
            panelClass: ['error-snackbar'],
          });
          return;
        }

        this.anulando.set(true);
        this.prestamoService
          .anular(idPrestamo, usuarioSesion(), motivo, idEmpresa, idUsuario)
          .pipe(finalize(() => this.anulando.set(false)))
          .subscribe({
            next: (res) => {
              this.idEstadoPrestamo.set(res?.idEstado ?? CodigoEstadoPrestamo.ANULADO);
              this.cargarDetallePrestamo(idPrestamo);
              this.snackBar.open('Préstamo anulado', 'Cerrar', { duration: 5000 });
            },
            error: (err) => {
              this.snackBar.open(this.extraerMensajeError(err, 'Error al anular el préstamo'), 'Cerrar', {
                duration: 8000,
                panelClass: ['error-snackbar'],
              });
            },
          });
      });
  }

  /** Parámetros de cada impreso (§7.3): solicitud y tabla llevan el usuario de la sesión; el pagaré no. */
  private parametrosImpreso(nombreReporte: NombreImpreso, idPrestamo: number): Record<string, any> {
    return nombreReporte === 'RPRT_PRST_PGRE'
      ? { P_PRSTCDGO: idPrestamo }
      : { P_PRSTCDGO: idPrestamo, P_USUARIO: usuarioSesion() };
  }

  /** Solicitud (`RPRT_PRST_SLCT`), pagaré (`RPRT_PRST_PGRE`) o tabla (`RPRT_TBLA_ACML`), §7.3. */
  imprimir(nombreReporte: NombreImpreso): void {
    const idPrestamo = this.ultimoPrestamoId();
    const habilitado =
      nombreReporte === 'RPRT_TBLA_ACML'
        ? this.puedeImprimirTabla
        : nombreReporte === 'RPRT_PRST_SLCT'
          ? this.puedeImprimirSolicitud
          : this.puedeImprimirPagare;
    if (!idPrestamo || !habilitado) {
      return;
    }

    const etiqueta = ETIQUETA_IMPRESO[nombreReporte];
    this.imprimiendo.set(true);
    this.snackBar.open('Generando reporte...', '', { duration: 2000 });
    this.jasperReportes
      .generar('crd', nombreReporte, this.parametrosImpreso(nombreReporte, idPrestamo), 'PDF')
      .pipe(finalize(() => this.imprimiendo.set(false)))
      .subscribe({
        next: (blob) => guardarArchivo(blob, `${etiqueta.archivo}-${idPrestamo}.pdf`),
        error: async (err) =>
          this.snackBar.open(await mensajeReporteFallido(err), 'Cerrar', {
            duration: 6000,
            panelClass: ['error-snackbar'],
          }),
      });
  }

  /**
   * Solicitud + pagaré + tabla en un solo PDF (§7.4), en ese orden. Lo llama el botón «Imprimir
   * documentos» y, de forma automática, la aprobación exitosa: en ese caso un fallo es solo un
   * aviso, porque el préstamo ya quedó aprobado.
   */
  imprimirLote(trasAprobar = false): void {
    const idPrestamo = this.ultimoPrestamoId();
    if (!idPrestamo || (!trasAprobar && !this.puedeImprimirLote)) {
      return;
    }

    const reportes = (['RPRT_PRST_SLCT', 'RPRT_PRST_PGRE', 'RPRT_TBLA_ACML'] as NombreImpreso[]).map((nombre) => ({
      nombreReporte: nombre,
      parametros: this.parametrosImpreso(nombre, idPrestamo),
    }));

    this.imprimiendo.set(true);
    this.snackBar.open('Generando documentos...', '', { duration: 2000 });
    this.jasperReportes
      .generarLote('crd', reportes, 'PDF')
      .pipe(finalize(() => this.imprimiendo.set(false)))
      .subscribe({
        next: (blob) => this.abrirPdf(blob, `documentos-prestamo-${idPrestamo}.pdf`),
        error: async (err) => {
          const motivo = await mensajeReporteFallido(err);
          this.snackBar.open(
            trasAprobar
              ? `El préstamo quedó aprobado, pero no se pudieron generar los documentos: ${motivo} Use «Imprimir documentos» para reintentar.`
              : motivo,
            'Cerrar',
            { duration: 10000, panelClass: trasAprobar ? ['warning-snackbar'] : ['error-snackbar'] }
          );
        },
      });
  }

  /** Abre el PDF en otra pestaña para imprimir; si el navegador bloquea la ventana, lo descarga. */
  private abrirPdf(blob: Blob, nombreArchivo: string): void {
    const url = URL.createObjectURL(blob);
    const ventana = window.open(url, '_blank');
    if (!ventana) {
      guardarArchivo(blob, nombreArchivo);
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  rechazarPrestamo(): void {
    const idPrestamo = this.ultimoPrestamoId();
    if (!idPrestamo || !this.puedeRechazar) {
      return;
    }

    const data: ConfirmDialogData = {
      title: 'Rechazar préstamo',
      message:
        'Se va a rechazar el préstamo. Esta acción es terminal: el préstamo no se puede reactivar después.',
      confirmText: 'Rechazar',
      type: 'danger',
    };

    this.dialog
      .open(ConfirmDialogComponent, { data, width: '560px' })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) {
          return;
        }

        this.rechazando.set(true);
        this.prestamoService
          .rechazar(idPrestamo, usuarioSesion())
          .pipe(finalize(() => this.rechazando.set(false)))
          .subscribe({
            next: (res) => {
              if (res?.idEstado != null) {
                this.idEstadoPrestamo.set(res.idEstado);
              }
              this.snackBar.open('Préstamo rechazado', 'Cerrar', { duration: 3000 });
            },
            error: (err) => {
              this.snackBar.open(this.extraerMensajeError(err, 'Error al rechazar el préstamo'), 'Cerrar', {
                duration: 6000,
                panelClass: ['error-snackbar'],
              });
            },
          });
      });
  }

  private cargarDetallePrestamo(codigoPrestamo: number, corregirEstados = false): void {
    const criterios: DatosBusqueda[] = [];

    const criterioPrestamo = new DatosBusqueda();
    criterioPrestamo.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'prestamo',
      'codigo',
      codigoPrestamo.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(criterioPrestamo);

    const criterioOrden = new DatosBusqueda();
    criterioOrden.orderBy('numeroCuota');
    criterios.push(criterioOrden);

    this.cargandoDetalle.set(true);
    this.detallePrestamoService
      .selectByCriteria(criterios)
      .pipe(finalize(() => this.cargandoDetalle.set(false)))
      .subscribe({
        next: (res) => {
          const detalleNormalizado = (res || []).map((d) => this.normalizarDetallePrestamo(d));
          this.detallePrestamoRaw.set(detalleNormalizado);
          this.detallePrestamo.set(
            this.mostrarCanceladas()
              ? detalleNormalizado
              : detalleNormalizado.filter(
                  (d) => this.obtenerCodigoEstadoCuota(d) !== CodigoEstadoCuota.CANCELADA_ANTICIPADA,
                ),
          );

          // Después de cargar desde Excel, dejar idEstado como espejo exacto de estado.
          // detalle.estado (DTPRESTD) es la fuente de verdad; detalle.idEstado (DTPRIDST)
          // solo replica ese mismo código — ya no se traduce al PK de EstadoCuotaPrestamo.
          if (corregirEstados) {
            const aCorregir = detalleNormalizado
              .filter((d) => {
                const codigo = this.obtenerCodigoEstadoCuota(d);
                return codigo !== null && Number(d.idEstado) !== codigo;
              })
              .map((d) => ({ ...d, idEstado: this.obtenerCodigoEstadoCuota(d)! }));

            if (aCorregir.length > 0) {
              const updates$ = aCorregir.map(d => this.detallePrestamoService.update(d));
              forkJoin(updates$).subscribe({
                next: () => {},
                error: () => {
                  this.snackBar.open(
                    'Advertencia: algunos estados de cuota no pudieron corregirse en base de datos',
                    'Cerrar',
                    { duration: 5000 },
                  );
                },
              });
            }
          }
        },
        error: (err) => {
          this.detallePrestamo.set([]);
          this.snackBar.open(this.extraerMensajeError(err, 'No se pudo cargar el detalle del préstamo'), 'Cerrar', {
            duration: 6000,
            panelClass: ['error-snackbar'],
          });
        },
      });
  }

  private normalizarDetallePrestamo(detalle: DetallePrestamo): DetallePrestamo {
    return {
      ...detalle,
      fechaVencimiento: this.convertirFechaFlexible((detalle as any).fechaVencimiento) as any,
      fechaPagado:      this.convertirFechaFlexible((detalle as any).fechaPagado)      as any,
      fechaRegistro:    this.convertirFechaFlexible((detalle as any).fechaRegistro)    as any,
    };
  }

  private convertirFechaFlexible(valor: any): Date | null {
    if (!valor) {
      return null;
    }

    if (valor instanceof Date) {
      return valor;
    }

    if (Array.isArray(valor)) {
      const [year, month, day, hour = 0, minute = 0, second = 0, nanoseconds = 0] = valor;
      const ms = Math.floor((Number(nanoseconds) || 0) / 1000000);
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
        ms,
      );
    }

    if (typeof valor === 'string') {
      const texto = valor.trim();

      // Backend sometimes sends dates as "yyyy,m,d,h,m[,s[,ns]]"
      if (/^\d{4},\d{1,2},\d{1,2}(,\d{1,2}){0,4}$/.test(texto)) {
        const parts = texto.split(',').map((n) => Number(n));
        const [year, month, day, hour = 0, minute = 0, second = 0, nanoseconds = 0] = parts;
        const ms = Math.floor((nanoseconds || 0) / 1000000);
        return new Date(year, month - 1, day, hour, minute, second, ms);
      }

      const parsed = new Date(texto);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof valor === 'number') {
      const parsed = new Date(valor);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }

  obtenerClaseFilaCuota(codigo: number | null | undefined): string {
    if (!codigo) return 'cuota-desconocida';
    const sufijo = CLASES_ESTADO_CUOTA[codigo];
    return sufijo ? `cuota-${sufijo}` : 'cuota-desconocida';
  }

  /**
   * Retorna el código de negocio del estado de la cuota.
   * Contrato: detalle.estado (DTPRESTD) es la fuente de verdad; idEstado solo lo espeja.
   */
  obtenerCodigoEstadoCuota(detalle: DetallePrestamo | null | undefined): number | null {
    return leerCodigoEstadoCuota(detalle);
  }

  obtenerEstadoCuota(codigo: number | null | undefined): { texto: string; clase: string } {
    if (codigo == null) return { texto: '-', clase: 'cuota-desconocida' };
    const estadoEncontrado = this.estadosCuota().find((e) => e.codigoAlterno === codigo);
    const texto =
      estadoEncontrado?.nombre?.toUpperCase() ??
      NOMBRES_ESTADO_CUOTA[codigo]?.toUpperCase() ??
      String(codigo);
    const sufijo = CLASES_ESTADO_CUOTA[codigo];
    return { texto, clase: sufijo ? `cuota-${sufijo}` : 'cuota-desconocida' };
  }

  abrirSelectorExcel(): void {
    if (!this.ultimoPrestamoId()) {
      this.snackBar.open('Primero debe guardar el préstamo para cargar la tabla desde Excel', 'Cerrar', { duration: 3500 });
      return;
    }
    this.inputExcelRef.nativeElement.value = '';
    this.inputExcelRef.nativeElement.click();
  }

  onArchivoExcelSeleccionado(event: Event): void {
    const archivo = (event.target as HTMLInputElement).files?.[0];
    if (!archivo) return;

    const idPrestamo = this.ultimoPrestamoId();
    if (!idPrestamo) return;

    const extension = archivo.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xls' && extension !== 'xlsx') {
      this.snackBar.open('Solo se aceptan archivos Excel (.xls o .xlsx)', 'Cerrar', { duration: 3500 });
      return;
    }

    this.cargandoExcel.set(true);
    this.prestamoService.cargarTablaExcel(idPrestamo, archivo)
      .pipe(finalize(() => this.cargandoExcel.set(false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Tabla de amortización cargada correctamente desde Excel', 'Cerrar', { duration: 3500 });
          this.cargarDetallePrestamo(idPrestamo, true);
        },
        error: (err) => {
          this.snackBar.open(this.extraerMensajeError(err, 'Error al cargar el archivo Excel'), 'Cerrar', {
            duration: 6000,
            panelClass: ['error-snackbar'],
          });
        },
      });
  }

  irConsulta(): void {
    // Vuelta a PrestamoConsulta (la ida ya se verifica en prestamo-consulta.component.ts:1003/1009).
    // Regla del árbitro: en cada par A⇄B se verifica la ida, no la vuelta — no se cablea.
    this.router.navigate(['/menucreditos/prestamo-consulta']);
  }

  capturarFechaInicioRaw(event: Event): void {
    this._rawFechaInicio = (event.target as HTMLInputElement).value;
  }

  syncFechaInicioFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaInicio || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaInicio = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.form.get('fechaInicio')?.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.fechaInicioInputRef?.nativeElement) this.fechaInicioInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaInicioPickerChange(date: Date | null | undefined): void {
    this.form.get('fechaInicio')?.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.fechaInicioInputRef?.nativeElement) this.fechaInicioInputRef.nativeElement.value = formatted;
    });
  }

  private extraerMensajeError(err: any, fallback: string): string {
    if (!err) return fallback;
    // Backend lanza el body directamente via throwError(() => error.error)
    return (
      err?.mensaje ||
      err?.message ||
      err?.descripcion ||
      err?.description ||
      err?.error ||
      err?.detalle ||
      (typeof err === 'string' ? err : null) ||
      fallback
    );
  }
}

