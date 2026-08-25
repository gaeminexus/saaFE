import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ServiceLocatorRrhService } from '../../../../../shared/basics/service-locator/service-locator-rrh.service';
import { TableBasicHijosComponent } from '../../../../../shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component';
import { TableConfig } from '../../../../../shared/basics/table/model/table-interface';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { Empleado } from '../../../model/empleado';
import { EntidadesRrh } from '../../../model/entidades-rrh';
import { Marcaciones } from '../../../model/marcaciones';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { EmpleadoService } from '../../../service/empleado.service';
import { criteriosPorEmpresa, extraerCodigo } from '../../parametrizacion/utiles-parametrizacion';
import {
  CAMPOS_ASISTENCIA_PERSISTEN,
  descripcionRubro,
  rangoPorDefecto,
} from '../utiles-asistencia';
import { opcionesAviso } from '../../comunes/avisos';

/**
 * Registro manual y corrección de marcaciones (RHH.MRCC).
 *
 * Mientras no exista el importador del biométrico, esta es la única entrada de marcaciones. El
 * origen queda visible en la tabla para que se distinga de un vistazo lo digitado a mano de lo
 * que algún día venga del reloj.
 *
 * Las marcaciones ya consolidadas en un resumen diario salen señaladas: corregir una obliga a
 * volver a consolidar el día.
 */
@Component({
  selector: 'app-marcaciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    TableBasicHijosComponent,
  ],
  templateUrl: './marcaciones.component.html',
  styleUrls: ['./marcaciones.component.scss'],
})
export class MarcacionesComponent implements OnInit {
  empleados = signal<Empleado[]>([]);
  empleadoSeleccionado = signal<number | null>(null);
  desde = signal<string>('');
  hasta = signal<string>('');
  marcaciones = signal<Marcaciones[]>([]);
  tableConfig?: TableConfig;

  /**
   * `MRCCPRCS` no viaja todavía, así que el conteo sería siempre cero y el aviso no aparecería
   * nunca. Queda tras la compuerta para que no se lea como "ninguna está consolidada".
   */
  consolidadas = computed(() =>
    CAMPOS_ASISTENCIA_PERSISTEN
      ? this.marcaciones().filter((m) => m.procesado === 'S').length
      : 0,
  );
  puedeConsultar = computed(
    () => this.empleadoSeleccionado() !== null && !!this.desde() && !!this.hasta(),
  );

  constructor(
    private empleadoService: EmpleadoService,
    private locatorRrh: ServiceLocatorRrhService,
    private detalleRubroService: DetalleRubroService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const rango = rangoPorDefecto();
    this.desde.set(rango.desde);
    this.hasta.set(rango.hasta);

    this.empleadoService.selectByCriteria(criteriosPorEmpresa('apellidos')).subscribe({
      next: (data) => this.empleados.set(data ?? []),
      error: () => {
        this.empleados.set([]);
        this.avisar('No se pudo cargar la lista de colaboradores');
      },
    });
  }

  consultar(): void {
    if (!this.puedeConsultar()) return;

    // recargarValores no recibe contexto: se le dejan el colaborador y el rango vigentes
    this.locatorRrh.filtroEmpleado = this.empleadoSeleccionado();
    this.locatorRrh.filtroDesde = this.desde();
    this.locatorRrh.filtroHasta = this.hasta();

    this.locatorRrh
      .recargarValores(EntidadesRrh.MARCACION)
      .then((data) => this.construirTabla(Array.isArray(data) ? data : []))
      .catch(() => {
        this.avisar('No se pudieron cargar las marcaciones');
        this.construirTabla([]);
      });
  }

  private construirTabla(registros: Marcaciones[]): void {
    this.marcaciones.set(registros);

    this.tableConfig = {
      entidad: EntidadesRrh.MARCACION,
      titulo: 'Marcaciones',
      registros: this.formatear(registros),
      fields: this.columnas(),
      regConfig: [
        { type: 'date', name: 'fechaHora', label: 'Fecha y hora de la marcación' },
        {
          type: 'autocomplete',
          name: 'tipo',
          label: 'Tipo de marcación',
          autocompleteType: 1,
          rubroAlterno: RubrosRrh.TIPO_MARCACION,
          selectField: ['descripcion'],
        },
        {
          type: 'autocomplete',
          name: 'origen',
          label: 'Origen',
          autocompleteType: 1,
          rubroAlterno: RubrosRrh.ORIGEN_MARCACION,
          selectField: ['descripcion'],
        },
        {
          type: 'input',
          name: 'observacion',
          label: 'Observación',
          inputType: 'text',
          validations: [
            {
              name: 'required',
              validator: Validators.required,
              message: 'Toda marcación manual necesita una observación que la justifique',
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
      onBeforeSave: (datos: any) => ({
        ...datos,
        empleado: { codigo: this.empleadoSeleccionado() },
        // El tipo y el origen son el código alterno del rubro: `MRCCTPOO` y `MRCCORGN` son
        // `NUMBER` desde el delta 11 y `Long` en la entidad desde la recompilación
        tipo: extraerCodigo(datos.tipo),
        origen: extraerCodigo(datos.origen),
        usuarioRegistro: usuarioSesion(),
      }),
      onDataUpdate: (data: Marcaciones[]) => {
        this.marcaciones.set(data ?? []);
        return this.formatear(data ?? []);
      },
    };
  }

  /**
   * La columna "Consolidada" solo aparece cuando `MRCCPRCS` viaja de verdad. Sin el mapeo diría
   * "No" en todas las filas, que es una respuesta inventada y no un dato.
   */
  private columnas(): any[] {
    if (!CAMPOS_ASISTENCIA_PERSISTEN) {
      return [
        { column: 'fechaHora', header: 'Fecha y hora', fWidth: '28%', fType: 1 },
        { column: 'tipoLabel', header: 'Tipo', fWidth: '22%' },
        { column: 'origenLabel', header: 'Origen', fWidth: '22%' },
        { column: 'observacion', header: 'Observación', fWidth: '28%' },
      ];
    }

    return [
      { column: 'fechaHora', header: 'Fecha y hora', fWidth: '26%', fType: 1 },
      { column: 'tipoLabel', header: 'Tipo', fWidth: '20%' },
      { column: 'origenLabel', header: 'Origen', fWidth: '20%' },
      { column: 'observacion', header: 'Observación', fWidth: '22%' },
      { column: 'procesadoLabel', header: 'Consolidada', fWidth: '12%', fAlign: 'aC' },
    ];
  }

  private formatear(registros: Marcaciones[]): any[] {
    return registros.map((row) => ({
      ...row,
      tipoLabel: descripcionRubro(this.detalleRubroService, RubrosRrh.TIPO_MARCACION, row.tipo),
      origenLabel: descripcionRubro(
        this.detalleRubroService,
        RubrosRrh.ORIGEN_MARCACION,
        row.origen,
      ),
      procesadoLabel: row.procesado === 'S' ? 'Sí' : 'No',
    }));
  }

  etiquetaEmpleado(empleado: Empleado): string {
    return `${empleado.identificacion} — ${empleado.apellidos ?? ''} ${empleado.nombres ?? ''}`.trim();
  }

  irAResumen(): void {
    this.router.navigate(['/menurecursoshumanos/asistencia/resumen-diario']);
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
