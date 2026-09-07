import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UsuarioService } from '../../../../../shared/services/usuario.service';
import {
  CALIFICACIONES_RIESGO,
  CalificacionResultado,
  ConfiguracionEscalaRiesgo,
  EscalaRiesgoInput,
  ProblemaCobertura,
  ProductoEscalaRiesgo,
} from '../../../model/riesgo/escala-calificacion-riesgo.model';
import { EscalaCalificacionRiesgoService } from '../../../service/escala-calificacion-riesgo.service';

/** Una fila en modo edición. La `calificacion` es FIJA (no editable): son las 9 de la SBS. */
interface EscalaEdit {
  idEscala?: number;
  calificacion: string;
  diaDesde: number | null;
  /** `null` = sin límite superior. */
  diaHasta: number | null;
  sinLimite: boolean;
  porcentajeProvision: number | null;
  orden: number;
}

type ModoEdicion = 'ver' | 'crear' | 'editar' | 'nueva-vigencia';

/**
 * Parametrización de la escala de calificación de riesgo (SBS) por producto.
 *
 * ⚠️ BOCETO — 2026-09-07. Molde copiado de `bandas-cartera` (mismo modelo de vigencia, misma
 * configuración por producto+empresa) pero NO es el mismo dominio y NO comparte servicio ni
 * modelo: bandas resuelve una clasificación CONTABLE (cuenta del asiento); esta pantalla resuelve
 * una calificación REGULATORIA (% de provisión). Diferencias deliberadas frente al molde,
 * confirmadas por el árbitro contra el esquema real (`CRD.CFCR`/`CRD.ESCR`):
 *
 * - **Sin pestañas**: bandas separa "por vencer"/"vencido"; la escala de riesgo se mide sobre
 *   días de mora nada más, una sola escala por producto+empresa+vigencia.
 * - **Nueve filas FIJAS** (A1 A2 A3 B1 B2 C1 C2 D E de la SBS), no una lista variable: sin
 *   agregar/quitar/reordenar como en bandas.
 * - **Rango independiente por fila**: a diferencia de bandas (donde el backend deriva el rango
 *   por acumulación de "períodos" y por construcción no puede haber huecos), acá `diaDesde`/
 *   `diaHasta` se cargan a mano por fila — nada impide un hueco o un solape. Por eso esta
 *   pantalla SÍ valida la cobertura de verdad (`calcularCobertura()`) y la muestra con una barra
 *   segmentada, cosa que bandas nunca necesitó.
 * - **% de provisión en vez de cuenta contable** por fila.
 *
 * Sin contrato REST acordado todavía — ver `escala-calificacion-riesgo.service.ts`.
 */
@Component({
  selector: 'app-escala-calificacion-riesgo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './escala-calificacion-riesgo.component.html',
  styleUrl: './escala-calificacion-riesgo.component.scss',
})
export class EscalaCalificacionRiesgoComponent implements OnInit {
  readonly CALIFICACIONES_RIESGO = CALIFICACIONES_RIESGO;

  // Contexto de sesión
  idEmpresa: number | null = null;
  private usuarioAuditoria: string | null = null;

  // Carga del listado
  cargando = false;
  errorCarga: string | null = null;
  productos: ProductoEscalaRiesgo[] = [];
  productoSel: ProductoEscalaRiesgo | null = null;

  // Fecha a la que se evalúa la vigencia (null = hoy)
  fechaEvaluacion: Date | null = null;

  // Estado de edición
  modo: ModoEdicion = 'ver';
  escalasEdit: EscalaEdit[] = [];
  fechaInicioEdit: Date | null = null;
  fechaFinEdit: Date | null = null;
  fechaInicioNueva: Date | null = null;
  guardando = false;
  erroresValidacion: string[] = [];

  // Historial
  historial: ConfiguracionEscalaRiesgo[] = [];
  mostrarHistorial = false;
  cargandoHistorial = false;

  private fb = inject(FormBuilder);

  // Probador de calificación (verificación)
  probadorForm = this.fb.group({
    diasMora: [0 as number | null, [Validators.required, Validators.min(0)]],
  });
  resultadoCalificacion: CalificacionResultado | null = null;
  errorProbador: string | null = null;
  probando = false;

