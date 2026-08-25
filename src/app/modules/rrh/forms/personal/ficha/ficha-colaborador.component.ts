import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { BancoService } from '../../../../tsr/service/banco.service';
import { Empleado } from '../../../model/empleado';
import { ESTADOS_EN_FIRME } from '../../../model/estados-liquidacion';
import { Liquidacion } from '../../../model/Liquidacion';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { CausalTerminacionService } from '../../../service/causal-terminacion.service';
import { ConceptoNominaService } from '../../../service/concepto-nomina.service';
import { ContratoEmpleadoService } from '../../../service/contrato-empleado.service';
import { DepartementoCargoService } from '../../../service/departemento-cargo.service';
import { EmpleadoService } from '../../../service/empleado.service';
import { LiquidacionService } from '../../../service/liquidacion.service';
import { TipoContratoEmpleadoService } from '../../../service/tipo-contrato-empleado.service';
import { criteriosPorEmpresa } from '../../parametrizacion/utiles-parametrizacion';
import { mensajeDeError } from '../../comunes/mensajes';
import { DatosPersonalesComponent } from './datos-personales.component';
import { SeccionFichaComponent } from './seccion-ficha.component';
import { ClaveSeccion, ColeccionesFicha, SeccionFicha, seccionesFicha } from './secciones-ficha.config';
import { resumenDelColaborador, PastillaFicha } from './resumen-colaborador';
import { opcionesAviso } from '../../comunes/avisos';

/** La sección abierta: los datos personales o una de las tablas hijas. */
type Vista = 'datos-personales' | ClaveSeccion;

/**
 * Ficha del colaborador: cabecera con lo que hay que saber de un vistazo, secciones a la
 * izquierda y contenido a la derecha.
 *
 * Primera pantalla del lenguaje nuevo (`ORDEN-REDISENO-UI-RRHH.md`): la edición ocurre en un
 * panel lateral con las acciones siempre visibles, no en un modal que puede no caber.
 */
@Component({
  selector: 'app-ficha-colaborador',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    DatosPersonalesComponent,
    SeccionFichaComponent,
  ],
  templateUrl: './ficha-colaborador.component.html',
  styleUrls: ['./ficha-colaborador.component.scss'],
})
export class FichaColaboradorComponent implements OnInit {
  readonly empleado = signal<Empleado | null>(null);
  readonly colecciones = signal<ColeccionesFicha | null>(null);
  readonly cargando = signal<boolean>(true);
  readonly vista = signal<Vista>('datos-personales');
  /** Finiquito en firme del colaborador, si salió. No se duplica en la ficha: se enlaza. */
  readonly liquidacion = signal<Liquidacion | null>(null);

  readonly secciones = computed<SeccionFicha[]>(() => {
    const col = this.colecciones();
    return col ? seccionesFicha(col) : [];
  });

  readonly seccionActiva = computed<SeccionFicha | null>(() => {
    const clave = this.vista();
    if (clave === 'datos-personales') return null;
    return this.secciones().find((s) => s.clave === clave) ?? null;
  });

  /** Pastillas de la cabecera: situación, contrato, sueldo, antigüedad, región y finiquito. */
  readonly pastillas = computed<PastillaFicha[]>(() =>
    resumenDelColaborador(
      this.empleado(),
      this.colecciones()?.contratos ?? [],
      {
        detalleRubroService: this.detalleRubroService,
        funcionesDatosS: this.funcionesDatosS,
      },
      this.liquidacion(),
    ),
  );

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private empleadoService: EmpleadoService,
    private bancoService: BancoService,
    private conceptoNominaService: ConceptoNominaService,
    private tipoContratoService: TipoContratoEmpleadoService,
    private causalService: CausalTerminacionService,
    private departamentoCargoService: DepartementoCargoService,
    private contratoService: ContratoEmpleadoService,
    private liquidacionService: LiquidacionService,
    private detalleRubroService: DetalleRubroService,
    private funcionesDatosS: FuncionesDatosService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const seccion = this.route.snapshot.queryParamMap.get('seccion') as Vista | null;
    if (seccion) this.vista.set(seccion);

