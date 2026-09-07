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
  ProductoEscalaRiesgo,
} from '../../../model/riesgo/escala-calificacion-riesgo.model';
import { EscalaCalificacionRiesgoService } from '../../../service/escala-calificacion-riesgo.service';

/**
 * Una fila en modo edición. La `calificacion` es FIJA (no editable): son las 9 de la SBS, siempre
 * en el orden de `CALIFICACIONES_RIESGO` (que es también el orden que se envía al backend).
 *
 * ⛔ `diaDesde` es SOLO LECTURA acá — igual que en el modelo de respuesta: el servidor lo deriva
 * (`diaHasta` de la fila anterior + 1, la primera en 0), así que esta pantalla lo recalcula en el
 * cliente (`recalcularDiasDesde()`) nada más para mostrarlo, nunca lo envía. Confirmado por el
 * árbitro, 2026-09-07, contra el contrato cerrado (`API-CALIFICACION-RIESGO.md` §8).
 */
interface EscalaEdit {
  idEscala?: number;
  calificacion: string;
  diaDesde: number;
  /** `null` = sin límite superior — estructuralmente solo posible en la ÚLTIMA fila (E). */
  diaHasta: number | null;
  /** En PUNTOS PORCENTUALES (0-100) para que el usuario tipee "5" en vez de "0.05" — ver `construirEscalasInput`. */
  porcentajeProvision: number | null;
}

type ModoEdicion = 'ver' | 'crear' | 'editar' | 'nueva-vigencia';

