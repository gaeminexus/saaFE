import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TableBasicHijosComponent } from '../../../../../shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component';
import { TableConfig } from '../../../../../shared/basics/table/model/table-interface';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { EntidadesRrh } from '../../../model/entidades-rrh';
import { ParametroNomina } from '../../../model/parametro-nomina';
import { TopeGastoPersonal } from '../../../model/tope-gasto-personal';
import { ParametroNominaService } from '../../../service/parametro-nomina.service';
import { TopeGastoPersonalService } from '../../../service/tope-gasto-personal.service';
import {
  aniosDisponibles,
  filtrarPorAnio,
  criteriosPorEmpresa,
  extraerCodigo,
  OPCIONES_ESTADO,
  referenciaEmpresa,
} from '../utiles-parametrizacion';

/**
 * Topes de gastos personales deducibles según cargas familiares (RHH.TPGP).
 *
 * El tope se guarda en número de canastas básicas; el importe en dólares y la rebaja del
 * impuesto se derivan de la canasta y del porcentaje del año en RHH.PRNM, y se muestran
 * calculados para que el usuario vea el efecto de lo que está parametrizando.
 */
@Component({
  selector: 'app-topes-gastos-personales',
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
  templateUrl: './topes-gastos-personales.component.html',
  styleUrls: ['./topes-gastos-personales.component.scss'],
})
export class TopesGastosPersonalesComponent implements OnInit {
  anios = aniosDisponibles();
  anio = signal<number>(new Date().getFullYear());
  parametro = signal<ParametroNomina | null>(null);
  tableConfig?: TableConfig;

  canasta = computed(() => Number(this.parametro()?.canastaBasica ?? 0));
  porcentajeRebaja = computed(() => Number(this.parametro()?.porcentajeGastosPersonales ?? 0));
  faltaParametro = computed(() => this.canasta() <= 0);

  constructor(
    private topeService: TopeGastoPersonalService,
    private parametroService: ParametroNominaService,
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
    this.cargarParametro();

    this.topeService.selectByCriteria(criteriosPorEmpresa('numeroCargas')).subscribe({
      next: (data) => this.construirTabla(filtrarPorAnio(data, this.anio())),
      error: () => {
        this.avisar('No se pudieron cargar los topes de gastos personales');
        this.construirTabla([]);
      },
    });
  }

  /** La canasta y el porcentaje de rebaja del año viven en RHH.PRNM, no aquí. */
  private cargarParametro(): void {
    this.parametroService.selectByCriteria(criteriosPorEmpresa()).subscribe({
      next: (data) => {
        const delAnio = filtrarPorAnio(data, this.anio());
        this.parametro.set(delAnio.length > 0 ? delAnio[0] : null);
      },
      error: () => this.parametro.set(null),
    });
  }

  private construirTabla(registros: TopeGastoPersonal[]): void {
    this.tableConfig = {
      entidad: EntidadesRrh.TOPE_GASTO_PERSONAL,
      titulo: `Topes del ejercicio ${this.anio()}`,
      registros: this.formatear(registros),
      fields: [
        { column: 'numeroCargas', header: 'Cargas familiares', fWidth: '22%', fAlign: 'aC' },
        { column: 'numeroCanastas', header: 'Canastas', fWidth: '18%', fAlign: 'aR' },
        { column: 'topeCalculado', header: 'Tope de gasto (USD)', fWidth: '30%', fAlign: 'aR' },
        { column: 'rebajaCalculada', header: 'Rebaja máxima (USD)', fWidth: '30%', fAlign: 'aR' },
      ],
      regConfig: [
        {
          type: 'input',
          name: 'numeroCargas',
          label: 'Número de cargas familiares',
          inputType: 'number',
          validations: [
            {
              name: 'required',
              validator: Validators.required,
              message: 'El número de cargas es requerido',
            },
          ],
        },
        {
          type: 'input',
          name: 'numeroCanastas',
          label: 'Número de canastas básicas',
          inputType: 'number',
          validations: [
            {
              name: 'required',
              validator: Validators.required,
              message: 'El número de canastas es requerido',
            },
          ],
        },
        {
          type: 'select',
          name: 'estado',
          label: 'Estado',
          value: 1,
          autocompleteType: 1,
          selectField: ['descripcion'],
          collections: OPCIONES_ESTADO,
        },
      ],
      add: true,
      edit: true,
      remove: true,
      paginator: false,
      filter: false,
      fSize: 'em-1',
      row_size: 's08',
      onBeforeSave: (datos: any) => ({
        ...datos,
        empresa: referenciaEmpresa(),
        anio: this.anio(),
        estado: extraerCodigo(datos.estado),
        usuarioRegistro: usuarioSesion(),
      }),
      onDataUpdate: (data: TopeGastoPersonal[]) => this.formatear(filtrarPorAnio(data, this.anio())),
    };
  }

  private formatear(registros: TopeGastoPersonal[]): any[] {
    const canasta = this.canasta();
    const porcentaje = this.porcentajeRebaja();

    return registros.map((row) => {
      const tope = Number(row.numeroCanastas ?? 0) * canasta;
      return {
        ...row,
        topeCalculado: canasta > 0 ? tope.toFixed(2) : '—',
        rebajaCalculada: canasta > 0 ? ((tope * porcentaje) / 100).toFixed(2) : '—',
      };
    });
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