    const codigo = Number(this.route.snapshot.paramMap.get('codigo'));
    if (!codigo) {
      this.volver();
      return;
    }
    this.cargar(codigo);
  }

  private cargar(codigo: number): void {
    this.cargando.set(true);

    /** Una colección que no cargue no debe impedir abrir la ficha: se degrada a lista vacía. */
    const sinFallo = (fuente: Observable<any[] | null>): Observable<any[]> =>
      fuente.pipe(
        map((filas) => filas ?? []),
        catchError(() => of<any[]>([])),
      );

    forkJoin({
      empleado: this.empleadoService.getById(codigo).pipe(catchError(() => of(null))),
      bancos: sinFallo(this.bancoService.getAll()),
      conceptosNomina: sinFallo(
        this.conceptoNominaService.selectByCriteria(criteriosPorEmpresa('nombre')),
      ),
      tiposContrato: sinFallo(
        this.tipoContratoService.selectByCriteria(criteriosPorEmpresa('nombre')),
      ),
      causalesTerminacion: sinFallo(
        this.causalService.selectByCriteria(criteriosPorEmpresa('nombre')),
      ),
      departamentosCargo: sinFallo(this.departamentoCargoService.selectByCriteria([])),
      contratos: sinFallo(this.contratoService.selectByCriteria(this.criteriosDelEmpleado(codigo))),
      liquidaciones: sinFallo(
        this.liquidacionService.selectByCriteria(this.criteriosLiquidacion(codigo)),
      ),
    }).subscribe({
      next: (datos) => {
        this.cargando.set(false);

        if (!datos.empleado) {
          this.avisar('No se encontró el colaborador solicitado.', true);
          this.volver();
          return;
        }

        this.empleado.set(datos.empleado as Empleado);
        this.liquidacion.set(this.finiquitoEnFirme(datos.liquidaciones ?? []));
        this.colecciones.set({
          bancos: datos.bancos ?? [],
          conceptosNomina: datos.conceptosNomina ?? [],
          tiposContrato: datos.tiposContrato ?? [],
          causalesTerminacion: datos.causalesTerminacion ?? [],
          departamentosCargo: datos.departamentosCargo ?? [],
          contratos: datos.contratos ?? [],
        });
      },
      error: (err) => {
        this.cargando.set(false);
        this.avisar(mensajeDeError(err, 'No se pudo abrir la ficha del colaborador.'), true);
      },
    });
  }

  /** Los contratos del colaborador alimentan el combo de la sección de conceptos fijos. */
  private criteriosDelEmpleado(codigo: number): DatosBusqueda[] {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empleado',
      'codigo',
      codigo.toString(),
      TipoComandosBusqueda.IGUAL,
    );

    const orden = new DatosBusqueda();
    orden.orderBy('fechaInicio');

    return [db, orden];
  }

  /** Los finiquitos del colaborador, para saber si ya salió y con qué liquidación. */
  private criteriosLiquidacion(codigo: number): DatosBusqueda[] {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empleado',
      'codigo',
      codigo.toString(),
      TipoComandosBusqueda.IGUAL,
    );

    const orden = new DatosBusqueda();
    orden.orderBy('fechaSalida');

    return [db, orden];
  }

  /**
   * El último finiquito **en firme**: aprobado, registrado en el SUT o pagado.
   *
   * Un borrador o un cálculo sin aprobar todavía se puede rehacer, y anunciarlo en la cabecera
   * lo convertiría en un hecho consumado para quien solo abre la ficha. La anulada queda fuera
   * por lo mismo. El filtro por estado se hace aquí y no en el criterio porque `selectByCriteria`
   * no sabe enlazar un `INTEGER`, que es lo que es `LQDCESTD`.
   */
  private finiquitoEnFirme(liquidaciones: any[]): Liquidacion | null {
    const enFirme = liquidaciones
      .filter((l) => ESTADOS_EN_FIRME.includes(Number(l?.estado)))
      .sort((a, b) => Number(b?.codigo ?? 0) - Number(a?.codigo ?? 0));
    return (enFirme[0] as Liquidacion) ?? null;
  }

  abrir(vista: Vista): void {
    this.vista.set(vista);
  }

  /** Las pastillas que llevan a otra pantalla se navegan; el resto no hacen nada. */
  irA(pastilla: PastillaFicha): void {
    if (pastilla.enlace) this.router.navigate(pastilla.enlace);
  }

  onGuardado(empleado: Empleado): void {
    this.empleado.set(empleado);
  }

  nombreCompleto(): string {
    const empleado = this.empleado();
    if (!empleado) return '';
    return `${empleado.apellidos ?? ''} ${empleado.nombres ?? ''}`.trim();
  }

  iniciales(): string {
    const partes = this.nombreCompleto().split(' ').filter(Boolean);
    return partes
      .slice(0, 2)
      .map((parte) => parte.charAt(0))
      .join('')
      .toUpperCase();
  }

  etiquetaRegion(): string {
    const region = this.empleado()?.region;
    if (region === null || region === undefined) return '';
    return (
      this.detalleRubroService.getDescripcionByParentAndAlterno(
        RubrosRrh.REGION_DECIMO_CUARTO,
        region,
      ) || ''
    );
  }

  volver(): void {
    this.router.navigate(['/menurecursoshumanos/personal/colaboradores']);
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      ...opcionesAviso(esError, mensaje),
    });
  }
}
