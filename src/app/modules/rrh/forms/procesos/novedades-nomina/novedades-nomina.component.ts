import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ServiceLocatorRrhService } from '../../../../../shared/basics/service-locator/service-locator-rrh.service';
import { TableBasicHijosComponent } from '../../../../../shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component';
import { TableConfig } from '../../../../../shared/basics/table/model/table-interface';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { ConceptoNomina } from '../../../model/concepto-nomina';
import { ContratoEmpleado } from '../../../model/contrato-empleado';
import { Empleado } from '../../../model/empleado';
import { EntidadesRrh } from '../../../model/entidades-rrh';
import { NovedadNomina } from '../../../model/novedad-nomina';
import { PeriodoNomina } from '../../../model/periodo-nomina';
import { ConceptoNominaService } from '../../../service/concepto-nomina.service';
import { ContratoEmpleadoService } from '../../../service/contrato-empleado.service';
import { EmpleadoService } from '../../../service/empleado.service';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import {
  aniosDisponibles,
  filtrarPorAnio,
  criteriosPorEmpresa,
  extraerCodigo,
  OPCIONES_SI_NO,
} from '../../parametrizacion/utiles-parametrizacion';
import { referencia, sinAdornos } from '../../comunes/cuerpo-entidad';
import { registrarEjercicios } from '../../comunes/ejercicios';
import { opcionesAviso } from '../../comunes/avisos';

/**
 * Novedades del período (RHH.NVNM).
 *
 * Es la vía de carga manual de la nómina histórica de enero–julio de 2026: mientras no haya
 * biométrico, los días trabajados y las horas extra entran por aquí. Por eso la pantalla está
 * pensada para carga rápida —seleccionar período y añadir filas seguidas— y no para navegar.
 *
 * Solo las novedades aprobadas entran en el cálculo, así que el contador de pendientes está a la
 * vista: una novedad cargada y sin aprobar no aparece en el rol y nadie se entera.
 */
/**
 * Estado con el que nace una novedad. `NVNMESTD` lleva `DEFAULT 1` en el DDL y su comentario
 * dice 1=ACTIVO, pero el valor por defecto de la columna no llega a aplicarse: JPA manda el
 * nulo explícito. Y el motor solo recoge las novedades con `estado = 1`
 * (`NovedadNominaDaoServiceImpl.selectAprobadas`), así que una novedad con estado nulo se
 * ignora en el cálculo **sin un solo aviso**. Verificado contra el desplegado el 2026-08-20.
 */
const ESTADO_ACTIVO = 1;

/** `MPLDESTD` = 4. El mismo valor con el que `selectActivosEnPeriodo` descarta a una persona. */
const ESTADO_EMPLEADO_CESANTE = 4;

/**
 * Si el motor va a mirar esta novedad. Las dos condiciones de `selectAprobadas`, no una.
 *
 * `NovedadNominaDaoServiceImpl` pide `aprobada = 'S' and estado = 1`. La rejilla enseñaba sólo
 * la primera, y esa mitad salía bien: una novedad con el estado nulo se veía idéntica a una
 * buena.
 */
function entraEnElCalculo(novedad: NovedadNomina): boolean {
  return novedad?.aprobada === 'S' && Number(novedad?.estado) === ESTADO_ACTIVO;
}

/** Por qué no entra, que es más útil que un «No» a secas. */
function motivoFueraDelCalculo(novedad: NovedadNomina): string {
  if (novedad?.aprobada !== 'S') return 'No · sin aprobar';
  return 'No · sin estado';
}

/** Una fecha del backend —arreglo, cadena o `Date`— comparable, a medianoche. */
function aFecha(valor: any): Date | null {
  if (valor === null || valor === undefined) return null;
  if (Array.isArray(valor) && valor.length >= 3) {
    return new Date(Number(valor[0]), Number(valor[1]) - 1, Number(valor[2]));
  }
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime())
      ? null
      : new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
  }
  if (typeof valor === 'string') {
    const partes = valor.slice(0, 10).split('-');
    if (partes.length === 3) {
      const fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
      return Number.isNaN(fecha.getTime()) ? null : fecha;
    }
  }
  return null;
}

