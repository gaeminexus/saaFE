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
import { BancoExternoService } from '../../../../tsr/service/banco-externo.service';
import { CuentaBancariaEmpleadoService } from '../../../service/cuenta-bancaria-empleado.service';
import { EmpleadoService } from '../../../service/empleado.service';
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
 * Formulario de la cuenta bancaria del colaborador, en **vista propia** — calco de
 * `contrato-form.component.ts`, mismo motivo: reemplaza al panel lateral para esta sección sin
 * tocar `PanelLateralComponent` ni las otras seis secciones de la ficha, que lo siguen usando.
 *
 * **El combo de banco lee `TSR.BEXT` (bancos externos), no `TSR.BNCO`.** El DDL que cambió
 * `RHH.CBEM.BNCOCDGO` por `BEXTCDGO` ya se aplicó (2026-09-03) y la entidad del backend
 * (`CuentaBancariaEmpleado.java`) ya apunta a `BancoExterno` — verificado con el campo `banco`
 * sin renombrar, solo retipado, así que la clave del JSON sigue siendo `banco`. Antes de este
 * cambio esto leía `BancoService` (`TSR.BNCO`) a propósito, mientras el DDL no existía.
 */
@Component({
  selector: 'app-cuenta-bancaria-form',
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
  templateUrl: './cuenta-bancaria-form.component.html',
  styleUrls: ['./cuenta-bancaria-form.component.scss'],
})
export class CuentaBancariaFormComponent implements OnInit {
  readonly cargando = signal<boolean>(true);
  readonly guardando = signal<boolean>(false);
  readonly empleado = signal<any | null>(null);
  readonly esAlta = signal<boolean>(true);
  readonly grupos = signal<GrupoCampos[]>([]);

  formulario: FormGroup = new FormGroup({});

  private empleadoCodigo = 0;
  private cuentaCodigo: number | null = null;
  private readonly registro = signal<any>(null);
  private seccion = seccionesFicha({
    bancos: [],
    conceptosNomina: [],
    tiposContrato: [],
    causalesTerminacion: [],
    departamentosCargo: [],
    contratos: [],
  }).find((s) => s.clave === 'datos-bancarios')!;

  readonly titulo = computed(() =>
    this.esAlta() ? 'Nueva cuenta bancaria' : `Cuenta ${this.registro()?.numeroCuenta ?? ''}`.trim(),
  );

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private empleadoService: EmpleadoService,
    private cuentaService: CuentaBancariaEmpleadoService,
    private bancoService: BancoExternoService,
    private detalleRubroService: DetalleRubroService,
    private funcionesDatosS: FuncionesDatosService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.empleadoCodigo = Number(this.route.snapshot.paramMap.get('codigo'));
    const cuenta = this.route.snapshot.paramMap.get('codigoCuenta');
    // El padre (`seccion-ficha.component.ts:145`) navega con el literal 'nuevo' — no es acuerdo
    // de género con "cuenta", es la constante que ya usa `contrato-form.component.ts`.
    this.cuentaCodigo = cuenta && cuenta !== 'nuevo' ? Number(cuenta) : null;
    this.esAlta.set(this.cuentaCodigo === null);

    if (!this.empleadoCodigo) {
      this.volver();
      return;
    }
    this.cargar();
  }

  private cargar(): void {
    forkJoin({
      empleado: this.empleadoService.getById(this.empleadoCodigo).pipe(catchError(() => of(null))),
      bancos: this.bancoService
        .getAll()
        .pipe(map((b) => b ?? []), catchError(() => of([] as any[]))),
      cuenta: this.cuentaCodigo
        ? this.cuentaService.getById(this.cuentaCodigo).pipe(catchError(() => of(null)))
        : of(null),
    }).subscribe({
      next: ({ empleado, bancos, cuenta }) => {
        this.empleado.set(empleado);
        this.registro.set(cuenta);
        this.prepararCampos(bancos ?? []);
        this.construirFormulario();
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.avisar(mensajeDeError(err, 'No se pudo abrir la cuenta bancaria.'), true);
        this.volver();
      },
    });
  }

  /** La colección del combo de banco se inyecta en la definición ya cargada. */
  private prepararCampos(bancos: any[]): void {
    const campos = this.seccion.campos.map((campo) =>
      campo.name === 'banco' ? { ...campo, coleccion: bancos } : campo,
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
      ? this.cuentaService.add(cuerpo)
      : this.cuentaService.update(cuerpo);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.avisar(this.esAlta() ? 'Cuenta bancaria creada.' : 'Cambios guardados.');
        this.volver();
      },
      error: (err) => {
        this.guardando.set(false);
        this.avisar(mensajeDeError(err, 'No se pudo guardar la cuenta bancaria.'), true);
      },
    });
  }

  volver(): void {
    this.router.navigate(['/menurecursoshumanos/personal/ficha', this.empleadoCodigo], {
      queryParams: { seccion: 'datos-bancarios' },
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
