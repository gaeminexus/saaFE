import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { Liquidacion } from '../../../model/Liquidacion';
import {
  AccionLiquidacion,
  accionesDisponibles,
  motivoNoDisponible,
} from '../../../model/estados-liquidacion';
import { ResultadoLiquidacion } from '../../../model/resultados-nomina';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { CausalTerminacionService } from '../../../service/causal-terminacion.service';
import { ContratoEmpleadoService } from '../../../service/contrato-empleado.service';
import { DetalleLiquidacionService } from '../../../service/detalle-liquidacion.service';
import { EmpleadoService } from '../../../service/empleado.service';
import { LiquidacionService } from '../../../service/liquidacion.service';
import { CampoFormularioComponent } from '../../comunes/campo-formulario/campo-formulario.component';
import { mensajeDeError } from '../../comunes/mensajes';
import { CampoFormulario } from '../../comunes/modelo-formulario';
import { criteriosPorEmpresa } from '../../parametrizacion/utiles-parametrizacion';
import { MENSAJE_EXITO, textoConfirmacionSalida } from './liquidacion.acciones';
import { camposLiquidacion, criteriosDetalleLiquidacion } from './liquidacion.campos';

/**
 * Finiquito de un colaborador, en vista propia.
 *
 * El orden manda: **simular** enseña el desglose sin comprometer nada, **calcular** lo persiste,
 * y de ahí salen aprobar, ejecutar la salida y contabilizar. Ejecutar la salida es el paso que
 * no se deshace —cierra el contrato y caduca los saldos de vacaciones—, así que se pide
 * confirmación escribiendo, no con un botón más.
 */
@Component({
  selector: 'app-liquidacion-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    CampoFormularioComponent,
  ],
  templateUrl: './liquidacion-form.component.html',
  styleUrls: ['./liquidacion-form.component.scss'],
})
export class LiquidacionFormComponent implements OnInit {
  readonly cargando = signal<boolean>(true);
  readonly ocupado = signal<boolean>(false);
  readonly liquidacion = signal<Liquidacion | null>(null);
  readonly simulacion = signal<ResultadoLiquidacion | null>(null);
  readonly detalle = signal<any[]>([]);
  readonly campos = signal<CampoFormulario[]>([]);

  formulario: FormGroup = new FormGroup({});

  private readonly destroyRef = inject(DestroyRef);
  private contratosPorEmpleado = new Map<number, any[]>();
  private todosLosContratos: any[] = [];

  readonly esNuevo = computed(() => this.liquidacion() === null);

  readonly acciones = computed(() => accionesDisponibles(this.liquidacion()));

  readonly titulo = computed(() => {
    const l = this.liquidacion();
    if (!l) return 'Nuevo finiquito';
    return `Finiquito ${l.codigo}`;
  });

