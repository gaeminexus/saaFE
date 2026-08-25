import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { ContratoEmpleadoService } from '../../../service/contrato-empleado.service';
import { EmpleadoService } from '../../../service/empleado.service';
import { TipoContratoEmpleadoService } from '../../../service/tipo-contrato-empleado.service';
import { criteriosPorEmpresa } from '../../parametrizacion/utiles-parametrizacion';
import { CampoFormularioComponent } from '../../comunes/campo-formulario/campo-formulario.component';
import { armarCuerpo, referenciaSinResolver } from '../../comunes/cuerpo-entidad';
import { mensajeDeError } from '../../comunes/mensajes';
import { CampoFormulario } from '../../comunes/modelo-formulario';
import { aValorDeInput } from './formato-ficha';
import { seccionesFicha } from './secciones-ficha.config';
import { opcionesAviso } from '../../comunes/avisos';

interface GrupoCampos {
  titulo: string;
  campos: CampoFormulario[];
}

/**
 * Formulario del contrato, en **vista propia**: su ruta, el ancho completo de la pantalla y las
 * acciones fijas abajo, fuera del scroll.
 *
 * Sustituye al panel lateral, que en pantallas estrechas obligaba a un scroll larguísimo con
 * dieciocho campos en una columna mientras desperdiciaba el ancho de la lista. Aquí los campos
 * se agrupan por asunto y se reparten en dos columnas cuando hay sitio.
 */
@Component({
  selector: 'app-contrato-form',
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
  templateUrl: './contrato-form.component.html',
  styleUrls: ['./contrato-form.component.scss'],
})
export class ContratoFormComponent implements OnInit {
  readonly cargando = signal<boolean>(true);
  readonly guardando = signal<boolean>(false);
  readonly empleado = signal<any | null>(null);
  readonly esAlta = signal<boolean>(true);
  readonly grupos = signal<GrupoCampos[]>([]);

  formulario: FormGroup = new FormGroup({});

  private empleadoCodigo = 0;
  private contratoCodigo: number | null = null;
  /** Signal, no propiedad suelta: el título se calcula a partir de él. */
  private readonly registro = signal<any>(null);
  private seccion = seccionesFicha({
    bancos: [],
    conceptosNomina: [],
    tiposContrato: [],
    causalesTerminacion: [],
    departamentosCargo: [],
    contratos: [],
  }).find((s) => s.clave === 'contratos')!;

  readonly titulo = computed(() =>
    this.esAlta() ? 'Nuevo contrato' : `Contrato ${this.registro()?.numero ?? ''}`.trim(),
  );

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private empleadoService: EmpleadoService,
    private contratoService: ContratoEmpleadoService,
    private tipoContratoService: TipoContratoEmpleadoService,
    private detalleRubroService: DetalleRubroService,
    private funcionesDatosS: FuncionesDatosService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.empleadoCodigo = Number(this.route.snapshot.paramMap.get('codigo'));
    const contrato = this.route.snapshot.paramMap.get('codigoContrato');
    this.contratoCodigo = contrato && contrato !== 'nuevo' ? Number(contrato) : null;
    this.esAlta.set(this.contratoCodigo === null);

    if (!this.empleadoCodigo) {
      this.volver();
      return;
    }
    this.cargar();
  }

  private cargar(): void {
    forkJoin({
      empleado: this.empleadoService.getById(this.empleadoCodigo).pipe(catchError(() => of(null))),
      tiposContrato: this.tipoContratoService
        .selectByCriteria(criteriosPorEmpresa('nombre'))
        .pipe(map((f) => f ?? []), catchError(() => of([] as any[]))),
      contrato: this.contratoCodigo
        ? this.contratoService
            .getById(String(this.contratoCodigo))
            .pipe(catchError(() => of(null)))
        : of(null),
    }).subscribe({
      next: ({ empleado, tiposContrato, contrato }) => {
        this.empleado.set(empleado);
        this.registro.set(contrato);
        this.prepararCampos(tiposContrato ?? []);
        this.construirFormulario();
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.avisar(mensajeDeError(err, 'No se pudo abrir el contrato.'), true);
        this.volver();
      },
    });
  }

  /** La colección del combo de tipo de contrato se inyecta en la definición ya cargada. */
  private prepararCampos(tiposContrato: any[]): void {
    const campos = this.seccion.campos.map((campo) =>
      campo.name === 'tipoContratoEmpleado' ? { ...campo, coleccion: tiposContrato } : campo,
    );

    const orden: string[] = [];
    const porGrupo = new Map<string, CampoFormulario[]>();
    for (const campo of campos) {
      const grupo = campo.grupo ?? 'Otros';
      if (!porGrupo.has(grupo)) {
        porGrupo.set(grupo, []);
        orden.push(grupo);
      }
      porGrupo.get(grupo)!.push(campo);
    }

    this.grupos.set(orden.map((titulo) => ({ titulo, campos: porGrupo.get(titulo)! })));
  }

  private construirFormulario(): void {
    const controles: Record<string, any> = {};

    for (const campo of this.seccion.campos) {
      let valor: any = this.registro() ? this.registro()[campo.name] : (campo.valor ?? null);
      if (campo.tipo === 'fecha') {
        valor = this.registro()
          ? aValorDeInput(this.registro()[campo.name], this.dependencias())
          : null;
      }
      controles[campo.name] = [valor, campo.requerido ? Validators.required : []];
    }

    this.formulario = this.fb.group(controles);
  }

  private dependencias() {
    return {
      detalleRubroService: this.detalleRubroService,
      funcionesDatosS: this.funcionesDatosS,
    };
  }

  guardar(): void {
    const aMedias = referenciaSinResolver(this.seccion.campos, this.formulario.getRawValue());
    if (aMedias) {
      this.avisar(`Elija «${aMedias}» de la lista: no basta con escribirlo.`, true);
      return;
    }

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.avisar('Revise los campos obligatorios.', true);
      return;
    }

    const cuerpo = armarCuerpo(
      this.registro(),
      this.formulario.getRawValue(),
      this.seccion.camposEscalares,
      this.seccion.camposReferencia,
      { fijos: { empleado: { codigo: this.empleadoCodigo } }, usuarioRegistro: usuarioSesion() },
    );

    this.guardando.set(true);
    const peticion = this.esAlta()
      ? this.contratoService.add(cuerpo)
      : this.contratoService.update(cuerpo);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.avisar(this.esAlta() ? 'Contrato creado.' : 'Cambios guardados.');
        this.volver();
      },
      error: (err) => {
        this.guardando.set(false);
        this.avisar(mensajeDeError(err, 'No se pudo guardar el contrato.'), true);
      },
    });
  }

  volver(): void {
    this.router.navigate(['/menurecursoshumanos/personal/ficha', this.empleadoCodigo], {
      queryParams: { seccion: 'contratos' },
    });
  }

  nombreEmpleado(): string {
    const emp = this.empleado();
    if (!emp) return '';
    return `${emp.apellidos ?? ''} ${emp.nombres ?? ''}`.trim();
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      ...opcionesAviso(esError, mensaje),
    });
  }
}
