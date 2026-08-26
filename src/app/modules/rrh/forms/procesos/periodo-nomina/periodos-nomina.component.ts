import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import {
  EstadoPeriodo,
  claseEstado,
  esHistorico,
  iconoEstado,
} from '../../../model/estados-nomina';
import { PeriodoNomina } from '../../../model/periodo-nomina';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import {
  aniosDisponibles,
  criteriosPorEmpresa,
  extraerCodigo,
  filtrarPorAnio,
  referenciaEmpresa,
} from '../../parametrizacion/utiles-parametrizacion';
import { opcionesAviso } from '../../comunes/avisos';
import { registrarEjercicios } from '../../comunes/ejercicios';
import { InlineAutocompleteComponent } from '../../comunes/inline-autocomplete/inline-autocomplete.component';
import { nombreMes } from '../../comunes/meses';

/**
 * Períodos de nómina — rediseño de 2026-08-26. Deja de colgar de `app-table-basic-hijos`.
 *
 * Piensa en el año, no en una lista: doce meses, cada uno un contenedor con sus períodos —cero,
 * uno o varios—. La unicidad real es `(empresa, año, mes, tipo)`, no `(empresa, año, mes)`: un
 * MENSUAL y un DÉCIMO TERCERO del mismo mes coexisten legítimos, y por eso el tipo va a la vista
 * en cada tarjeta, no escondido en un campo de un diálogo.
 */
@Component({
  selector: 'app-periodos-nomina',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    DateComponent,
    InlineAutocompleteComponent,
  ],
  templateUrl: './periodos-nomina.component.html',
  styleUrls: ['./periodos-nomina.component.scss'],
})
export class PeriodosNominaComponent implements OnInit {
  readonly meses = Array.from({ length: 12 }, (_, i) => i + 1);
  anios = aniosDisponibles();
  anio = signal<number>(new Date().getFullYear());
  periodos = signal<PeriodoNomina[]>([]);
  cargando = signal<boolean>(true);

  /** Sólo un mes tiene el formulario de alta abierto a la vez. */
  creandoEnMes = signal<number | null>(null);
  formulario: FormGroup | null = null;
  guardando = signal<boolean>(false);
  errorCreacion = signal<string | null>(null);

  tipos: DetalleRubro[] = [];
  modos: DetalleRubro[] = [];

  readonly campoFechaInicio: DateFieldConfig = {
    type: 'date',
    name: 'fechaInicio',
    label: 'Fecha de inicio (dd/mm/aaaa)',
    validations: [
      { name: 'required', validator: Validators.required, message: 'La fecha de inicio es requerida, en formato dd/mm/aaaa' },
    ],
  };

  readonly campoFechaFin: DateFieldConfig = {
    type: 'date',
    name: 'fechaFin',
    label: 'Fecha de fin (dd/mm/aaaa)',
    validations: [
      { name: 'required', validator: Validators.required, message: 'La fecha de fin es requerida, en formato dd/mm/aaaa' },
    ],
  };

  // Envueltas como propiedades: las plantillas de Angular no llaman funciones sueltas.
  readonly nombreMes = nombreMes;
  readonly claseEstado = claseEstado;
  readonly iconoEstado = iconoEstado;
  readonly esHistorico = esHistorico;
  readonly etiquetaEjercicio = (anio: any): string => String(anio ?? '');
  readonly buscarPorEjercicio = (anio: any): string[] => [String(anio ?? '')];
  readonly etiquetaTipo = (d: DetalleRubro | null): string => d?.descripcion ?? '';
  readonly buscarPorTipo = (d: DetalleRubro | null): string[] => [d?.descripcion ?? ''];

  constructor(
    private periodoService: PeriodoNominaService,
    private detalleRubroService: DetalleRubroService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.tipos = this.detalleRubroService.getDetallesByParent(RubrosRrh.TIPO_PERIODO_NOMINA);
    this.modos = this.detalleRubroService.getDetallesByParent(RubrosRrh.MODO_PERIODO_NOMINA);
    this.cargar();
  }

