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
import { Empleado } from '../../../model/empleado';
import { EntidadesRrh } from '../../../model/entidades-rrh';
import { NovedadNomina } from '../../../model/novedad-nomina';
import { PeriodoNomina } from '../../../model/periodo-nomina';
import { ConceptoNominaService } from '../../../service/concepto-nomina.service';
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
  tableConfig?: TableConfig;

  pendientes = computed(() => this.novedades().filter((n) => n.aprobada !== 'S').length);

  private empleados: Empleado[] = [];
  private conceptos: ConceptoNomina[] = [];

  constructor(
    private periodoService: PeriodoNominaService,
    private empleadoService: EmpleadoService,
    private conceptoService: ConceptoNominaService,
    private locatorRrh: ServiceLocatorRrhService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
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
      this.cargarPeriodos();
    });
  }

  onAnioChange(anio: number): void {
    this.anio.set(anio);
    this.periodoSeleccionado.set(null);
    this.tableConfig = undefined;
    this.cargarPeriodos();
  }

  private cargarPeriodos(): void {
    this.periodoService.selectByCriteria(criteriosPorEmpresa('mes')).subscribe({
      next: (data) => this.periodos.set(filtrarPorAnio(data, this.anio())),
      error: () => {
        this.periodos.set([]);
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
        { column: 'descripcion', header: 'Descripción', fWidth: '14%' },
        { column: 'aprobadaLabel', header: 'Aprobada', fWidth: '10%', fAlign: 'aC' },
      ],
      regConfig: [
        {
          type: 'autocomplete',
          name: 'empleado',
          label: 'Colaborador',
          autocompleteType: 1,
          // Combo de tabla: busca por identificación y por apellidos
          selectField: ['identificacion', 'apellidos'],
          collections: this.empleados,
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
          type: 'select',
          name: 'aprobada',
          label: 'Aprobada para el cálculo',
          value: 'N',
          autocompleteType: 1,
          selectField: ['descripcion'],
          collections: OPCIONES_SI_NO,
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
    }));
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
      duration: exito ? 4000 : 8000,
      panelClass: [exito ? 'snackbar-success' : 'snackbar-error'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  private avisar(mensaje: string): void {
    this.onTableError({ mensaje });
  }
}