/**
 * Parametrización de la escala de calificación de riesgo (SBS) por producto.
 *
 * Molde copiado de `bandas-cartera` (mismo modelo de vigencia, misma configuración por
 * producto+empresa) pero NO es el mismo dominio y NO comparte servicio ni modelo: bandas resuelve
 * una clasificación CONTABLE (cuenta del asiento); esta pantalla resuelve una calificación
 * REGULATORIA (% de provisión). Diferencias deliberadas frente al molde, contra el contrato
 * cerrado (`docs/logica-negocio/crd/API-CALIFICACION-RIESGO.md` en `saaBE`):
 *
 * - **Sin pestañas**: bandas separa "por vencer"/"vencido"; la escala de riesgo se mide sobre
 *   días de mora nada más, una sola escala por producto+empresa+vigencia.
 * - **Nueve filas FIJAS** (A1 A2 A3 B1 B2 C1 C2 D E de la SBS), no una lista variable: sin
 *   agregar/quitar/reordenar como en bandas.
 * - **`diaDesde` derivado por el servidor** (§8 del contrato): solo se edita `diaHasta`, y por
 *   construcción ya no puede haber huecos ni solapes entre filas — el único estado inválido que
 *   sigue siendo posible es tipear un `diaHasta` menor al `diaDesde` ya calculado de esa fila
 *   (que depende del `diaHasta` de la fila anterior). La barra de cobertura pintaba huecos/solapes
 *   antes; ahora resalta ESE error puntual mientras se edita.
 * - **`idEmpresa` opcional** (`null` = "cualquier empresa", §1) — a propósito, distinto de bandas.
 * - **% de provisión en vez de cuenta contable** por fila (tanto por uno en el modelo/wire, puntos
 *   porcentuales en esta pantalla para que el usuario tipee "5" en vez de "0.05").
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
  /**
   * `idEmpresa: null` = "cualquier empresa" (§1 del contrato), a propósito y distinto de bandas de
   * cartera. Por defecto se guarda para la empresa de la sesión; este checkbox es la excepción.
   */
  aplicaTodasLasEmpresas = false;
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
  /** La respuesta de `/probar` no repite `dias` (§10 del contrato) — se guarda lo enviado para mostrarlo. */
  ultimoDiasProbado: number | null = null;
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
    return this.productoSel?.configuracion ?? null;
  }

  get editando(): boolean {
    return this.modo !== 'ver';
  }

  /** La última fila (índice `length - 1`) es siempre "E": la única que puede quedar sin límite. */
  esUltimaFila(i: number): boolean {
    return i === this.escalasEdit.length - 1;
  }

  /**
   * El backend valida "al menos 1 línea", así que en teoría podría existir una configuración
   * grabada con menos de las 9 categorías SBS (hoy no pasa: la escala real es fija). Si pasara,
   * NO hay que inventar las filas que faltan para completar la vista — mostrar exactamente lo que
   * vino y avisar, porque inventar acá le mostraría al usuario una escala distinta de la que usa
   * el reporte regulatorio real. Pedido explícito del árbitro, 2026-09-07.
   */
  get configIncompleta(): boolean {
    return !!this.configSel && this.configSel.escalas.length < CALIFICACIONES_RIESGO.length;
  }

  // ===================== Edición =====================

  /** Alta de una configuración para un producto que hoy no la tiene. Las 9 filas ya vienen creadas. */
  crearConfiguracion(): void {
    this.modo = 'crear';
    this.fechaInicioEdit = null;
    this.fechaFinEdit = null;
    this.aplicaTodasLasEmpresas = false;
    this.escalasEdit = CALIFICACIONES_RIESGO.map((calificacion) => this.nuevaEscalaEdit(calificacion));
    this.recalcularDiasDesde();
    this.erroresValidacion = [];
  }

  /** Edición en el lugar: solo permitida si la vigencia todavía no empezó (editable === true). */
  editarConfiguracion(): void {
    const config = this.configSel;
    if (!config || !config.editable) {
      return;
    }
    this.modo = 'editar';
    this.fechaInicioEdit = config.fechaDesde ? this.arrayAFecha(config.fechaDesde) : null;
    this.fechaFinEdit = config.fechaHasta ? this.arrayAFecha(config.fechaHasta) : null;
    this.aplicaTodasLasEmpresas = config.idEmpresa == null;
    this.escalasEdit = this.mapearEscalasAEdit(config);
    this.recalcularDiasDesde();
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
    this.aplicaTodasLasEmpresas = config.idEmpresa == null;
    this.escalasEdit = this.mapearEscalasAEdit(config);
    this.recalcularDiasDesde();
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

  private nuevaEscalaEdit(calificacion: string): EscalaEdit {
    return {
      calificacion,
      diaDesde: 0,
      diaHasta: null,
      porcentajeProvision: null,
    };
  }

  private mapearEscalasAEdit(config: ConfiguracionEscalaRiesgo): EscalaEdit[] {
    // Las filas se muestran siempre en el orden fijo de la SBS (CALIFICACIONES_RIESGO), que es
    // también el orden de evaluación que espera el backend en `escalas` (§8 del contrato).
    return CALIFICACIONES_RIESGO.map((calificacion) => {
      const existente = config.escalas.find((e) => e.calificacion === calificacion);
      if (!existente) {
        return this.nuevaEscalaEdit(calificacion);
      }
      return {
        idEscala: existente.idEscala,
        calificacion,
        diaDesde: existente.diaDesde,
        diaHasta: existente.diaHasta,
        // El backend viaja en tanto por uno (0.05); acá se edita en puntos porcentuales (5).
        porcentajeProvision: existente.porcentajeProvision * 100,
      };
    });
  }

  /**
   * Recalcula `diaDesde` de cada fila a partir del `diaHasta` de la anterior (la primera en 0) —
   * el mismo criterio que aplica el backend (§8 del contrato) — y fuerza `diaHasta = null` en la
   * última fila, que es la única que puede quedar sin límite superior. Se llama después de
   * inicializar `escalasEdit` y cada vez que el usuario edita un `diaHasta`.
   */
  recalcularDiasDesde(): void {
    let cursor = 0;
    this.escalasEdit.forEach((f, i) => {
      f.diaDesde = cursor;
      if (this.esUltimaFila(i)) {
        f.diaHasta = null;
      }
      cursor = f.diaHasta == null ? cursor : f.diaHasta + 1;
    });
    this.validar();
  }

  // ===================== Validación =====================

  /**
   * ⛔ Con `diaDesde` derivado (§8 del contrato) ya no puede haber huecos ni solapes entre filas:
   * son estructuralmente imposibles de expresar. El único estado inválido que sigue siendo
   * posible es tipear, en una fila que no sea la última, un `diaHasta` menor al `diaDesde` ya
   * calculado de esa fila (que depende de cuánto se haya tipeado en la anterior).
   */
  validar(): string[] {
    const errores: string[] = [];
    const filas = this.escalasEdit;

    filas.forEach((f, i) => {
      if (!this.esUltimaFila(i)) {
        if (f.diaHasta == null) {
          errores.push(`${f.calificacion}: el día hasta es obligatorio.`);
        } else if (f.diaHasta < f.diaDesde) {
          errores.push(
            `${f.calificacion}: el día hasta (${f.diaHasta}) no puede ser menor al día desde calculado (${f.diaDesde}). Revise el día hasta de la fila anterior.`,
          );
        }
      }
      if (f.porcentajeProvision == null || f.porcentajeProvision < 0 || f.porcentajeProvision > 100) {
        errores.push(`${f.calificacion}: el % de provisión es obligatorio y debe estar entre 0 y 100.`);
      }
    });

    this.erroresValidacion = errores;
    return errores;
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
        idEmpresa: this.aplicaTodasLasEmpresas ? null : this.idEmpresa,
        nombre: `Escala ${this.productoSel.nombreProducto}`,
        fechaDesde: this.aFechaIso(this.fechaInicioEdit!),
        fechaHasta: this.fechaFinEdit ? this.aFechaIso(this.fechaFinEdit) : null,
        usuario: this.usuarioAuditoria,
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
        fechaDesdeNueva: this.aFechaIso(this.fechaInicioNueva!),
        usuario: this.usuarioAuditoria,
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

  /** ⛔ NO incluye `diaDesde` ni `orden` (§8 del contrato) — ver el modelo `EscalaRiesgoInput`. */
  private construirEscalasInput(): EscalaRiesgoInput[] {
    return this.escalasEdit.map((f) => ({
      calificacion: f.calificacion,
      diaHasta: f.diaHasta,
      // El backend espera tanto por uno (0.05), acá se edita en puntos porcentuales (5).
      porcentajeProvision: (f.porcentajeProvision as number) / 100,
    }));
  }

  /** Actualiza en memoria la configuración vigente del producto seleccionado tras grabar. */
  private aplicarConfigGuardada(config: ConfiguracionEscalaRiesgo): void {
    if (!this.productoSel) {
      return;
    }
    this.productoSel.configuracion = config;
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
    const dias = this.probadorForm.value.diasMora!;
    const fecha = this.fechaEvaluacion ? this.aFechaIso(this.fechaEvaluacion) : undefined;

    this.probando = true;
    this.ultimoDiasProbado = dias;
    this.escalaService.probar(this.productoSel.idProducto, this.idEmpresa, dias, fecha).subscribe({
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

  private static readonly ANCHO_VISUAL_ABIERTO = 30;

  /**
   * Segmentos para pintar la barra: una por fila, en el orden fijo de la SBS. Ya no puede haber
   * huecos ni solapes (§8 del contrato); el tipo `error` resalta el único estado inválido que
   * sigue siendo posible — un `diaHasta` tipeado por debajo del `diaDesde` ya calculado de esa
   * fila — mientras el usuario todavía está editando.
   */
  segmentosCobertura(): { tipo: 'fila' | 'error'; etiqueta: string; ancho: number; indiceCalificacion: number }[] {
    return this.escalasEdit.map((f, i) => {
      const esError = !this.esUltimaFila(i) && f.diaHasta != null && f.diaHasta < f.diaDesde;
      const ancho =
        f.diaHasta == null
          ? EscalaCalificacionRiesgoComponent.ANCHO_VISUAL_ABIERTO
          : Math.max(1, f.diaHasta - f.diaDesde + 1);
      return {
        tipo: esError ? 'error' : 'fila',
        etiqueta: f.calificacion,
        ancho,
        indiceCalificacion: i,
      };
    });
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