@Component({
  selector: 'app-novedades-nomina',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    TableBasicHijosComponent,
  ],
  templateUrl: './novedades-nomina.component.html',
  styleUrls: ['./novedades-nomina.component.scss'],
})
export class NovedadesNominaComponent implements OnInit {
  anios = aniosDisponibles();
  anio = signal<number>(new Date().getFullYear());
  periodos = signal<PeriodoNomina[]>([]);
  periodoSeleccionado = signal<number | null>(null);
  novedades = signal<NovedadNomina[]>([]);
  /** Mientras esto sea cierto, un desplegable vacío significa «todavía no sé», no «no hay». */
  cargandoPeriodos = signal<boolean>(true);
  tableConfig?: TableConfig;

  /**
   * Novedades que el motor no va a mirar: le falta la aprobación o le falta el estado.
   *
   * Sustituye al contador de «sin aprobar», que sólo miraba la mitad de la condición.
   */
  fueraDelCalculo = computed(
    () => this.novedades().filter((n) => !entraEnElCalculo(n)).length,
  );

  private empleados: Empleado[] = [];
  private conceptos: ConceptoNomina[] = [];
  private contratos: ContratoEmpleado[] = [];

  constructor(
    private periodoService: PeriodoNominaService,
    private empleadoService: EmpleadoService,
    private conceptoService: ConceptoNominaService,
    private contratoService: ContratoEmpleadoService,
    private locatorRrh: ServiceLocatorRrhService,
    private snackBar: MatSnackBar,
  ) {}

  /**
   * Los períodos se piden **de entrada y por su cuenta**.
   *
   * Antes colgaban del `forkJoin` de colaboradores y conceptos —dos `getAll` completos—, así que
   * hasta que ésos no volvían el desplegable de *Período* estaba vacío. Un desplegable vacío en
   * esta pantalla se lee como «el período no está creado», y el siguiente paso natural es ir a
   * crearlo otra vez: dos períodos del mismo mes es exactamente el dato duplicado que después
   * nadie distingue.
   */
  ngOnInit(): void {
    this.cargarPeriodos();

    const sinFallo = (fuente: any) =>
      fuente.pipe(
        map((filas: any) => filas ?? []),
        catchError(() => of<any[]>([])),
      );

    forkJoin({
      empleados: sinFallo(this.empleadoService.selectByCriteria(criteriosPorEmpresa('apellidos'))),
      conceptos: sinFallo(this.conceptoService.selectByCriteria(criteriosPorEmpresa('nombre'))),
      contratos: sinFallo(this.contratoService.selectByCriteria([])),
    }).subscribe((datos: any) => {
      this.empleados = datos.empleados;
      this.conceptos = datos.conceptos;
      this.contratos = datos.contratos;
      // La tabla pudo construirse antes de que llegaran las colecciones de los combos
      if (this.periodoSeleccionado() !== null) this.onPeriodoChange(this.periodoSeleccionado());
    });
  }

  onAnioChange(anio: number): void {
    this.anio.set(anio);
    this.periodoSeleccionado.set(null);
    this.tableConfig = undefined;
    this.cargarPeriodos();
  }

  private cargarPeriodos(): void {
    this.cargandoPeriodos.set(true);
    this.periodoService.selectByCriteria(criteriosPorEmpresa('mes')).subscribe({
      next: (data) => {
        // El piso de los selectores de ejercicio se aprende del dato, igual que en el listado
        registrarEjercicios(data ?? []);
        this.anios = aniosDisponibles();
        this.periodos.set(filtrarPorAnio(data, this.anio()));
        this.cargandoPeriodos.set(false);
      },
      error: () => {
        this.periodos.set([]);
        this.cargandoPeriodos.set(false);
        this.avisar('No se pudieron cargar los períodos de nómina');
      },
    });
  }

