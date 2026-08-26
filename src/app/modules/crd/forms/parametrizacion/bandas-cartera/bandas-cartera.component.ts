import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UsuarioService } from '../../../../../shared/services/usuario.service';
import {
  BandaInput,
  ClasificacionBanda,
  ConfiguracionBandaDetalle,
  CuentaBandaDisponible,
  ProductoBandas,
  TIPO_CARTERA,
} from '../../../model/bandas/bandas-cartera.model';
import { BandasCarteraService } from '../../../service/bandas-cartera.service';

/** Una banda en modo edición. El `numero` NO se guarda aquí: se deriva del orden del array. */
interface BandaEdit {
  idBanda?: number;
  periodos: number | null;
  idPlanCuenta: number | null;
  cuentaContable: string;
  nombreCuenta: string;
  esResto: boolean;
  /** Texto libre del buscador de cuenta de esta fila. */
  busquedaCuenta: string;
  /** Opciones actuales del autocompletado de cuenta. */
  opcionesCuenta: CuentaBandaDisponible[];
  buscandoCuenta: boolean;
}

type ModoEdicion = 'ver' | 'crear' | 'editar' | 'nueva-vigencia';

/**
 * Parametrización de bandas de cartera por producto.
 *
 * Cada producto de crédito tiene dos configuraciones: POR VENCER (tipoCartera 1) y
 * VENCIDO (tipoCartera 2). Cada configuración es una lista de bandas de 30 días con su
 * cuenta contable; la última banda es abierta ("Resto"). Los rangos en días los deriva y
 * devuelve el backend: esta pantalla los MUESTRA, no los calcula.
 *
 * Contrato: docs/crd/API-BANDAS-PRODUCTO.md.
 */
@Component({
  selector: 'app-bandas-cartera',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './bandas-cartera.component.html',
  styleUrl: './bandas-cartera.component.scss',
})
export class BandasCarteraComponent implements OnInit {
  readonly TIPO_CARTERA = TIPO_CARTERA;

  // Contexto de sesión
  idEmpresa: number | null = null;
  private usuarioAuditoria: string | null = null;

  // Carga del listado
  cargando = false;
  errorCarga: string | null = null;
  productos: ProductoBandas[] = [];
  productoSel: ProductoBandas | null = null;

  // Fecha a la que se evalúa la vigencia (null = hoy)
  fechaEvaluacion: Date | null = null;

  // Pestaña de cartera: 0 = Por vencer (1), 1 = Vencido (2)
  tabIndex = 0;

  // Estado de edición
  modo: ModoEdicion = 'ver';
  bandasEdit: BandaEdit[] = [];
  fechaDesdeEdit: Date | null = null;
  fechaHastaEdit: Date | null = null;
  fechaDesdeNueva: Date | null = null;
  guardando = false;
  erroresValidacion: string[] = [];

  // Historial
  historial: ConfiguracionBandaDetalle[] = [];
  mostrarHistorial = false;
  cargandoHistorial = false;

  // FormBuilder vía inject() (no por constructor): se usa en el inicializador de
  // `probadorForm`, que con target ES2022 corre antes del cuerpo del constructor.
  private fb = inject(FormBuilder);

  // Probador de clasificación (verificación)
  probadorForm = this.fb.group({
    dias: [30 as number | null, [Validators.required, Validators.min(1)]],
  });
  resultadoClasificacion: ClasificacionBanda | null = null;
  errorProbador: string | null = null;
  clasificando = false;

  private timersCuenta = new Map<BandaEdit, ReturnType<typeof setTimeout>>();

  constructor(
    private bandasService: BandasCarteraService,
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
    this.usuarioAuditoria =
      usuario?.nombre ?? sessionStorage.getItem('username') ?? null;
  }

  // ===================== Carga del listado =====================

