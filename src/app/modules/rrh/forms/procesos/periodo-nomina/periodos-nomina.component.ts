import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { TableBasicHijosComponent } from '../../../../../shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component';
import { TableConfig } from '../../../../../shared/basics/table/model/table-interface';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { EntidadesRrh } from '../../../model/entidades-rrh';
import { EstadoPeriodo } from '../../../model/estados-nomina';
import { PeriodoNomina } from '../../../model/periodo-nomina';
import { RubrosRrh } from '../../../model/rubros-rrh';
import {
  aniosDisponibles,
  filtrarPorAnio,
  criteriosPorEmpresa,
  extraerCodigo,
  referenciaEmpresa,
} from '../../parametrizacion/utiles-parametrizacion';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import { registrarEjercicios } from '../../comunes/ejercicios';

/**
 * Listado de períodos de nómina por ejercicio. Es la entrada al panel del período, donde vive
 * todo el proceso.
 *
 * El alta se hace aquí porque es un formulario corto —año, mes, tipo, modo y fechas—; en cuanto
 * el período existe, se trabaja desde su panel.
 */
@Component({
  selector: 'app-periodos-nomina',
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
  templateUrl: './periodos-nomina.component.html',
  styleUrls: ['./periodos-nomina.component.scss'],
})
export class PeriodosNominaComponent implements OnInit {
  anios = aniosDisponibles();
  anio = signal<number>(new Date().getFullYear());
  tableConfig?: TableConfig;

  constructor(
    private periodoService: PeriodoNominaService,
    private detalleRubroService: DetalleRubroService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  onAnioChange(anio: number): void {
    this.anio.set(anio);
    this.cargar();
  }

  private cargar(): void {
    this.periodoService.selectByCriteria(criteriosPorEmpresa('mes')).subscribe({
      next: (data) => {
        // El piso de los selectores de ejercicio sale de aquí: el período más antiguo
        registrarEjercicios(data ?? []);
        this.anios = aniosDisponibles();
        this.construirTabla(filtrarPorAnio(data, this.anio()));
      },
      error: () => {
        this.avisar('No se pudieron cargar los períodos de nómina');
        this.construirTabla([]);
      },
    });
  }

  private construirTabla(registros: PeriodoNomina[]): void {
    this.tableConfig = {
      entidad: EntidadesRrh.PERIODO_NOMINA,
      titulo: `Períodos de ${this.anio()}`,
      registros: this.formatear(registros),
      fields: [
        // El código es lo que piden todas las consultas de verificación (NMNA, ACMN, NVNM) y no
        // es deducible: en producción los períodos son 1, 2, 21, 41. Sin esta columna sólo se
        // podía leer del último segmento de la URL.
        { column: 'codigo', header: 'Nº', fWidth: '7%', fAlign: 'aC' },
        { column: 'mes', header: 'Mes', fWidth: '8%', fAlign: 'aC' },
        { column: 'tipoLabel', header: 'Tipo', fWidth: '16%' },
        { column: 'estadoLabel', header: 'Estado', fWidth: '16%' },
        { column: 'modoLabel', header: 'Modo', fWidth: '20%' },
        { column: 'numeroEmpleados', header: 'Colab.', fWidth: '10%', fAlign: 'aC' },
        { column: 'totalNeto', header: 'Neto', fWidth: '16%', fType: 2, fAlign: 'aR' },
      ],
      regConfig: [
        {
          type: 'input',
          // El ejercicio no es un campo del diálogo: sale del selector de la cabecera, que el
          // propio diálogo tapa mientras se teclea. Va en la etiqueta del mes para que el año
          // esté a la vista justo donde se decide.
          name: 'mes',
          label: `Mes (1 a 12) del ejercicio ${this.anio()}`,
          inputType: 'number',
          validations: [
            { name: 'required', validator: Validators.required, message: 'El mes es requerido' },
          ],
        },
        // Las dos fechas son obligatorias a propósito. El datepicker deja el control **vacío**
        // cuando el texto no parsea —ya no lo rellena con la fecha de hoy—, así que sin este
        // `required` una fecha mal tecleada viajaría como nulo sin que nada lo frene. Y el
        // patrón va en la etiqueta porque el control no lo dice por ningún otro sitio.
        {
          type: 'date',
          name: 'fechaInicio',
          label: 'Fecha de inicio (dd/mm/aaaa)',
          validations: [
            {
              name: 'required',
              validator: Validators.required,
              message: 'La fecha de inicio es requerida, en formato dd/mm/aaaa',
            },
          ],
        },
        {
          type: 'date',
          name: 'fechaFin',
          label: 'Fecha de fin (dd/mm/aaaa)',
          validations: [
            {
              name: 'required',
              validator: Validators.required,
              message: 'La fecha de fin es requerida, en formato dd/mm/aaaa',
            },
          ],
        },
        {
          type: 'autocomplete',
          name: 'tipoPeriodo',
          label: 'Tipo de período',
          autocompleteType: 1,
          rubroAlterno: RubrosRrh.TIPO_PERIODO_NOMINA,
          selectField: ['descripcion'],
        },
        {
          type: 'autocomplete',
          name: 'modo',
          label: 'Modo (histórico o productivo)',
          autocompleteType: 1,
          rubroAlterno: RubrosRrh.MODO_PERIODO_NOMINA,
          selectField: ['descripcion'],
        },
        { type: 'input', name: 'observaciones', label: 'Observaciones', inputType: 'text' },
      ],
      add: true,
      edit: true,
      remove: false,
      paginator: false,
      filter: false,
      fSize: 'em-1',
      row_size: 's08',
      onBeforeSave: (datos: any) => ({
        ...datos,
        empresa: referenciaEmpresa(),
        anio: this.anio(),
        // Un período nace abierto; de ahí en adelante lo mueven los procesos, no el usuario
        estado: datos.codigo ? datos.estado : EstadoPeriodo.ABIERTO,
        tipoPeriodo: extraerCodigo(datos.tipoPeriodo),
        modo: extraerCodigo(datos.modo),
        usuarioRegistro: usuarioSesion(),
      }),
      onDataUpdate: (data: PeriodoNomina[]) => this.formatear(filtrarPorAnio(data, this.anio())),
    };
  }

  private formatear(registros: PeriodoNomina[]): any[] {
    return registros.map((row) => ({
      ...row,
      estadoLabel: this.rubro(RubrosRrh.ESTADO_PERIODO_NOMINA, row.estado),
      modoLabel: this.rubro(RubrosRrh.MODO_PERIODO_NOMINA, row.modo),
      tipoLabel: this.rubro(RubrosRrh.TIPO_PERIODO_NOMINA, row.tipoPeriodo),
    }));
  }

  private rubro(rubroAlterno: number, valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '—';
    return this.detalleRubroService.getDescripcionByParentAndAlterno(rubroAlterno, valor) || '—';
  }

  abrirPanel(periodo: PeriodoNomina): void {
    if (!periodo?.codigo) return;
    this.router.navigate(['/menurecursoshumanos/procesos/periodos-nomina', periodo.codigo]);
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
