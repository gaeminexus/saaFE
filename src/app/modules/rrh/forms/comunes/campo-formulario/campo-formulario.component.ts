import { CommonModule } from '@angular/common';
import { Component, DestroyRef, DoCheck, Input, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { OPCIONES_ESTADO, OPCIONES_SI_NO } from '../../parametrizacion/utiles-parametrizacion';
import { CampoFormulario } from '../modelo-formulario';
import { normalizar } from '../normalizar';

/**
 * Pinta un `CampoFormulario` contra un control de un `FormGroup` ya construido.
 *
 * Los combos de rubro leen del catálogo por código alterno, nunca por PK. Los de tabla
 * (`referencia`) son autocompletables y **filtran por todas las propiedades de `buscarPor`**,
 * que la regla del proyecto exige que sean al menos dos.
 */
@Component({
  selector: 'app-campo-formulario',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './campo-formulario.component.html',
  styleUrls: ['./campo-formulario.component.scss'],
})
export class CampoFormularioComponent implements OnInit, DoCheck {
  /**
   * El campo entra por un `signal`, no por una propiedad suelta.
   *
   * `sugerencias` es un `computed`, y un `computed` solo se recalcula cuando cambia una señal de
   * las que lee. Con `campo` como propiedad normal, acotar la colección desde el padre —cambiar
   * `coleccion` al elegir colaborador— no invalidaba nada: el combo seguía sirviendo la lista
   * completa que había cacheado, y solo se refrescaba de rebote al teclear. Ése era el fallo del
   * combo de Contrato, que ofrecía los contratos de todo el mundo.
   */
  private readonly campoSignal = signal<CampoFormulario | null>(null);

  @Input({ required: true })
  set campo(valor: CampoFormulario) {
    this.campoSignal.set(valor);
  }
  get campo(): CampoFormulario {
    return this.campoSignal()!;
  }

  @Input({ required: true }) formulario!: FormGroup;
  /**
   * Dónde va la etiqueta. `izquierda` es la disposición de ficha de datos: etiqueta a un lado y
   * control al otro, que lee más rápido en un formulario largo que una columna de etiquetas
   * flotantes.
   */
  @Input() disposicion: 'encima' | 'izquierda' = 'encima';

  readonly opcionesSiNo = OPCIONES_SI_NO;
  readonly opcionesEstado = OPCIONES_ESTADO;

  detallesRubro: DetalleRubro[] = [];

  /**
   * Control propio del datepicker, que trabaja con `Date`.
   *
   * El control del formulario sigue guardando la cadena `yyyy-MM-dd` que espera el backend
   * —`LocalDate.parse` no lee otra cosa, y `POST /rest/lqdc/calcular` recibe `fechaSalida` como
   * cadena—, así que el cambio de control **no cambia lo que viaja**.
   */
  readonly controlFecha = new FormControl<Date | null>(null);

  private controlVigilado: AbstractControl | null = null;
  private sincronizando = false;
  private fechaIlegible = false;

  private readonly destroyRef = inject(DestroyRef);

  /** Texto tecleado en el autocompletar de una referencia. */
  private busqueda = signal<string>('');

  readonly sugerencias = computed(() => {
    const texto = normalizar(this.busqueda());
    const filas = this.campoSignal()?.coleccion ?? [];
    if (!texto) return filas.slice(0, 50);
    return filas.filter((fila) => this.coincide(fila, texto)).slice(0, 50);
  });

  constructor(
    private detalleRubroService: DetalleRubroService,
    private funcionesDatosS: FuncionesDatosService,
  ) {}

  ngOnInit(): void {
    if (this.campo.tipo === 'rubro' && this.campo.rubro !== undefined) {
      this.detallesRubro = this.detalleRubroService.getDetallesByParent(this.campo.rubro) ?? [];
    }
    if (this.campo.tipo === 'fecha') this.prepararFecha();
  }

  /**
   * El control del formulario puede ser reemplazado en vivo —el diálogo de novedades del IESS
   * quita y vuelve a poner los suyos al cambiar el tipo—, así que se vigila la referencia en vez
   * de suscribirse a la que hubiera al arrancar.
   */
  ngDoCheck(): void {
    if (this.campo?.tipo !== 'fecha') return;
    const control = this.control;
    if (control === this.controlVigilado) return;
    this.controlVigilado = control;
    this.sembrarFecha(control?.value);
  }

  get control() {
    return this.formulario.get(this.campo.name);
  }

  get invalido(): boolean {
    const control = this.campo.tipo === 'fecha' ? this.controlFecha : this.control;
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  // ─── Fecha ─────────────────────────────────────────────────────────────────

  private prepararFecha(): void {
    if (this.campo.requerido) this.controlFecha.addValidators(Validators.required);
    // Texto que no parsea: el control queda inválido y con su mensaje. Nunca se rellena solo.
    this.controlFecha.addValidators(() => (this.fechaIlegible ? { fechaIlegible: true } : null));

    this.controlFecha.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((fecha) => {
      if (this.sincronizando) return;
      const control = this.control;
      if (!control) return;
      this.sincronizando = true;
      control.setValue(aCadenaIso(fecha));
      control.markAsDirty();
      control.markAsTouched();
      this.sincronizando = false;
    });
  }

  /** Lleva al datepicker lo que traiga el formulario: `yyyy-MM-dd`, arreglo del backend o `Date`. */
  private sembrarFecha(valor: any): void {
    this.sincronizando = true;
    this.fechaIlegible = false;
    const fecha = desdeIsoLocal(valor) ?? (valor ? this.funcionesDatosS.convertirFechaDesdeBackend(valor) : null);
    this.controlFecha.setValue(fecha && !Number.isNaN(fecha.getTime()) ? fecha : null);
    this.controlFecha.markAsPristine();
    this.controlFecha.markAsUntouched();
    this.sincronizando = false;
  }

  alTeclearFecha(): void {
    this.fechaIlegible = false;
  }

  /**
   * Al salir del campo, un texto que no llegó a ser fecha se marca como tal.
   *
   * `EsDateAdapter.parse` devuelve `null` para lo que no puede leer, y un `null` es indistinguible
   * de un campo vacío: sin esto, teclear una fecha con la convención de la pantalla de al lado
   * dejaría el campo con texto a la vista y el dato en nada.
   */
  alSalirDeFecha(evento: FocusEvent): void {
    const texto = ((evento.target as HTMLInputElement)?.value ?? '').trim();
    this.fechaIlegible = texto !== '' && this.controlFecha.value === null;
    this.controlFecha.markAsTouched();
    this.controlFecha.updateValueAndValidity();
  }

  alTeclear(valor: string): void {
    this.busqueda.set(valor ?? '');
  }

  /** Un elemento seleccionado se muestra por su etiqueta; mientras se teclea, por el texto. */
  etiquetaDe = (fila: any): string => {
    if (fila === null || fila === undefined) return '';
    if (typeof fila !== 'object') return String(fila);
    return this.partesBuscables(fila).join(' · ');
  };

  /** `texto` llega ya normalizado por `sugerencias`. */
  private coincide(fila: any, texto: string): boolean {
    return this.partesBuscables(fila).some((parte) => normalizar(parte).includes(texto));
  }

  /** Valores de las propiedades de `buscarPor`, admitiendo rutas como `departamento.nombre`. */
  private partesBuscables(fila: any): string[] {
    const rutas = this.campo?.buscarPor ?? ['nombre'];
    const partes: string[] = [];
    for (const ruta of rutas) {
      const valor = ruta.split('.').reduce((acc: any, tramo) => acc?.[tramo], fila);
      if (valor !== null && valor !== undefined && String(valor).trim() !== '') {
        partes.push(this.aTexto(ruta, valor));
      }
    }
    return partes.length > 0 ? partes : [String(fila?.codigo ?? '')];
  }

  /**
   * Texto de una propiedad para la etiqueta y para la búsqueda.
   *
   * Una fecha del backend llega como arreglo `[2025, 6, 25]` y `String()` la pinta cruda:
   * `CT-0602237265 · 2025,6,25`. Pasa por `convertirFechaDesdeBackend`, que es lo que el
   * proyecto manda usar para las tres formas en que el backend manda fechas, y de paso la deja
   * buscable como `25/06/2025`.
   */
  private aTexto(ruta: string, valor: any): string {
    const esArregloDeFecha =
      Array.isArray(valor) && valor.length >= 3 && valor.every((n) => typeof n === 'number');
    const pareceFecha = valor instanceof Date || esArregloDeFecha || /fecha/i.test(ruta);
    if (!pareceFecha) return String(valor);

    const fecha = this.funcionesDatosS.convertirFechaDesdeBackend(valor);
    if (!fecha || Number.isNaN(fecha.getTime())) return String(valor);
    return this.funcionesDatosS.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA) || String(valor);
  }
}

/**
 * `yyyy-MM-dd` **en hora local**, que es lo que el control del formulario venía guardando.
 *
 * `toISOString()` no vale: pasa por UTC, y en Ecuador (UTC−5) la medianoche del 15 de enero se
 * convierte en el 14 a las 19:00. Un día menos en la fecha de salida es un día menos de
 * antigüedad, de décimos y de vacaciones.
 */
/**
 * Lee un `yyyy-MM-dd` **como fecha local**, que es la mitad de vuelta de `aCadenaIso`.
 *
 * Va antes que `convertirFechaDesdeBackend` a propósito: esa función, para una cadena sin hora,
 * termina en `new Date('2026-01-15')`, que JavaScript interpreta como medianoche **UTC** y en
 * Ecuador (UTC−5) devuelve el **14** de enero. Los controles de la ficha nacen precisamente con
 * esa cadena, así que sin este paso cada fecha guardada retrocedería un día por visita.
 */
function desdeIsoLocal(valor: any): Date | null {
  if (typeof valor !== 'string') return null;
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());
  if (!partes) return null;
  const fecha = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function aCadenaIso(fecha: Date | null): string | null {
  if (!fecha || Number.isNaN(fecha.getTime())) return null;
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}