  cargarListado(): void {
    if (this.idEmpresa == null) {
      return;
    }
    this.cargando = true;
    this.errorCarga = null;
    const fecha = this.fechaEvaluacion ? this.aFechaIso(this.fechaEvaluacion) : undefined;

    this.bandasService.getListado(this.idEmpresa, fecha).subscribe({
      next: (data) => {
        this.cargando = false;
        this.productos = data ?? [];
        const idPrevio = this.productoSel?.idProducto;
        this.productoSel =
          this.productos.find((p) => p.idProducto === idPrevio) ??
          this.productos[0] ??
          null;
        this.cancelarEdicion();
        this.mostrarHistorial = false;
        this.resultadoClasificacion = null;
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

  seleccionarProducto(producto: ProductoBandas): void {
    if (this.productoSel?.idProducto === producto.idProducto) {
      return;
    }
    this.productoSel = producto;
    this.cancelarEdicion();
    this.mostrarHistorial = false;
    this.historial = [];
    this.resultadoClasificacion = null;
    this.errorProbador = null;
  }

  onTabChange(index: number): void {
    this.tabIndex = index;
    this.cancelarEdicion();
    this.mostrarHistorial = false;
    this.historial = [];
    this.resultadoClasificacion = null;
    this.errorProbador = null;
  }

  // ===================== Getters de vista =====================

  get tipoCarteraSel(): number {
    return this.tabIndex === 0 ? TIPO_CARTERA.POR_VENCER : TIPO_CARTERA.VENCIDO;
  }

  /** Configuración vigente del producto + cartera seleccionados (o null si no existe). */
  get configSel(): ConfiguracionBandaDetalle | null {
    if (!this.productoSel) {
      return null;
    }
    return this.tabIndex === 0 ? this.productoSel.porVencer : this.productoSel.vencido;
  }

  get editando(): boolean {
    return this.modo !== 'ver';
  }

  // ===================== Edición =====================

  /** Alta de una configuración para un producto/cartera que hoy no la tiene. */
  crearConfiguracion(): void {
    this.modo = 'crear';
    this.fechaDesdeEdit = null;
    this.fechaHastaEdit = null;
    this.bandasEdit = [
      this.nuevaBandaEdit(1, false),
      this.nuevaBandaEdit(null, true),
    ];
    this.erroresValidacion = [];
  }

  /** Edición en el lugar: solo permitida si la vigencia todavía no empezó (editable === true). */
  editarConfiguracion(): void {
    const config = this.configSel;
    if (!config || !config.editable) {
      return;
    }
    this.modo = 'editar';
    this.fechaDesdeEdit = config.fechaDesde ? this.arrayAFecha(config.fechaDesde) : null;
    this.fechaHastaEdit = config.fechaHasta ? this.arrayAFecha(config.fechaHasta) : null;
    this.bandasEdit = this.mapearBandasAEdit(config);
    this.erroresValidacion = [];
  }

  /** Cambio normativo: cierra la vigencia actual y abre una nueva desde una fecha. */
  iniciarNuevaVigencia(): void {
    const config = this.configSel;
    if (!config) {
      return;
    }
    this.modo = 'nueva-vigencia';
    this.fechaDesdeNueva = null;
    // Se parte de las bandas actuales como base editable.
    this.bandasEdit = this.mapearBandasAEdit(config);
    this.erroresValidacion = [];
  }

  cancelarEdicion(): void {
    this.modo = 'ver';
    this.bandasEdit = [];
    this.fechaDesdeEdit = null;
    this.fechaHastaEdit = null;
    this.fechaDesdeNueva = null;
    this.erroresValidacion = [];
    this.timersCuenta.clear();
  }

  private nuevaBandaEdit(periodos: number | null, esResto: boolean): BandaEdit {
    return {
      periodos,
      idPlanCuenta: null,
      cuentaContable: '',
      nombreCuenta: '',
      esResto,
      busquedaCuenta: '',
      opcionesCuenta: [],
      buscandoCuenta: false,
    };
  }

  private mapearBandasAEdit(config: ConfiguracionBandaDetalle): BandaEdit[] {
    const total = config.bandas.length;
    return config.bandas.map((b, i) => ({
      idBanda: b.idBanda,
      periodos: b.periodos,
      idPlanCuenta: b.idPlanCuenta,
      cuentaContable: b.cuentaContable,
      nombreCuenta: b.nombreCuenta,
      esResto: i === total - 1,
      busquedaCuenta: b.cuentaContable,
      opcionesCuenta: [],
      buscandoCuenta: false,
    }));
  }

  /** Agrega una banda cerrada justo antes de la banda "Resto" (que siempre queda al final). */
  agregarBanda(): void {
    const idxResto = this.bandasEdit.findIndex((b) => b.esResto);
    const nueva = this.nuevaBandaEdit(1, false);
    if (idxResto === -1) {
      this.bandasEdit.push(nueva);
    } else {
      this.bandasEdit.splice(idxResto, 0, nueva);
    }
    this.validar();
  }

  quitarBanda(index: number): void {
    const banda = this.bandasEdit[index];
    if (!banda || banda.esResto) {
      return; // La banda Resto no se quita: siempre debe existir una banda abierta al final.
    }
    this.timersCuenta.delete(banda);
    this.bandasEdit.splice(index, 1);
    this.validar();
  }

  subirBanda(index: number): void {
    if (index <= 0) {
      return;
    }
    const actual = this.bandasEdit[index];
    const previa = this.bandasEdit[index - 1];
    if (actual.esResto || previa.esResto) {
      return; // No se reordena la banda Resto.
    }
    this.bandasEdit[index - 1] = actual;
    this.bandasEdit[index] = previa;
    this.validar();
  }

  bajarBanda(index: number): void {
    if (index >= this.bandasEdit.length - 1) {
      return;
    }
    const actual = this.bandasEdit[index];
    const siguiente = this.bandasEdit[index + 1];
    if (actual.esResto || siguiente.esResto) {
      return; // No se puede empujar una banda debajo del Resto.
    }
    this.bandasEdit[index + 1] = actual;
    this.bandasEdit[index] = siguiente;
    this.validar();
  }

  // ===================== Buscador de cuenta =====================

  onBuscarCuenta(banda: BandaEdit, termino: string): void {
    banda.busquedaCuenta = termino;
    const filtro = (termino ?? '').trim();

    const timerPrevio = this.timersCuenta.get(banda);
    if (timerPrevio) {
      clearTimeout(timerPrevio);
    }

    if (filtro.length < 3) {
      banda.opcionesCuenta = [];
      banda.buscandoCuenta = false;
      return;
    }

    banda.buscandoCuenta = true;
    const timer = setTimeout(() => {
      if (this.idEmpresa == null) {
        return;
      }
      this.bandasService.buscarCuentas(this.idEmpresa, filtro).subscribe({
        next: (cuentas) => {
          banda.opcionesCuenta = cuentas ?? [];
          banda.buscandoCuenta = false;
        },
        error: (mensaje: string) => {
          banda.opcionesCuenta = [];
          banda.buscandoCuenta = false;
          this.notificar(mensaje, false);
        },
      });
    }, 300);
    this.timersCuenta.set(banda, timer);
  }

  onCuentaSeleccionada(banda: BandaEdit, cuenta: CuentaBandaDisponible): void {
    banda.idPlanCuenta = cuenta.idPlanCuenta;
    banda.cuentaContable = cuenta.cuentaContable;
    banda.nombreCuenta = cuenta.nombre;
    banda.busquedaCuenta = cuenta.cuentaContable;
    banda.opcionesCuenta = [];
    this.validar();
  }

  // ===================== Validación (espejo del backend §2.4) =====================

  validar(): string[] {
    const errores: string[] = [];
    const bandas = this.bandasEdit;

    if (bandas.length === 0) {
      errores.push('La configuración debe tener al menos una banda.');
      this.erroresValidacion = errores;
      return errores;
    }

    const abiertas = bandas.filter((b) => b.periodos == null);
    const ultima = bandas[bandas.length - 1];
    if (abiertas.length !== 1 || ultima.periodos != null) {
      errores.push(
        'Debe haber EXACTAMENTE una banda abierta (Resto) y debe ser la última.',
      );
    }

    bandas.forEach((b, i) => {
      const numero = i + 1;
      const esUltima = i === bandas.length - 1;
      if (!esUltima) {
        if (b.periodos == null) {
          errores.push(`La banda ${numero} solo puede tener períodos vacíos si es la última.`);
        } else if (b.periodos < 1) {
          errores.push(`Los períodos de la banda ${numero} deben ser mayores o iguales a 1.`);
        }
      }
      if (b.idPlanCuenta == null) {
        errores.push(`La cuenta contable de la banda ${numero} es obligatoria.`);
      }
    });

    this.erroresValidacion = errores;
    return errores;
  }

  private validarFechaVigencia(): string[] {
    const errores: string[] = [];
    if (this.modo === 'nueva-vigencia') {
      if (!this.fechaDesdeNueva) {
        errores.push('La fecha desde de la nueva vigencia es obligatoria.');
      }
    } else if (!this.fechaDesdeEdit) {
      errores.push('La fecha desde de la vigencia es obligatoria.');
    }
    return errores;
  }

  get puedeGuardar(): boolean {
    return (
      !this.guardando &&
      this.validar().length === 0 &&
      this.validarFechaVigencia().length === 0
    );
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
    this.bandasService
      .guardarConfiguracion({
        idConfiguracion: esEdicion ? this.configSel?.idConfiguracion ?? null : null,
        idProducto: this.productoSel.idProducto,
        idEmpresa: this.idEmpresa,
        tipoCartera: this.tipoCarteraSel,
        fechaDesde: this.aFechaIso(this.fechaDesdeEdit!),
        fechaHasta: this.fechaHastaEdit ? this.aFechaIso(this.fechaHastaEdit) : null,
        usuario: this.usuarioAuditoria,
        ip: null,
        bandas: this.construirBandasInput(),
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
    this.bandasService
      .cerrarVigencia({
        idConfiguracionVigente: config.idConfiguracion,
        fechaDesdeNueva: this.aFechaIso(this.fechaDesdeNueva!),
        usuario: this.usuarioAuditoria,
        ip: null,
        bandas: this.construirBandasInput(),
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

  private construirBandasInput(): BandaInput[] {
    return this.bandasEdit.map((b, i) => ({
      numero: i + 1,
      periodos: i === this.bandasEdit.length - 1 ? null : b.periodos,
      idPlanCuenta: b.idPlanCuenta as number,
    }));
  }

  /** Actualiza en memoria la configuración vigente del producto seleccionado tras grabar. */
  private aplicarConfigGuardada(config: ConfiguracionBandaDetalle): void {
    if (!this.productoSel) {
      return;
    }
    if (config.tipoCartera === TIPO_CARTERA.POR_VENCER) {
      this.productoSel.porVencer = config;
    } else {
      this.productoSel.vencido = config;
    }
    // Reemplazar la referencia del array para que la lista maestra refleje el cambio.
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
    this.bandasService
      .getHistorial(this.productoSel.idProducto, this.idEmpresa, this.tipoCarteraSel)
      .subscribe({
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

  // ===================== Probador de clasificación =====================

  clasificar(): void {
    this.resultadoClasificacion = null;
    this.errorProbador = null;
    if (this.probadorForm.invalid || this.idEmpresa == null || !this.productoSel) {
      this.probadorForm.markAllAsTouched();
      return;
    }
    const dias = this.probadorForm.value.dias!;
    const fecha = this.fechaEvaluacion ? this.aFechaIso(this.fechaEvaluacion) : undefined;

    this.clasificando = true;
    this.bandasService
      .clasificar(this.productoSel.idProducto, this.idEmpresa, this.tipoCarteraSel, dias, fecha)
      .subscribe({
        next: (res) => {
          this.clasificando = false;
          this.resultadoClasificacion = res;
        },
        error: (mensaje: string) => {
          this.clasificando = false;
          this.errorProbador = mensaje;
        },
      });
  }

  // ===================== Utilidades =====================

  /** Número de banda mostrado en una fila de edición (1..N, según el orden). */
  numeroBanda(index: number): number {
    return index + 1;
  }

  /** Formatea un LocalDate del backend ([y,m,d]) como "dd/MM/yyyy". */
  formatoFechaArray(arr: number[] | null | undefined): string {
    if (!arr || arr.length < 3) {
      return '—';
    }
    const [y, m, d] = arr;
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  }

  /** Convierte un LocalDate del backend ([y,m,d]) a Date local (para el datepicker). */
  private arrayAFecha(arr: number[]): Date {
    return new Date(arr[0], arr[1] - 1, arr[2]);
  }

  /**
   * Formatea un Date como "yyyy-MM-dd" usando la fecha LOCAL.
   * NO se usa toISOString(): eso emite un instante UTC terminado en "Z" y el backend
   * descarta el offset, corriendo la fecha (regla del proyecto).
   */
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

  /** trackBy para el listado de productos. */
  trackProducto(_: number, p: ProductoBandas): number {
    return p.idProducto;
  }
}