  readonly etiquetaEstado = computed(() => {
    const l = this.liquidacion();
    if (!l) return 'Sin calcular';
    return (
      this.detalleRubroService.getDescripcionByParentAndAlterno(
        RubrosRrh.ESTADO_LIQUIDACION,
        Number(l.estado),
      ) || '—'
    );
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private liquidacionService: LiquidacionService,
    private detalleLiquidacionService: DetalleLiquidacionService,
    private empleadoService: EmpleadoService,
    private contratoService: ContratoEmpleadoService,
    private causalService: CausalTerminacionService,
    private detalleRubroService: DetalleRubroService,
    private funcionesDatosS: FuncionesDatosService,
    private snackBar: MatSnackBar,
  ) {}

  /**
   * El id se lee del flujo de la ruta, no de `snapshot`.
   *
   * `calcular()` navega de `/liquidacion/nuevo` a `/liquidacion/{id}` con **este mismo
   * componente**: Angular reutiliza la instancia y `ngOnInit` no vuelve a correr. Con el id leído
   * una sola vez del `snapshot`, la pantalla se quedaba en «Nuevo finiquito», con la cabecera en
   * «Sin calcular» y el pie diciendo «todavía no se ha guardado nada» — lo contrario de lo que
   * acababa de pasar—, e invitaba a pulsar otra vez.
   */
  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('codigo');
      this.cargar(id && id !== 'nuevo' ? Number(id) : null);
    });
  }

  private cargar(idLiquidacion: number | null): void {
    this.cargando.set(true);
    // Lo simulado pertenece a la pantalla anterior: no puede sobrevivir a un cambio de finiquito
    this.simulacion.set(null);
    this.detalle.set([]);

    const sinFallo = (fuente: Observable<any[] | null>): Observable<any[]> =>
      fuente.pipe(
        map((filas) => filas ?? []),
        catchError(() => of<any[]>([])),
      );

    forkJoin({
      empleados: sinFallo(this.empleadoService.selectByCriteria(criteriosPorEmpresa('apellidos'))),
      contratos: sinFallo(this.contratoService.selectByCriteria([])),
      causales: sinFallo(this.causalService.selectByCriteria(criteriosPorEmpresa('nombre'))),
      liquidacion: idLiquidacion
        ? this.liquidacionService.getById(idLiquidacion).pipe(catchError(() => of(null)))
        : of(null),
    }).subscribe({
      next: ({ empleados, contratos, causales, liquidacion }) => {
        this.todosLosContratos = contratos;
        this.indexarContratos(contratos);
        this.construirCampos(empleados, causales);
        this.liquidacion.set(liquidacion);
        if (liquidacion) this.cargarDetalle(liquidacion.codigo);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.avisar(mensajeDeError(err, 'No se pudo abrir el finiquito.'), true);
      },
    });
  }

  private indexarContratos(contratos: any[]): void {
    this.contratosPorEmpleado.clear();
    for (const contrato of contratos) {
      const codigo = contrato?.empleado?.codigo;
      if (!codigo) continue;
      if (!this.contratosPorEmpleado.has(codigo)) this.contratosPorEmpleado.set(codigo, []);
      this.contratosPorEmpleado.get(codigo)!.push(contrato);
    }
  }

  private construirCampos(empleados: any[], causales: any[]): void {
    const campos = camposLiquidacion(empleados, this.todosLosContratos, causales);

    this.campos.set(campos);

    const controles: Record<string, any> = {};
    for (const campo of campos) {
      controles[campo.name] = [null, campo.requerido ? Validators.required : []];
    }
    this.formulario = this.fb.group(controles);

    // Al cambiar de colaborador, el contrato deja de ser válido y la lista se acota
    this.formulario.get('empleado')?.valueChanges.subscribe((empleado: any) => {
      const codigo = empleado?.codigo;
      const propios = codigo ? (this.contratosPorEmpleado.get(codigo) ?? []) : this.todosLosContratos;
      this.campos.update((lista) =>
        lista.map((c) => (c.name === 'contrato' ? { ...c, coleccion: propios } : c)),
      );
      this.formulario.get('contrato')?.setValue(null, { emitEvent: false });
      this.simulacion.set(null);
    });
  }

  private cargarDetalle(idLiquidacion: number): void {
    this.detalleLiquidacionService.selectByCriteria(criteriosDetalleLiquidacion(idLiquidacion)).subscribe({
      next: (filas: any) => this.detalle.set(Array.isArray(filas) ? filas : []),
      error: () => this.detalle.set([]),
    });
  }

  // ─── Procesos ──────────────────────────────────────────────────────────────

  simular(): void {
    if (!this.datosCompletos()) return;

    const { contrato, fechaSalida, causal } = this.formulario.getRawValue();
    this.ocupado.set(true);
    this.liquidacionService.simular(contrato.codigo, fechaSalida, causal.codigo).subscribe({
      next: (resultado) => {
        this.ocupado.set(false);
        this.simulacion.set(resultado);
      },
      error: (err) => {
        this.ocupado.set(false);
        this.simulacion.set(null);
        this.avisar(mensajeDeError(err, 'No se pudo simular el finiquito.'), true);
      },
    });
  }

  calcular(): void {
    if (!this.datosCompletos()) return;

    const { contrato, fechaSalida, causal, observaciones } = this.formulario.getRawValue();
    this.ocupado.set(true);
    this.liquidacionService
      .calcular(contrato.codigo, fechaSalida, causal.codigo, observaciones ?? null)
      .subscribe({
        next: (creada) => {
          this.ocupado.set(false);
          this.avisar('Finiquito calculado y guardado.');
          if (creada?.codigo) {
            this.router.navigate(['/menurecursoshumanos/procesos/liquidacion', creada.codigo]);
          }
        },
        error: (err) => {
          this.ocupado.set(false);
          this.avisar(mensajeDeError(err, 'No se pudo calcular el finiquito.'), true);
        },
      });
  }

  ejecutar(accion: AccionLiquidacion): void {
    const l = this.liquidacion();
    if (!l) return;

    if (accion === 'ejecutarSalida' && !confirm(textoConfirmacionSalida(this.nombreColaborador()))) {
      return;
    }

    const llamada = {
      aprobar: () => this.liquidacionService.aprobar(l.codigo),
      ejecutarSalida: () => this.liquidacionService.ejecutarSalida(l.codigo),
      contabilizar: () => this.liquidacionService.contabilizar(l.codigo),
    }[accion];

    this.ocupado.set(true);
    llamada().subscribe({
      next: () => {
        this.ocupado.set(false);
        this.avisar(MENSAJE_EXITO[accion]);
        this.recargar(l.codigo);
      },
      error: (err) => {
        this.ocupado.set(false);
        this.avisar(mensajeDeError(err, 'El proceso no se pudo completar.'), true);
      },
    });
  }

  private recargar(idLiquidacion: number): void {
    this.liquidacionService.getById(idLiquidacion).subscribe({
      next: (l) => {
        this.liquidacion.set(l);
        this.cargarDetalle(idLiquidacion);
      },
      error: () => undefined,
    });
  }

  private datosCompletos(): boolean {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.avisar('Indique colaborador, contrato, fecha de salida y causal.', true);
      return false;
    }
    return this.contratoEsDelColaborador();
  }

  /**
   * Última red: el finiquito lo liquida **el dueño del contrato**, no el colaborador de pantalla.
   *
   * `/rest/lqdc/calcular` y `/rest/lqdc/simular` reciben sólo `idContrato`; el backend saca la
   * persona de `contrato.getEmpleado()`. Un contrato de otro no da error ni deja rastro: el
   * registro sale internamente coherente y sólo se ve mirando a quién se liquidó, cuando la
   * salida ya está ejecutada. Acotar la lista lo hace difícil; esto lo hace imposible.
   */
  private contratoEsDelColaborador(): boolean {
    const { empleado, contrato } = this.formulario.getRawValue();
    const elegido = empleado?.codigo;
    const dueno = contrato?.empleado?.codigo;
    if (elegido == null || dueno == null || Number(elegido) === Number(dueno)) return true;

    const nombre = `${contrato.empleado.apellidos ?? ''} ${contrato.empleado.nombres ?? ''}`.trim();
    this.avisar(
      `El contrato ${contrato.numero ?? ''} es de ${nombre || 'otro colaborador'}, no de ` +
        `${this.nombreColaborador()}. El finiquito liquidaría al dueño del contrato: elija uno suyo.`,
      true,
    );
    return false;
  }

  // ─── Presentación ──────────────────────────────────────────────────────────

  motivo(accion: AccionLiquidacion): string {
    return motivoNoDisponible(accion, this.liquidacion());
  }

  nombreColaborador(): string {
    const l = this.liquidacion();
    const emp: any = l ? l.empleado : this.formulario.get('empleado')?.value;
    if (!emp) return '';
    return `${emp.apellidos ?? ''} ${emp.nombres ?? ''}`.trim();
  }

  fecha(valor: any): Date | null {
    if (!valor) return null;
    const f = this.funcionesDatosS.convertirFechaDesdeBackend(valor);
    return f instanceof Date && !Number.isNaN(f.getTime()) ? f : null;
  }

  volver(): void {
    this.router.navigate(['/menurecursoshumanos/procesos/liquidacion']);
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
