import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DateComponent } from '../../../../../shared/basics/table/dynamic-form/components/date/date.component';
import { DateFieldConfig } from '../../../../../shared/basics/table/dynamic-form/model/date.interface';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { ConceptoNomina } from '../../../model/concepto-nomina';
import {
  CuotaDescuento,
  DescuentoRecurrente,
  claseEstadoCuota,
  etiquetaEstadoCuota,
  iconoEstadoCuota,
} from '../../../model/descuento-recurrente';
import { Empleado } from '../../../model/empleado';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { ConceptoNominaService } from '../../../service/concepto-nomina.service';
import { CuotaDescuentoService } from '../../../service/cuota-descuento.service';
import { DescuentoRecurrenteService } from '../../../service/descuento-recurrente.service';
import { EmpleadoService } from '../../../service/empleado.service';
import { criteriosPorEmpresa, extraerCodigo } from '../../parametrizacion/utiles-parametrizacion';
import { FilaCuota, generarCuotas, recomputarSaldos } from '../../comunes/amortizacion';
import { opcionesAviso } from '../../comunes/avisos';
import { referencia } from '../../comunes/cuerpo-entidad';
import { InlineAutocompleteComponent } from '../../comunes/inline-autocomplete/inline-autocomplete.component';

/**
 * Descuentos recurrentes (RHH.DSRC) y su tabla de amortización (RHH.CTDS) — rediseño de
 * 2026-08-26. Deja de colgar de `app-table-basic-hijos`, cuatro veces.
 *
 * **La idea central no es quitar los diálogos: es que la tabla de amortización se genera, no se
 * teclea.** El bug real que lo motivó: un anticipo se registró, no apareció en el cálculo, y la
 * causa era que no existía ninguna cuota — el motor busca la cuota que vence dentro del período,
 * no «el descuento de esta persona». Doce cuotas tecleadas a mano son doce formularios y doce
 * ocasiones de que falte una o que las fechas no calcen.
 */
@Component({
  selector: 'app-descuentos-recurrentes',
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
  templateUrl: './descuentos-recurrentes.component.html',
  styleUrls: ['./descuentos-recurrentes.component.scss'],
})
export class DescuentosRecurrentesComponent implements OnInit {
  empleados: Empleado[] = [];
  empleadoSeleccionado = signal<Empleado | null>(null);

  descuentos = signal<DescuentoRecurrente[]>([]);
  cargandoDescuentos = signal<boolean>(false);
  descuentoSeleccionado = signal<DescuentoRecurrente | null>(null);

  cuotas = signal<CuotaDescuento[]>([]);
  cargandoCuotas = signal<boolean>(false);

  tipos: DetalleRubro[] = [];
  estadosDescuento: DetalleRubro[] = [];
  conceptos: ConceptoNomina[] = [];

  // ─── Alta del descuento y generación de cuotas ─────────────────────────
  creando = signal<boolean>(false);
  formulario: FormGroup | null = null;
  cuotasPropuestas = signal<FilaCuota[] | null>(null);
  guardando = signal<boolean>(false);
  errorCreacion = signal<string | null>(null);

  readonly campoFechaInicio: DateFieldConfig = {
    type: 'date',
    name: 'fechaInicio',
    label: 'Fecha de la primera cuota (dd/mm/aaaa)',
    validations: [
      { name: 'required', validator: Validators.required, message: 'La fecha es requerida, en formato dd/mm/aaaa' },
    ],
  };

  // ─── Edición en sitio de una cuota existente ───────────────────────────
  editandoCuota = signal<number | null>(null);
  edicionCuota: FormGroup | null = null;
  guardandoEdicion = signal<boolean>(false);
  errorEdicion = signal<string | null>(null);

  readonly campoFechaCuota: DateFieldConfig = {
    type: 'date',
    name: 'fecha',
    label: 'Fecha de vencimiento (dd/mm/aaaa)',
    validations: [
      { name: 'required', validator: Validators.required, message: 'La fecha es requerida' },
    ],
  };

  /** Cuántas cuotas de las propuestas ya tienen capital + interés puestos; suma para el total. */
  totalPropuesto = computed(() =>
    (this.cuotasPropuestas() ?? []).reduce((acc, f) => acc + f.total, 0),
  );