  onPeriodoChange(codigo: number | null): void {
    this.periodoSeleccionado.set(codigo);
    this.locatorRrh.filtroPeriodo = codigo;

    if (codigo === null) {
      this.tableConfig = undefined;
      this.novedades.set([]);
      return;
    }

    this.locatorRrh
      .recargarValores(EntidadesRrh.NOVEDAD_NOMINA)
      .then((data) => this.construirTabla(Array.isArray(data) ? data : []))
      .catch(() => {
        this.avisar('No se pudieron cargar las novedades del período');
        this.construirTabla([]);
      });
  }

  private construirTabla(registros: NovedadNomina[]): void {
    this.novedades.set(registros);

    this.tableConfig = {
      entidad: EntidadesRrh.NOVEDAD_NOMINA,
      titulo: 'Novedades del período',
      registros: this.formatear(registros),
      fields: [
        { column: 'empleadoLabel', header: 'Colaborador', fWidth: '28%' },
        { column: 'conceptoLabel', header: 'Concepto', fWidth: '24%' },
        { column: 'cantidad', header: 'Cantidad', fWidth: '12%', fAlign: 'aR' },
        { column: 'valor', header: 'Valor', fWidth: '14%', fType: 2, fAlign: 'aR' },
        { column: 'descripcion', header: 'Descripción', fWidth: '12%' },
        { column: 'aprobadaLabel', header: 'Aprobada', fWidth: '9%', fAlign: 'aC' },
        // El motor exige LAS DOS condiciones —`aprobada = 'S'` y `estado = 1`— y la rejilla sólo
        // enseñaba la primera. Una novedad con el estado nulo se veía igual que una buena y el
        // cálculo la descartaba sin un aviso. Esta columna responde la pregunta que el usuario
        // tiene de verdad: si la fila va a entrar o no.
        { column: 'calculoLabel', header: '¿Entra al cálculo?', fWidth: '13%', fAlign: 'aC' },
      ],
      regConfig: [
        {
          type: 'autocomplete',
          name: 'empleado',
          label: 'Colaborador',
          autocompleteType: 1,
          // Combo de tabla: busca por identificación y por apellidos
          selectField: ['identificacion', 'apellidos'],
          collections: this.empleadosDelPeriodo(),
        },
        {
          type: 'autocomplete',
          name: 'conceptoNomina',
          label: 'Concepto de nómina',
          autocompleteType: 1,
          // Combo de tabla: busca por nombre y por código alterno
          selectField: ['nombre', 'codigoAlterno'],
          collections: this.conceptos,
        },
        { type: 'input', name: 'cantidad', label: 'Cantidad (horas, días, unidades)', inputType: 'number' },
        {
          type: 'input',
          name: 'valor',
          label: 'Valor',
          inputType: 'number',
          validations: [
            { name: 'required', validator: Validators.required, message: 'El valor es requerido' },
          ],
        },
        { type: 'input', name: 'descripcion', label: 'Descripción', inputType: 'text' },
        {
          // Nace **sin valor** y es obligatorio, a propósito.
          //
          // Con `No` puesto de arranque, guardar sin tocarlo era un camino normal y sin
          // fricción: la fila se guardaba, se veía en la rejilla como cualquier otra y
          // `selectAprobadas` —`aprobada = 'S' and estado = 1`— no la miraba nunca. El mes salía
          // con un descuento de menos y ninguna cifra decía de quién.
          //
          // El arreglo no es poner `Sí` por defecto: `'N'` es el valor correcto para una bandera
          // de aprobación. Lo que faltaba era que alguien tuviera que responder.
          type: 'select',
          name: 'aprobada',
          label: 'Aprobada para el cálculo',
          value: null,
          autocompleteType: 1,
          selectField: ['descripcion'],
          collections: OPCIONES_SI_NO,
          validations: [
            {
              name: 'required',
              validator: Validators.required,
              message: 'Diga si la novedad entra al cálculo: sin «Sí» el motor no la mira',
            },
          ],
        },
      ],
      add: true,
      edit: true,
      remove: true,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08',
      onBeforeSave: (datos: any) => {
        const aprobada = extraerCodigo(datos.aprobada);
        return {
          ...sinAdornos(datos),
          periodoNomina: { codigo: this.periodoSeleccionado() },
          empleado: referencia(datos.empleado),
          conceptoNomina: referencia(datos.conceptoNomina),
          aprobada,
          estado: datos.estado ?? ESTADO_ACTIVO,
          usuarioAprueba: aprobada === 'S' ? usuarioSesion() : null,
          usuarioRegistro: usuarioSesion(),
        };
      },
      onDataUpdate: (data: NovedadNomina[]) => {
        this.novedades.set(data ?? []);
        return this.formatear(data ?? []);
      },
    };
  }

