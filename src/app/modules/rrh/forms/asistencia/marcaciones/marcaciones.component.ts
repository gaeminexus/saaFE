import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { DateComponent } from '../../../../../shared/basics/table/dynamic-form/components/date/date.component';
import { DateFieldConfig } from '../../../../../shared/basics/table/dynamic-form/model/date.interface';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { Empleado } from '../../../model/empleado';
import { Marcaciones } from '../../../model/marcaciones';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { EmpleadoService } from '../../../service/empleado.service';
import { MarcacionesService } from '../../../service/marcaciones.service';
import { criteriosPorEmpresa } from '../../parametrizacion/utiles-parametrizacion';
import { InlineAutocompleteComponent } from '../../comunes/inline-autocomplete/inline-autocomplete.component';
import { opcionesAviso } from '../../comunes/avisos';
import { CAMPOS_ASISTENCIA_PERSISTEN, descripcionRubro, rangoPorDefecto } from '../utiles-asistencia';
import { camposMarcacion, criteriosMarcaciones, rubroPorAlterno } from './marcaciones.util';

/**
 * Registro manual y corrección de marcaciones (RHH.MRCC) — rediseño de 2026-09-01, molde de
 * edición en línea de `descuentos-recurrentes`. Deja de colgar de `app-table-basic-hijos`.
 *
 * Las ya consolidadas en un resumen diario salen señaladas: corregirlas obliga a volver a
 * consolidar el día, pero no está bloqueado — el aviso es la guarda, no un candado.
 */
@Component({
  selector: 'app-marcaciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    DateComponent,
    InlineAutocompleteComponent,
  ],
  templateUrl: './marcaciones.component.html',
  styleUrls: ['./marcaciones.component.scss'],
})
export class MarcacionesComponent implements OnInit {
  readonly RubrosRrh = RubrosRrh;
  readonly CAMPOS_ASISTENCIA_PERSISTEN = CAMPOS_ASISTENCIA_PERSISTEN;

  empleados: Empleado[] = [];
  empleadoSeleccionado = signal<Empleado | null>(null);
  desde = signal<string>('');
  hasta = signal<string>('');

  marcaciones = signal<Marcaciones[]>([]);
  cargando = signal<boolean>(false);
  consultado = signal<boolean>(false);

  tipos: DetalleRubro[] = [];
  origenes: DetalleRubro[] = [];

  // ─── Alta ────────────────────────────────────────────────────────────────
  creando = signal<boolean>(false);
  formulario: FormGroup | null = null;
  guardando = signal<boolean>(false);
  errorCreacion = signal<string | null>(null);

  // ─── Edición en sitio ───────────────────────────────────────────────────
  editando = signal<number | null>(null);
  edicion: FormGroup | null = null;
  guardandoEdicion = signal<boolean>(false);
  errorEdicion = signal<string | null>(null);

  readonly campoFechaHora: DateFieldConfig = {
    type: 'date',
    name: 'fechaHora',
    label: 'Fecha y hora',
    mostrarHora: true,
    validations: [
      { name: 'required', validator: Validators.required, message: 'La fecha y hora son requeridas' },
    ],
  };

  puedeConsultar = computed(
    () => this.empleadoSeleccionado() !== null && !!this.desde() && !!this.hasta(),
  );

  /** Ver `CAMPOS_ASISTENCIA_PERSISTEN`: sin `MRCCPRCS` viajando, el conteo sería siempre cero. */
  consolidadas = computed(() =>
    CAMPOS_ASISTENCIA_PERSISTEN ? this.marcaciones().filter((m) => m.procesado === 'S').length : 0,
  );

  readonly etiquetaEmpleado = (e: Empleado | null): string =>
    e ? `${e.identificacion ?? ''} — ${e.apellidos ?? ''} ${e.nombres ?? ''}`.trim() : '';
  readonly buscarPorEmpleado = (e: Empleado | null): string[] => [
    e?.identificacion != null ? String(e.identificacion) : '',
    e?.apellidos ?? '',
    e?.nombres ?? '',
  ];
  readonly etiquetaRubro = (d: DetalleRubro | null): string => d?.descripcion ?? '';
  readonly buscarPorRubro = (d: DetalleRubro | null): string[] => [d?.descripcion ?? ''];

  constructor(
    private fb: FormBuilder,
    private empleadoService: EmpleadoService,
    private marcacionesService: MarcacionesService,
    private detalleRubroService: DetalleRubroService,
    private funcionesDatosS: FuncionesDatosService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const rango = rangoPorDefecto();
    this.desde.set(rango.desde);
    this.hasta.set(rango.hasta);

    this.tipos = this.detalleRubroService.getDetallesByParent(RubrosRrh.TIPO_MARCACION);
    this.origenes = this.detalleRubroService.getDetallesByParent(RubrosRrh.ORIGEN_MARCACION);

    this.empleadoService.selectByCriteria(criteriosPorEmpresa('apellidos')).subscribe({
      next: (data) => (this.empleados = data ?? []),
      error: () => {
        this.empleados = [];
        this.avisar('No se pudo cargar la lista de colaboradores', true);
      },
    });
  }

