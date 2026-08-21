import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AccionesGrid } from '../../../../../shared/basics/constantes';
import { ServiceLocatorRrhService } from '../../../../../shared/basics/service-locator/service-locator-rrh.service';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { armarCuerpo, referenciaSinResolver } from '../../comunes/cuerpo-entidad';
import { CampoFormularioComponent } from '../../comunes/campo-formulario/campo-formulario.component';
import { EstadoLista, EstadoListaService } from '../../comunes/estado-lista.service';
import { mensajeDeError } from '../../comunes/mensajes';
import { LineaResumen } from '../../comunes/modelo-formulario';
import { PanelLateralComponent } from '../../comunes/panel-lateral/panel-lateral.component';
import { TablaRrhComponent } from '../../comunes/tabla-rrh/tabla-rrh.component';
import { aValorDeInput, formatearFilas } from './formato-ficha';
import { SeccionFicha } from './secciones-ficha.config';

type ModoPanel = 'nuevo' | 'editar' | 'borrar';

/**
 * Una sección de la ficha: la lista a la izquierda del ojo y la edición en un panel lateral.
 *
 * La tabla ya no edita y el formulario ya no vive en un modal. Es la separación que arregla el
 * problema de fondo: un formulario de veinte campos puede crecer cuanto necesite sin que sus
 * acciones se salgan de la pantalla.
 */
@Component({
  selector: 'app-seccion-ficha',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    CampoFormularioComponent,
    PanelLateralComponent,
    TablaRrhComponent,
  ],
  templateUrl: './seccion-ficha.component.html',
  styleUrls: ['./seccion-ficha.component.scss'],
})
export class SeccionFichaComponent implements OnChanges {
  @Input({ required: true }) seccion!: SeccionFicha;
  @Input({ required: true }) empleadoCodigo!: number;

  readonly filas = signal<any[]>([]);
  readonly resumen = signal<LineaResumen[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);
  readonly panelAbierto = signal<boolean>(false);
  readonly modo = signal<ModoPanel>('nuevo');

  formulario: FormGroup = new FormGroup({});
  private registroEnEdicion: any = null;

  /**
   * Los registros **tal como llegaron del backend**, indexados por código.
   *
   * La tabla muestra filas formateadas —con etiquetas de rubro, banderas legibles y el plazo
   * calculado—, y esas propiedades de adorno no existen en la entidad. Editar sobre la fila
   * formateada devolvía al backend campos que no sabe deserializar y la actualización moría con
   * un «Not able to deserialize data provided». El formulario y el cuerpo del PUT se arman
   * siempre desde el registro crudo.
   */
  private readonly crudos = new Map<number, any>();

  /** Filtro, orden y posición con los que se abre la lista: los que tenía al salir. */
  estadoLista: EstadoLista = { filtro: '', ordenPor: null, ascendente: true, scroll: 0, destacado: null };

  private get claveLista(): string {
    return `ficha:${this.empleadoCodigo}:${this.seccion?.clave}`;
  }

  recordarEstado(estado: Partial<EstadoLista>): void {
    this.estadoListaService.guardar(this.claveLista, estado);
  }