  readonly etiquetaEmpleado = (e: Empleado | null): string =>
    e ? `${e.identificacion ?? ''} — ${e.apellidos ?? ''} ${e.nombres ?? ''}`.trim() : '';
  readonly buscarPorEmpleado = (e: Empleado | null): string[] => [
    e?.identificacion != null ? String(e.identificacion) : '',
    e?.apellidos ?? '',
    e?.nombres ?? '',
  ];
  readonly etiquetaTipo = (d: DetalleRubro | null): string => d?.descripcion ?? '';
  readonly buscarPorTipo = (d: DetalleRubro | null): string[] => [d?.descripcion ?? ''];
  readonly etiquetaConcepto = (c: ConceptoNomina | null): string => c?.nombre ?? '';
  readonly buscarPorConcepto = (c: ConceptoNomina | null): string[] => [
    c?.nombre ?? '',
    c?.codigoAlterno != null ? String(c.codigoAlterno) : '',
  ];
  readonly claseEstadoCuota = claseEstadoCuota;
  readonly iconoEstadoCuota = iconoEstadoCuota;
  readonly etiquetaEstadoCuota = etiquetaEstadoCuota;

  constructor(
    private empleadoService: EmpleadoService,
    private conceptoService: ConceptoNominaService,
    private descuentoService: DescuentoRecurrenteService,
    private cuotaService: CuotaDescuentoService,
    private detalleRubroService: DetalleRubroService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.tipos = this.detalleRubroService.getDetallesByParent(RubrosRrh.TIPO_DESCUENTO_RECURRENTE);
    this.estadosDescuento = this.detalleRubroService.getDetallesByParent(RubrosRrh.ESTADO_DESCUENTO_RECURRENTE);

    const sinFallo = (fuente: any) =>
      fuente.pipe(
        map((filas: any) => filas ?? []),
        catchError(() => of<any[]>([])),
      );

    forkJoin({
      empleados: sinFallo(this.empleadoService.selectByCriteria(criteriosPorEmpresa('apellidos'))),
      conceptos: sinFallo(this.conceptoService.selectByCriteria(criteriosPorEmpresa('nombre'))),
    }).subscribe((datos: any) => {
      this.empleados = datos.empleados;
      this.conceptos = datos.conceptos;
    });
  }

  onEmpleadoSeleccionado(empleado: Empleado | null): void {
    this.empleadoSeleccionado.set(empleado);
    this.descuentoSeleccionado.set(null);
    this.cuotas.set([]);
    this.cancelarCreacion();

    if (!empleado) {
      this.descuentos.set([]);
      return;
    }

    this.cargandoDescuentos.set(true);
    this.descuentoService.selectByCriteria(this.criteriosDelEmpleado(empleado.codigo)).subscribe({
      next: (data) => {
        this.descuentos.set(data ?? []);
        this.cargandoDescuentos.set(false);
      },
      error: () => {
        this.descuentos.set([]);
        this.cargandoDescuentos.set(false);
        this.avisar('No se pudieron cargar los descuentos del colaborador', true);
      },
    });
  }