  constructor(
    private escalaService: EscalaCalificacionRiesgoService,
    private usuarioService: UsuarioService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.resolverContextoSesion();
    if (this.idEmpresa == null) {
      this.errorCarga =
        'No se pudo determinar la empresa de la sesión. Vuelva a iniciar sesión y reintente.';
      return;
    }
    this.cargarListado();
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

  // ===================== Carga del listado =====================

  cargarListado(): void {
    if (this.idEmpresa == null) {
      return;
    }
    this.cargando = true;
    this.errorCarga = null;
    const fecha = this.fechaEvaluacion ? this.aFechaIso(this.fechaEvaluacion) : undefined;

    this.escalaService.getListado(this.idEmpresa, fecha).subscribe({
      next: (data) => {
        this.cargando = false;
        this.productos = data ?? [];
        const idPrevio = this.productoSel?.idProducto;
        this.productoSel =
          this.productos.find((p) => p.idProducto === idPrevio) ?? this.productos[0] ?? null;
        this.cancelarEdicion();
        this.mostrarHistorial = false;
        this.resultadoCalificacion = null;
        this.errorProbador = null;
      },
      error: (mensaje: string) => {
        this.cargando = false;
        this.productos = [];
        this.productoSel = null;
        this.errorCarga = mensaje;
      },
    });
  }

  onFechaEvaluacionChange(): void {
    this.cargarListado();
  }

  seleccionarProducto(producto: ProductoEscalaRiesgo): void {
    if (this.productoSel?.idProducto === producto.idProducto) {
      return;
    }
    this.productoSel = producto;
    this.cancelarEdicion();
    this.mostrarHistorial = false;
    this.historial = [];
    this.resultadoCalificacion = null;
    this.errorProbador = null;
  }

  // ===================== Getters de vista =====================

  get configSel(): ConfiguracionEscalaRiesgo | null {
    return this.productoSel?.vigente ?? null;
  }

  get editando(): boolean {
    return this.modo !== 'ver';
  }

  // ===================== Edición =====================

  /** Alta de una configuración para un producto que hoy no la tiene. Las 9 filas ya vienen creadas. */
  crearConfiguracion(): void {
    this.modo = 'crear';
    this.fechaInicioEdit = null;
    this.fechaFinEdit = null;
    this.escalasEdit = CALIFICACIONES_RIESGO.map((calificacion, i) => this.nuevaEscalaEdit(calificacion, i + 1));
    this.erroresValidacion = [];
  }

  /** Edición en el lugar: solo permitida si la vigencia todavía no empezó (editable === true). */
  editarConfiguracion(): void {
    const config = this.configSel;
    if (!config || !config.editable) {
      return;
    }
    this.modo = 'editar';
    this.fechaInicioEdit = config.fechaInicio ? this.arrayAFecha(config.fechaInicio) : null;
    this.fechaFinEdit = config.fechaFin ? this.arrayAFecha(config.fechaFin) : null;
    this.escalasEdit = this.mapearEscalasAEdit(config);
    this.erroresValidacion = [];
  }

  /** Cambio normativo: cierra la vigencia actual y abre una nueva desde una fecha. */
  iniciarNuevaVigencia(): void {
    const config = this.configSel;
    if (!config) {
      return;
    }
    this.modo = 'nueva-vigencia';
    this.fechaInicioNueva = null;
    this.escalasEdit = this.mapearEscalasAEdit(config);
    this.erroresValidacion = [];
  }

  cancelarEdicion(): void {
    this.modo = 'ver';
    this.escalasEdit = [];
    this.fechaInicioEdit = null;
    this.fechaFinEdit = null;
    this.fechaInicioNueva = null;
    this.erroresValidacion = [];
  }

  private nuevaEscalaEdit(calificacion: string, orden: number): EscalaEdit {
    return {
      calificacion,
      diaDesde: null,
      diaHasta: null,
      sinLimite: false,
      porcentajeProvision: null,
      orden,
    };
  }

  private mapearEscalasAEdit(config: ConfiguracionEscalaRiesgo): EscalaEdit[] {
    // Las filas se muestran siempre en el orden fijo de la SBS (CALIFICACIONES_RIESGO), no en el
    // `orden` crudo del backend, que se conserva pero no gobierna la presentación (ver nota del
    // modelo sobre ESCRORDN).
    return CALIFICACIONES_RIESGO.map((calificacion, i) => {
      const existente = config.escalas.find((e) => e.calificacion === calificacion);
      if (!existente) {
        return this.nuevaEscalaEdit(calificacion, i + 1);
      }
      return {
        idEscala: existente.idEscala,
        calificacion,
        diaDesde: existente.diaDesde,
        diaHasta: existente.diaHasta,
        sinLimite: existente.diaHasta == null,
        porcentajeProvision: existente.porcentajeProvision,
        orden: existente.orden,
      };
    });
  }

  onSinLimiteChange(fila: EscalaEdit): void {
    if (fila.sinLimite) {
      fila.diaHasta = null;
    }
    this.validar();
  }

  // ===================== Validación =====================

  validar(): string[] {
    const errores: string[] = [];
    const filas = this.escalasEdit;

    filas.forEach((f) => {
      if (f.diaDesde == null || f.diaDesde < 0) {
        errores.push(`${f.calificacion}: el día desde es obligatorio y no puede ser negativo.`);
      }
      if (!f.sinLimite) {
        if (f.diaHasta == null) {
          errores.push(`${f.calificacion}: el día hasta es obligatorio (o marque "sin límite").`);
        } else if (f.diaDesde != null && f.diaHasta < f.diaDesde) {
          errores.push(`${f.calificacion}: el día hasta no puede ser menor que el día desde.`);
        }
      }
      if (f.porcentajeProvision == null || f.porcentajeProvision < 0 || f.porcentajeProvision > 100) {
        errores.push(`${f.calificacion}: el % de provisión es obligatorio y debe estar entre 0 y 100.`);
      }
    });

    if (errores.length === 0) {
      // La cobertura solo se puede evaluar con datos ya válidos por fila.
      for (const problema of this.calcularCobertura()) {
        errores.push(this.textoProblemaCobertura(problema));
      }
    }

    this.erroresValidacion = errores;
    return errores;
  }

  /**
   * ⛔ A diferencia de bandas (donde el rango se deriva por acumulación y nunca puede fallar),
   * acá cada fila trae su propio `diaDesde`/`diaHasta` cargados a mano: nada impide
   * estructuralmente un hueco o un solape. Se recorre la escala ordenada por `diaDesde` llevando
   * un cursor con "hasta dónde ya está cubierto"; cualquier salto hacia adelante es un hueco,
   * cualquier fila que empiece antes de que el cursor haya avanzado es un solape.
   */
  calcularCobertura(): ProblemaCobertura[] {
    const filas = this.escalasEdit
      .filter((f) => f.diaDesde != null)
      .map((f) => ({ desde: f.diaDesde as number, hasta: f.sinLimite ? null : f.diaHasta }))
      .sort((a, b) => a.desde - b.desde);

    const problemas: ProblemaCobertura[] = [];
    let cursor = 0;
    for (const fila of filas) {
      if (fila.desde > cursor) {
        problemas.push({ tipo: 'hueco', desde: cursor, hasta: fila.desde - 1 });
      } else if (fila.desde < cursor) {
        problemas.push({ tipo: 'solape', desde: fila.desde, hasta: cursor - 1 });
      }
      cursor = fila.hasta == null ? Infinity : Math.max(cursor, fila.hasta + 1);
    }
    if (cursor !== Infinity) {
      problemas.push({ tipo: 'hueco', desde: cursor, hasta: null });
    }
    return problemas;
  }

  textoProblemaCobertura(p: ProblemaCobertura): string {
    const rango = p.hasta == null ? `desde el día ${p.desde} en adelante` : `entre los días ${p.desde} y ${p.hasta}`;
    return p.tipo === 'hueco'
      ? `Hueco en la escala: ningún tramo cubre ${rango}. Una mora ahí no calificaría.`
      : `Solape en la escala: más de un tramo cubre ${rango}.`;
  }

  private validarFechaVigencia(): string[] {
    const errores: string[] = [];
    if (this.modo === 'nueva-vigencia') {
      if (!this.fechaInicioNueva) {
        errores.push('La fecha de inicio de la nueva vigencia es obligatoria.');
      }
    } else if (!this.fechaInicioEdit) {
      errores.push('La fecha de inicio de la vigencia es obligatoria.');
    }
    return errores;
  }

  get puedeGuardar(): boolean {
    return !this.guardando && this.validar().length === 0 && this.validarFechaVigencia().length === 0;
  }

  // ===================== Guardar / Cerrar vigencia =====================

  guardar(): void {
    if (this.modo === 'nueva-vigencia') {
      this.confirmarNuevaVigencia();
      return;
    }

    const errores = [...this.validar(), ...this.validarFechaVigencia()];
    if (errores.length > 0) {
      return;
    }
    if (this.idEmpresa == null || !this.productoSel) {
      return;
    }

    this.guardando = true;
    const esEdicion = this.modo === 'editar';
    this.escalaService
      .guardarConfiguracion({
        idConfiguracion: esEdicion ? this.configSel?.idConfiguracion ?? null : null,
        idProducto: this.productoSel.idProducto,
        idEmpresa: this.idEmpresa,
        nombre: `Escala ${this.productoSel.nombreProducto}`,
        fechaInicio: this.aFechaIso(this.fechaInicioEdit!),
        fechaFin: this.fechaFinEdit ? this.aFechaIso(this.fechaFinEdit) : null,
        usuario: this.usuarioAuditoria,
        ip: null,
        escalas: this.construirEscalasInput(),
      })
      .subscribe({
        next: (config) => {
          this.guardando = false;
          this.aplicarConfigGuardada(config);
          this.cancelarEdicion();
          this.notificar(
            esEdicion ? 'Configuración actualizada correctamente.' : 'Configuración creada correctamente.',
            true,
          );
        },
        error: (mensaje: string) => {
          this.guardando = false;
          this.notificar(mensaje, false);
        },
      });
  }

  private confirmarNuevaVigencia(): void {
    const errores = [...this.validar(), ...this.validarFechaVigencia()];
    if (errores.length > 0) {
      return;
    }
    const config = this.configSel;
    if (!config) {
      return;
    }

    this.guardando = true;
    this.escalaService
      .cerrarVigencia({
        idConfiguracionVigente: config.idConfiguracion,
        fechaInicioNueva: this.aFechaIso(this.fechaInicioNueva!),
        usuario: this.usuarioAuditoria,
        ip: null,
        escalas: this.construirEscalasInput(),
      })
      .subscribe({
        next: (nueva) => {
          this.guardando = false;
          this.aplicarConfigGuardada(nueva);
          this.cancelarEdicion();
          if (this.mostrarHistorial) {
            this.cargarHistorial();
          }
          this.notificar('Nueva vigencia creada correctamente.', true);
        },
        error: (mensaje: string) => {
          this.guardando = false;
          this.notificar(mensaje, false);
        },
      });
  }

  private construirEscalasInput(): EscalaRiesgoInput[] {
    return this.escalasEdit.map((f, i) => ({
      calificacion: f.calificacion,
      diaDesde: f.diaDesde as number,
      diaHasta: f.sinLimite ? null : f.diaHasta,
      porcentajeProvision: f.porcentajeProvision as number,
      orden: i + 1,
    }));
  }

  /** Actualiza en memoria la configuración vigente del producto seleccionado tras grabar. */
  private aplicarConfigGuardada(config: ConfiguracionEscalaRiesgo): void {
    if (!this.productoSel) {
      return;
    }
    this.productoSel.vigente = config;
    this.productos = this.productos.map((p) =>
      p.idProducto === this.productoSel!.idProducto ? this.productoSel! : p,
    );
  }

  // ===================== Historial =====================

  toggleHistorial(): void {
    this.mostrarHistorial = !this.mostrarHistorial;
    if (this.mostrarHistorial && this.historial.length === 0) {
      this.cargarHistorial();
    }
  }

  private cargarHistorial(): void {
    if (this.idEmpresa == null || !this.productoSel) {
      return;
    }
    this.cargandoHistorial = true;
    this.escalaService.getHistorial(this.productoSel.idProducto, this.idEmpresa).subscribe({
      next: (data) => {
        this.cargandoHistorial = false;
        this.historial = data ?? [];
      },
      error: (mensaje: string) => {
        this.cargandoHistorial = false;
        this.historial = [];
        this.notificar(mensaje, false);
      },
    });
  }

  // ===================== Probador de calificación =====================

  probar(): void {
    this.resultadoCalificacion = null;
    this.errorProbador = null;
    if (this.probadorForm.invalid || this.idEmpresa == null || !this.productoSel) {
      this.probadorForm.markAllAsTouched();
      return;
    }
    const diasMora = this.probadorForm.value.diasMora!;
    const fecha = this.fechaEvaluacion ? this.aFechaIso(this.fechaEvaluacion) : undefined;

    this.probando = true;
    this.escalaService.probar(this.productoSel.idProducto, this.idEmpresa, diasMora, fecha).subscribe({
      next: (res) => {
        this.probando = false;
        this.resultadoCalificacion = res;
      },
      error: (mensaje: string) => {
        this.probando = false;
        this.errorProbador = mensaje;
      },
    });
  }

  // ===================== Barra de cobertura (visual) =====================

  /** Ancho representativo (en "días") para un tramo abierto o un hueco final, solo para dibujar. */
  private static readonly ANCHO_VISUAL_ABIERTO = 30;

  /** Segmentos para pintar la barra: filas de la escala + huecos, todos ordenados por inicio. */
  segmentosCobertura(): { tipo: 'fila' | 'hueco' | 'solape'; etiqueta: string; ancho: number; indiceCalificacion: number }[] {
    const filas = this.escalasEdit
      .filter((f) => f.diaDesde != null)
      .map((f) => ({ calificacion: f.calificacion, desde: f.diaDesde as number, hasta: f.sinLimite ? null : f.diaHasta }))
      .sort((a, b) => a.desde - b.desde);

    const segmentos: { tipo: 'fila' | 'hueco' | 'solape'; etiqueta: string; ancho: number; indiceCalificacion: number }[] = [];
    let cursor = 0;
    for (const fila of filas) {
      if (fila.desde > cursor) {
        segmentos.push({ tipo: 'hueco', etiqueta: `${cursor}–${fila.desde - 1}`, ancho: fila.desde - cursor, indiceCalificacion: -1 });
      }
      const ancho = fila.hasta == null
        ? EscalaCalificacionRiesgoComponent.ANCHO_VISUAL_ABIERTO
        : Math.max(1, fila.hasta - Math.max(fila.desde, cursor) + 1);
      const esSolape = fila.desde < cursor;
      segmentos.push({
        tipo: esSolape ? 'solape' : 'fila',
        etiqueta: fila.calificacion,
        ancho,
        indiceCalificacion: CALIFICACIONES_RIESGO.indexOf(fila.calificacion as any),
      });
      cursor = fila.hasta == null ? Infinity : Math.max(cursor, fila.hasta + 1);
    }
    if (cursor !== Infinity) {
      segmentos.push({ tipo: 'hueco', etiqueta: `${cursor}+`, ancho: EscalaCalificacionRiesgoComponent.ANCHO_VISUAL_ABIERTO, indiceCalificacion: -1 });
    }
    return segmentos;
  }

  // ===================== Utilidades =====================

  /** Formatea un LocalDate del backend ([y,m,d]) como "dd/MM/yyyy". */
  formatoFechaArray(arr: number[] | null | undefined): string {
    if (!arr || arr.length < 3) {
      return '—';
    }
    const [y, m, d] = arr;
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  }

  private arrayAFecha(arr: number[]): Date {
    return new Date(arr[0], arr[1] - 1, arr[2]);
  }

  /** Formatea un Date como "yyyy-MM-dd" usando la fecha LOCAL — nunca `toISOString()` (regla del proyecto). */
  private aFechaIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  private notificar(mensaje: string, exito: boolean): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: exito ? 4000 : 9000,
      panelClass: [exito ? 'success-snackbar' : 'error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  trackProducto(_: number, p: ProductoEscalaRiesgo): number {
    return p.idProducto;
  }
}