  onEmpleadoSeleccionado(empleado: Empleado | null): void {
    this.empleadoSeleccionado.set(empleado);
    this.marcaciones.set([]);
    this.consultado.set(false);
    this.cancelarCreacion();
    this.cancelarEdicion();
  }

  consultar(): void {
    if (!this.puedeConsultar()) return;
    this.cancelarCreacion();
    this.cancelarEdicion();

    this.cargando.set(true);
    const criterios = criteriosMarcaciones(this.empleadoSeleccionado()!.codigo, this.desde(), this.hasta());
    this.marcacionesService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        this.cargando.set(false);
        this.consultado.set(true);
        this.marcaciones.set(this.ordenadas(data ?? []));
      },
      error: (err) => {
        this.cargando.set(false);
        this.consultado.set(true);
        this.marcaciones.set([]);
        this.avisar(mensajeDeError(err, 'No se pudieron cargar las marcaciones'), true);
      },
    });
  }

  private ordenadas(registros: Marcaciones[]): Marcaciones[] {
    return [...registros].sort(
      (a, b) =>
        (this.funcionesDatosS.convertirFechaDesdeBackend(a.fechaHora)?.getTime() ?? 0) -
        (this.funcionesDatosS.convertirFechaDesdeBackend(b.fechaHora)?.getTime() ?? 0),
    );
  }

  // ─── Alta ────────────────────────────────────────────────────────────────

  abrirCreacion(): void {
    this.cancelarEdicion();
    this.creando.set(true);
    this.errorCreacion.set(null);
    this.formulario = this.construirFormulario(null);
  }

  cancelarCreacion(): void {
    this.creando.set(false);
    this.formulario = null;
    this.errorCreacion.set(null);
  }

  confirmarCreacion(): void {
    if (!this.formulario || this.guardando()) return;
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const cuerpo = {
      empleado: { codigo: this.empleadoSeleccionado()!.codigo },
      ...camposMarcacion(this.formulario.value),
      usuarioRegistro: usuarioSesion(),
    };

    this.guardando.set(true);
    this.errorCreacion.set(null);
    this.marcacionesService.add(cuerpo).subscribe({
      next: (creada) => {
        this.guardando.set(false);
        if (creada) this.marcaciones.set(this.ordenadas([...this.marcaciones(), creada]));
        this.cancelarCreacion();
        this.avisar('Marcación registrada.');
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorCreacion.set(mensajeDeError(err, 'No se pudo registrar la marcación.'));
      },
    });
  }

  // ─── Edición en sitio ───────────────────────────────────────────────────

  editar(marcacion: Marcaciones): void {
    if (this.editando() === marcacion.codigo) return;
    this.cancelarCreacion();
    this.editando.set(marcacion.codigo);
    this.errorEdicion.set(null);
    this.edicion = this.construirFormulario(marcacion);
  }

  private construirFormulario(m: Marcaciones | null): FormGroup {
    return this.fb.group({
      fechaHora: [(m && this.funcionesDatosS.convertirFechaDesdeBackend(m.fechaHora)) ?? new Date(), Validators.required],
      tipo: [m ? rubroPorAlterno(this.tipos, m.tipo) : null, Validators.required],
      origen: [m ? rubroPorAlterno(this.origenes, m.origen) : null, Validators.required],
      observacion: [m?.observacion ?? '', Validators.required],
    });
  }

  cancelarEdicion(): void {
    this.editando.set(null);
    this.edicion = null;
    this.errorEdicion.set(null);
  }

  confirmarEdicion(): void {
    const codigo = this.editando();
    if (codigo === null || !this.edicion || this.guardandoEdicion()) return;
    if (this.edicion.invalid) {
      this.edicion.markAllAsTouched();
      return;
    }

    const original = this.marcaciones().find((m) => m.codigo === codigo);
    if (!original) return;

    const cuerpo = { ...original, ...camposMarcacion(this.edicion.value) };

    this.guardandoEdicion.set(true);
    this.errorEdicion.set(null);
    this.marcacionesService.update(cuerpo).subscribe({
      next: (actualizada) => {
        this.guardandoEdicion.set(false);
        if (actualizada) {
          this.marcaciones.set(this.ordenadas(this.marcaciones().map((m) => (m.codigo === codigo ? actualizada : m))));
        }
        this.cancelarEdicion();
      },
      error: (err) => {
        this.guardandoEdicion.set(false);
        this.errorEdicion.set(mensajeDeError(err, 'No se pudo guardar la corrección.'));
      },
    });
  }

  eliminar(marcacion: Marcaciones): void {
    this.marcacionesService.delete(marcacion.codigo).subscribe({
      next: () => this.marcaciones.set(this.marcaciones().filter((m) => m.codigo !== marcacion.codigo)),
      error: (err) => this.avisar(mensajeDeError(err, 'No se pudo eliminar la marcación.'), true),
    });
  }

  rubroLabel(rubroAlterno: number, valor: number): string {
    return descripcionRubro(this.detalleRubroService, rubroAlterno, valor);
  }

  fechaHoraDisplay(fecha: unknown): string {
    return this.funcionesDatosS.formatoFecha(fecha, FuncionesDatosService.FECHA_HORA) || '—';
  }

  irAResumen(): void {
    this.router.navigate(['/menurecursoshumanos/asistencia/resumen-diario']);
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', opcionesAviso(esError, mensaje));
  }
}