  private criteriosDelEmpleado(codigo: number): DatosBusqueda[] {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'empleado', 'codigo', codigo.toString(), TipoComandosBusqueda.IGUAL);
    return [db];
  }

  private criteriosDelDescuento(codigo: number): DatosBusqueda[] {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'descuentoRecurrente', 'codigo', codigo.toString(), TipoComandosBusqueda.IGUAL);
    return [db];
  }

  seleccionarDescuento(descuento: DescuentoRecurrente): void {
    this.descuentoSeleccionado.set(descuento);
    this.cancelarEdicionCuota();
    this.cargandoCuotas.set(true);
    this.cuotaService.selectByCriteria(this.criteriosDelDescuento(descuento.codigo)).subscribe({
      next: (data) => {
        this.cuotas.set((data ?? []).sort((a, b) => a.numeroCuota - b.numeroCuota));
        this.cargandoCuotas.set(false);
      },
      error: () => {
        this.cuotas.set([]);
        this.cargandoCuotas.set(false);
        this.avisar('No se pudieron cargar las cuotas del descuento', true);
      },
    });
  }

  tipoLabel(d: DescuentoRecurrente): string {
    return this.rubro(RubrosRrh.TIPO_DESCUENTO_RECURRENTE, d.tipoDescuento);
  }

  estadoLabel(d: DescuentoRecurrente): string {
    return this.rubro(RubrosRrh.ESTADO_DESCUENTO_RECURRENTE, d.estado);
  }

  conceptoLabel(d: DescuentoRecurrente): string {
    return (d.conceptoNomina as any)?.nombre ?? '—';
  }

  private rubro(rubroAlterno: number, valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '—';
    return this.detalleRubroService.getDescripcionByParentAndAlterno(rubroAlterno, valor) || '—';
  }

  // ─── Alta: cabecera + cuotas generadas ─────────────────────────────────

  abrirCreacion(): void {
    this.creando.set(true);
    this.errorCreacion.set(null);
    this.cuotasPropuestas.set(null);
    this.formulario = new FormGroup({
      tipoDescuento: new FormControl<DetalleRubro | null>(null, Validators.required),
      conceptoNomina: new FormControl<ConceptoNomina | null>(null, Validators.required),
      numero: new FormControl<string>(''),
      valor: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
      numeroCuotas: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
      fechaInicio: new FormControl<Date | null>(null, Validators.required),
      beneficiario: new FormControl<string>(''),
      observacion: new FormControl<string>(''),
    });
  }

  cancelarCreacion(): void {
    this.creando.set(false);
    this.formulario = null;
    this.cuotasPropuestas.set(null);
    this.errorCreacion.set(null);
  }

  /** Propone las N cuotas desde la cabecera. El usuario las revisa y ajusta antes de confirmar. */
  generarPropuesta(): void {
    const camposCabecera = ['tipoDescuento', 'conceptoNomina', 'valor', 'numeroCuotas', 'fechaInicio'];
    const faltaAlgo = camposCabecera.some((c) => this.formulario!.get(c)?.invalid);
    if (faltaAlgo) {
      camposCabecera.forEach((c) => this.formulario!.get(c)?.markAsTouched());
      return;
    }

    const v = this.formulario!.value;
    this.cuotasPropuestas.set(generarCuotas(Number(v.valor), Number(v.numeroCuotas), v.fechaInicio));
  }

  onCapitalCuota(indice: number, capital: number): void {
    this.editarFilaPropuesta(indice, { capital: Number(capital) || 0 });
  }

  onInteresCuota(indice: number, interes: number): void {
    this.editarFilaPropuesta(indice, { interes: Number(interes) || 0 });
  }

  onFechaCuota(indice: number, fecha: Date | null): void {
    if (!fecha) return;
    this.editarFilaPropuesta(indice, { fechaVencimiento: fecha });
  }

  private editarFilaPropuesta(indice: number, cambios: Partial<FilaCuota>): void {
    const filas = this.cuotasPropuestas();
    if (!filas) return;
    const nuevas = filas.map((f, i) => (i === indice ? { ...f, ...cambios } : f));
    const valorTotal = Number(this.formulario!.value.valor) || 0;
    this.cuotasPropuestas.set(recomputarSaldos(nuevas, valorTotal));
  }

  confirmarCreacion(): void {
    if (this.guardando()) return;
    const filas = this.cuotasPropuestas();
    if (!this.formulario || !filas || filas.length === 0) return;

    const v = this.formulario.value;
    const empleado = this.empleadoSeleccionado()!;
    const cuerpoDescuento = {
      empleado: { codigo: empleado.codigo },
      conceptoNomina: referencia(v.conceptoNomina),
      tipoDescuento: extraerCodigo(v.tipoDescuento),
      numero: v.numero || null,
      valor: Number(v.valor),
      saldo: Number(v.valor),
      numeroCuotas: filas.length,
      cuotasPagadas: 0,
      valorCuota: filas[0]?.total ?? null,
      porcentaje: null,
      fechaInicio: v.fechaInicio,
      fechaFin: filas[filas.length - 1]?.fechaVencimiento ?? null,
      beneficiario: v.beneficiario || null,
      observacion: v.observacion || null,
      aperturaMigracion: 'N',
      estado: this.estadosDescuento[0] ? extraerCodigo(this.estadosDescuento[0]) : 1,
      usuarioRegistro: usuarioSesion(),
    };

    this.guardando.set(true);
    this.errorCreacion.set(null);
    this.descuentoService.add(cuerpoDescuento).subscribe({
      next: (creado) => {
        if (!creado) {
          this.guardando.set(false);
          this.errorCreacion.set('El descuento no se pudo crear.');
          return;
        }
        this.crearCuotasDelDescuento(creado, filas);
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorCreacion.set(this.mensajeDeError(err));
      },
    });
  }

  private crearCuotasDelDescuento(descuento: DescuentoRecurrente, filas: FilaCuota[]): void {
    const peticiones = filas.map((fila) =>
      this.cuotaService.add({
        descuentoRecurrente: { codigo: descuento.codigo },
        numeroCuota: fila.numeroCuota,
        fechaVencimiento: fila.fechaVencimiento,
        total: fila.total,
        capital: fila.capital,
        interes: fila.interes,
        valorDescontado: 0,
        saldo: fila.saldo,
        periodoNomina: null,
        estado: 1, // Pendiente
        usuarioRegistro: usuarioSesion(),
      }),
    );

    forkJoin(peticiones).subscribe({
      next: () => {
        this.guardando.set(false);
        this.descuentos.set([...this.descuentos(), descuento]);
        this.avisar(`Descuento creado con ${filas.length} cuota(s).`);
        this.cancelarCreacion();
        this.seleccionarDescuento(descuento);
      },
      error: (err) => {
        this.guardando.set(false);
        // El descuento ya se creó; lo que falló fueron las cuotas. Se dice tal cual, sin
        // esconder que quedó a medio camino — es exactamente el estado que causó el bug real.
        this.errorCreacion.set(
          `El descuento se creó (${this.mensajeDeError(err, 'las cuotas no se pudieron generar')}). ` +
            `Revise sus cuotas antes de darlo por bueno.`,
        );
      },
    });
  }

  // ─── Edición en sitio de una cuota existente ───────────────────────────

  editarCuota(cuota: CuotaDescuento): void {
    if (this.editandoCuota() === cuota.codigo) return;
    this.editandoCuota.set(cuota.codigo);
    this.errorEdicion.set(null);
    this.edicionCuota = new FormGroup({
      fecha: new FormControl<Date | null>(new Date(cuota.fechaVencimiento), Validators.required),
      capital: new FormControl<number | null>(cuota.capital),
      interes: new FormControl<number | null>(cuota.interes),
      total: new FormControl<number | null>(cuota.total),
      saldo: new FormControl<number | null>(cuota.saldo),
    });
  }

  cancelarEdicionCuota(): void {
    this.editandoCuota.set(null);
    this.edicionCuota = null;
    this.errorEdicion.set(null);
  }

  confirmarEdicionCuota(): void {
    const codigo = this.editandoCuota();
    if (codigo === null || !this.edicionCuota || this.guardandoEdicion()) return;
    if (this.edicionCuota.invalid) {
      this.edicionCuota.markAllAsTouched();
      return;
    }

    const original = this.cuotas().find((c) => c.codigo === codigo);
    if (!original) return;

    const v = this.edicionCuota.value;
    const cuerpo = {
      ...original,
      descuentoRecurrente: referencia(original.descuentoRecurrente),
      fechaVencimiento: v.fecha,
      capital: Number(v.capital) || 0,
      interes: Number(v.interes) || 0,
      total: Number(v.total) || 0,
      saldo: v.saldo === null || v.saldo === undefined ? null : Number(v.saldo),
    };

    this.guardandoEdicion.set(true);
    this.errorEdicion.set(null);
    this.cuotaService.update(cuerpo).subscribe({
      next: (actualizada) => {
        this.guardandoEdicion.set(false);
        if (actualizada) {
          this.cuotas.set(this.cuotas().map((c) => (c.codigo === codigo ? actualizada : c)));
        }
        this.cancelarEdicionCuota();
      },
      error: (err) => {
        this.guardandoEdicion.set(false);
        this.errorEdicion.set(this.mensajeDeError(err));
      },
    });
  }

  eliminarCuota(cuota: CuotaDescuento): void {
    this.cuotaService.delete(cuota.codigo).subscribe({
      next: () => this.cuotas.set(this.cuotas().filter((c) => c.codigo !== cuota.codigo)),
      error: (err) => this.avisar(this.mensajeDeError(err, 'No se pudo eliminar la cuota.'), true),
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