  onEjercicioSeleccionado(anio: number | null): void {
    // Un año inválido (sin elegir de la lista) no se acepta: siempre hace falta uno.
    if (anio === null) return;
    this.anio.set(anio);
    this.cancelarCreacion();
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.periodoService.selectByCriteria(criteriosPorEmpresa('mes')).subscribe({
      next: (data) => {
        registrarEjercicios(data ?? []);
        this.anios = aniosDisponibles();
        this.periodos.set(filtrarPorAnio(data, this.anio()));
        this.cargando.set(false);
      },
      error: () => {
        this.periodos.set([]);
        this.cargando.set(false);
        this.avisar('No se pudieron cargar los períodos de nómina', true);
      },
    });
  }

  periodosDelMes(mes: number): PeriodoNomina[] {
    return this.periodos()
      .filter((p) => p.mes === mes)
      .sort((a, b) => a.codigo - b.codigo);
  }

  tipoLabel(p: PeriodoNomina): string {
    return this.rubro(RubrosRrh.TIPO_PERIODO_NOMINA, p.tipoPeriodo);
  }

  estadoLabel(p: PeriodoNomina): string {
    return this.rubro(RubrosRrh.ESTADO_PERIODO_NOMINA, p.estado);
  }

  modoLabel(p: PeriodoNomina): string {
    return this.rubro(RubrosRrh.MODO_PERIODO_NOMINA, p.modo);
  }

  private rubro(rubroAlterno: number, valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '—';
    return this.detalleRubroService.getDescripcionByParentAndAlterno(rubroAlterno, valor) || '—';
  }

  abrirPanel(periodo: PeriodoNomina): void {
    if (!periodo?.codigo) return;
    this.router.navigate(['/menurecursoshumanos/procesos/periodos-nomina', periodo.codigo]);
  }

  // ─── Alta en línea, dentro del propio contenedor del mes ──────────────────

  abrirCreacion(mes: number): void {
    this.creandoEnMes.set(mes);
    this.errorCreacion.set(null);
    this.formulario = new FormGroup({
      fechaInicio: new FormControl<Date | null>(null, Validators.required),
      fechaFin: new FormControl<Date | null>(null, Validators.required),
      tipoPeriodo: new FormControl<DetalleRubro | null>(null, Validators.required),
      modo: new FormControl<DetalleRubro | null>(null, Validators.required),
      observaciones: new FormControl<string>(''),
    });
  }

  cancelarCreacion(): void {
    this.creandoEnMes.set(null);
    this.formulario = null;
    this.errorCreacion.set(null);
  }

  confirmarCreacion(): void {
    const mes = this.creandoEnMes();
    if (mes === null || !this.formulario || this.guardando()) return;

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.value;
    const cuerpo = {
      mes,
      anio: this.anio(),
      fechaInicio: valores.fechaInicio,
      fechaFin: valores.fechaFin,
      tipoPeriodo: extraerCodigo(valores.tipoPeriodo),
      modo: extraerCodigo(valores.modo),
      observaciones: valores.observaciones || null,
      empresa: referenciaEmpresa(),
      // Un período nace abierto; de ahí en adelante lo mueven los procesos, no el usuario.
      estado: EstadoPeriodo.ABIERTO,
      usuarioRegistro: usuarioSesion(),
    };

    this.guardando.set(true);
    this.errorCreacion.set(null);
    this.periodoService.add(cuerpo).subscribe({
      next: (creado) => {
        this.guardando.set(false);
        if (creado) {
          this.periodos.set([...this.periodos(), creado]);
          this.avisar(`Período creado: PRDN ${creado.codigo}.`);
        } else {
          this.cargar();
        }
        this.cancelarCreacion();
      },
      error: (err) => {
        this.guardando.set(false);
        // El formulario NO se pierde: se queda tecleado, con el motivo del rechazo a la vista.
        this.errorCreacion.set(this.mensajeDeError(err));
      },
    });
  }

  private mensajeDeError(error: any, generico = 'El período no se pudo crear.'): string {
    if (typeof error === 'string' && error.trim()) return error;
    return error?.mensaje || error?.message || generico;
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', { ...opcionesAviso(esError, mensaje) });
  }
}