  private formatear(registros: NovedadNomina[]): any[] {
    return registros.map((row) => ({
      ...row,
      empleadoLabel: this.etiquetaEmpleado(row.empleado as any),
      conceptoLabel: (row.conceptoNomina as any)?.nombre ?? '—',
      aprobadaLabel: row.aprobada === 'S' ? 'Sí' : 'No',
      calculoLabel: entraEnElCalculo(row) ? 'Sí' : motivoFueraDelCalculo(row),
    }));
  }

  /**
   * Colaboradores a los que tiene sentido registrarle una novedad de **este** período.
   *
   * Mismo criterio que `selectActivosEnPeriodo`, que es quien decide a quién procesa el motor:
   * contrato empezado antes de que acabe el período, no vencido antes de que empiece, y —la
   * asimetría deliberada— si el contrato tiene fecha de terminación se mira **sólo la fecha**,
   * porque el mes de la salida no va por nómina, lo paga el finiquito; si no la tiene, se mira
   * el estado del empleado. Sin esto la lista ofrecía a los cesantes, y una novedad para quien
   * no está en el período queda huérfana: no se lee jamás y nadie la ve.
   *
   * Mientras no haya período elegido o no hayan llegado los contratos, se ofrece la lista
   * completa: es preferible a un combo vacío que se lea como «no hay nadie».
   */
  private empleadosDelPeriodo(): Empleado[] {
    const periodo = this.periodos().find((p) => p.codigo === this.periodoSeleccionado());
    if (!periodo || this.contratos.length === 0) return this.empleados;

    const desde = aFecha(periodo.fechaInicio);
    const hasta = aFecha(periodo.fechaFin);
    if (!desde || !hasta) return this.empleados;

    const conContrato = new Set<number>();
    for (const contrato of this.contratos) {
      const codigo = (contrato.empleado as any)?.codigo;
      if (codigo == null) continue;

      const inicio = aFecha(contrato.fechaInicio);
      if (!inicio || inicio > hasta) continue;

      const fin = aFecha(contrato.fechaFin);
      if (fin && fin < desde) continue;

      const terminacion = aFecha(contrato.fechaTerminacion);
      if (terminacion) {
        if (terminacion <= hasta) continue;
      } else {
        const estado = (contrato.empleado as any)?.estado;
        if (estado != null && Number(estado) === ESTADO_EMPLEADO_CESANTE) continue;
      }

      conContrato.add(Number(codigo));
    }

    const propios = this.empleados.filter((e) => conContrato.has(Number(e.codigo)));
    return propios.length > 0 ? propios : this.empleados;
  }

  etiquetaEmpleado(empleado: any): string {
    if (!empleado) return '—';
    return `${empleado.identificacion ?? ''} — ${empleado.apellidos ?? ''} ${empleado.nombres ?? ''}`.trim();
  }

  etiquetaPeriodo(periodo: PeriodoNomina): string {
    return `${periodo.mes}/${periodo.anio}`;
  }

  onTableError(errorData: { mensaje: string; codigoHttp?: number }): void {
    const exito =
      errorData.codigoHttp != null && errorData.codigoHttp >= 200 && errorData.codigoHttp < 300;
    this.snackBar.open(errorData.mensaje, 'Cerrar', {
      ...opcionesAviso(!exito, errorData.mensaje),
    });
  }

  private avisar(mensaje: string): void {
    this.onTableError({ mensaje });
  }
}