  constructor(
    private fb: FormBuilder,
    private locatorRrh: ServiceLocatorRrhService,
    private detalleRubroService: DetalleRubroService,
    private funcionesDatosS: FuncionesDatosService,
    private snackBar: MatSnackBar,
    private router: Router,
    private estadoListaService: EstadoListaService,
  ) {}

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['seccion'] || cambios['empleadoCodigo']) {
      this.cerrarPanel();
      this.estadoLista = this.estadoListaService.recuperar(this.claveLista);
      this.cargar();
    }
  }

  // ─── Carga ─────────────────────────────────────────────────────────────────

  cargar(): void {
    if (!this.empleadoCodigo || !this.seccion) return;

    this.cargando.set(true);
    // `recargarValores` no recibe contexto: se le deja el colaborador vigente antes de pedir
    this.locatorRrh.filtroEmpleado = this.empleadoCodigo;

    this.locatorRrh
      .recargarValores(this.seccion.entidad)
      .then((datos) => this.recibir(Array.isArray(datos) ? datos : []))
      .catch((error) => {
        this.recibir([]);
        this.avisar(
          mensajeDeError(error, `No se pudo cargar ${this.seccion.titulo.toLowerCase()}.`),
          true,
        );
      });
  }

  private recibir(datos: any[]): void {
    this.crudos.clear();
    for (const registro of datos) {
      if (registro?.codigo !== undefined) this.crudos.set(registro.codigo, registro);
    }

    const formateadas = formatearFilas(datos, this.seccion.clave, this.dependencias());
    this.filas.set(formateadas);
    this.resumen.set(this.seccion.resumen ? this.seccion.resumen(formateadas) : []);
    this.cargando.set(false);
  }

  private dependencias() {
    return {
      detalleRubroService: this.detalleRubroService,
      funcionesDatosS: this.funcionesDatosS,
    };
  }

  // ─── Panel ─────────────────────────────────────────────────────────────────

  nuevo(): void {
    if (this.abrirVistaPropia('nuevo')) return;
    this.registroEnEdicion = null;
    this.construirFormulario(null);
    this.modo.set('nuevo');
    this.panelAbierto.set(true);
  }

  editar(fila: any): void {
    if (this.abrirVistaPropia(fila?.codigo)) return;
    this.registroEnEdicion = this.crudo(fila);
    this.construirFormulario(this.registroEnEdicion);
    this.modo.set('editar');
    this.panelAbierto.set(true);
  }

  /**
   * Las secciones portadas a la forma nueva editan en su propia ruta, no en un panel encima de
   * la lista. Devuelve `true` si se ha navegado.
   */
  private abrirVistaPropia(destino: number | string): boolean {
    if (!this.seccion.rutaFormulario) return false;
    this.router.navigate([
      '/menurecursoshumanos/personal/ficha',
      this.empleadoCodigo,
      this.seccion.rutaFormulario,
      destino,
    ]);
    return true;
  }

  /** Borrar abre el mismo panel en solo lectura: se ve exactamente qué se va a eliminar. */
  pedirBorrado(fila: any): void {
    this.registroEnEdicion = this.crudo(fila);
    this.construirFormulario(this.registroEnEdicion);
    this.formulario.disable();
    this.modo.set('borrar');
    this.panelAbierto.set(true);
  }

  /** El registro sin formatear que corresponde a una fila de la tabla. */
  private crudo(fila: any): any {
    return this.crudos.get(fila?.codigo) ?? fila;
  }

  cerrarPanel(): void {
    this.panelAbierto.set(false);
    this.registroEnEdicion = null;
  }

  /** Un clic fuera del panel no puede tirar a la basura un formulario lleno sin decir nada. */
  avisarCambiosPendientes(): void {
    this.avisar('Hay cambios sin guardar. Use «Cancelar» si quiere descartarlos.', true);
  }

  get tituloPanel(): string {
    const singular = this.seccion?.titulo ?? '';
    if (this.modo() === 'nuevo') return `Nuevo registro · ${singular}`;
    if (this.modo() === 'borrar') return `Eliminar de ${singular}`;
    return `Editar · ${singular}`;
  }

  private construirFormulario(fila: any | null): void {
    const controles: Record<string, any> = {};

    for (const campo of this.seccion.campos) {
      let valor: any = fila ? fila[campo.name] : (campo.valor ?? null);

      if (campo.tipo === 'fecha') {
        valor = fila ? aValorDeInput(fila[campo.name], this.dependencias()) : null;
      }
      if (campo.tipo === 'referencia' && fila) {
        // El autocompletar trabaja con el objeto; la fila ya lo trae resuelto del backend
        valor = fila[campo.name] ?? null;
      }

      controles[campo.name] = [valor, campo.requerido ? Validators.required : []];
    }

    this.formulario = this.fb.group(controles);
  }

  // ─── Guardar y borrar ──────────────────────────────────────────────────────

  confirmar(): void {
    if (this.modo() === 'borrar') {
      this.ejecutar(AccionesGrid.REMOVE, this.registroEnEdicion?.codigo, 'Registro eliminado.');
      return;
    }

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.avisar('Revise los campos obligatorios.', true);
      return;
    }

    const aMedias = referenciaSinResolver(this.seccion.campos, this.formulario.getRawValue());
    if (aMedias) {
      this.avisar(`Elija «${aMedias}» de la lista: no basta con escribirlo.`, true);
      return;
    }

    const esAlta = this.modo() === 'nuevo';
    this.ejecutar(
      esAlta ? AccionesGrid.ADD : AccionesGrid.EDIT,
      this.prepararGuardado(),
      esAlta ? 'Registro creado.' : 'Cambios guardados.',
    );
  }

  private ejecutar(accion: number, carga: any, exito: string): void {
    this.guardando.set(true);

    this.locatorRrh
      .ejecutaServicio(this.seccion.entidad, carga, accion)
      .then(() => {
        this.guardando.set(false);
        this.cerrarPanel();
        this.avisar(exito);
        this.cargar();
      })
      .catch((error) => {
        this.guardando.set(false);
        this.avisar(mensajeDeError(error, 'La operación no se pudo completar.'), true);
      });
  }

  /**
   * Arma el cuerpo que espera el backend: escalares desenvueltos, referencias como `{ codigo }`
   * y el colaborador y el usuario de la sesión puestos aquí, nunca escritos a mano.
   *
   * `fechaRegistro` **no se envía**: los campos de auditoría los sella el servidor.
   */
  private prepararGuardado(): any {
    return armarCuerpo(
      this.registroEnEdicion,
      this.formulario.getRawValue(),
      this.seccion.camposEscalares,
      this.seccion.camposReferencia,
      { fijos: { empleado: { codigo: this.empleadoCodigo } }, usuarioRegistro: usuarioSesion() },
    );
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: esError ? 8000 : 4000,
      panelClass: [esError ? 'snackbar-error' : 'snackbar-success'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}
