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
import { TablaImpuestoRenta } from '../../../model/tabla-impuesto-renta';
import { TablaImpuestoRentaService } from '../../../service/tabla-impuesto-renta.service';
import {
  aniosDisponibles,
  filtrarPorAnio,
  criteriosPorEmpresa,
  extraerCodigo,
  OPCIONES_ESTADO,
  referenciaEmpresa,
} from '../utiles-parametrizacion';
import { verificarCoherencia } from './coherencia-tramos';
import { opcionesAviso } from '../../comunes/avisos';

/**
 * Tabla del impuesto a la renta por año y tramo (RHH.TBIR).
 *
 * Maestro-detalle por año: arriba el ejercicio, abajo sus tramos. El panel de coherencia
 * comprueba que el impuesto sobre la fracción básica de cada tramo sea el acumulado del anterior
 * más su excedente por el porcentaje; un descuadre ahí produce retenciones mal calculadas todo
 * el ejercicio.
 */
@Component({
  selector: 'app-tabla-impuesto-renta',
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
  templateUrl: './tabla-impuesto-renta.component.html',
  styleUrls: ['./tabla-impuesto-renta.component.scss'],
})
export class TablaImpuestoRentaComponent implements OnInit {
  anios = aniosDisponibles();
  anio = signal<number>(new Date().getFullYear());
  tramos = signal<TablaImpuestoRenta[]>([]);
  tableConfig?: TableConfig;

  inconsistencias = computed(() => verificarCoherencia(this.tramos()));

  constructor(
    private tablaService: TablaImpuestoRentaService,
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
    this.tablaService.selectByCriteria(criteriosPorEmpresa('orden')).subscribe({
      next: (data) => this.construirTabla(filtrarPorAnio(data, this.anio())),
      error: () => {
        this.avisar('No se pudo cargar la tabla del impuesto a la renta');
        this.construirTabla([]);
      },
    });
  }

  private construirTabla(registros: TablaImpuestoRenta[]): void {
    this.tramos.set(registros);

    this.tableConfig = {
      entidad: EntidadesRrh.TABLA_IMPUESTO_RENTA,
      titulo: `Tramos del ejercicio ${this.anio()}`,
      registros,
      fields: [
        { column: 'orden', header: 'Tramo', fWidth: '10%', fAlign: 'aC' },
        { column: 'fraccionBasica', header: 'Fracción básica', fWidth: '22%', fAlign: 'aR' },
        { column: 'excesoHasta', header: 'Exceso hasta', fWidth: '22%', fAlign: 'aR' },
        {
          column: 'impuestoFraccionBasica',
          header: 'Impuesto fracción básica',
          fWidth: '24%',
          fAlign: 'aR',
        },
        { column: 'porcentaje', header: '% excedente', fWidth: '16%', fAlign: 'aR' },
      ],
      regConfig: [
        {
          type: 'input',
          name: 'orden',
          label: 'Orden del tramo',
          inputType: 'number',
          validations: [
            { name: 'required', validator: Validators.required, message: 'El orden es requerido' },
          ],
        },
        {
          type: 'input',
          name: 'fraccionBasica',
          label: 'Fracción básica',
          inputType: 'number',
          validations: [
            {
              name: 'required',
              validator: Validators.required,
              message: 'La fracción básica es requerida',
            },
          ],
        },
        {
          type: 'input',
          name: 'excesoHasta',
          label: 'Exceso hasta (vacío en el último tramo)',
          inputType: 'number',
        },
        {
          type: 'input',
          name: 'impuestoFraccionBasica',
          label: 'Impuesto sobre la fracción básica',
          inputType: 'number',
          validations: [
            {
              name: 'required',
              validator: Validators.required,
              message: 'El impuesto sobre la fracción básica es requerido',
            },
          ],
        },
        {
          type: 'input',
          name: 'porcentaje',
          label: '% sobre la fracción excedente',
          inputType: 'number',
          validations: [
            {
              name: 'required',
              validator: Validators.required,
              message: 'El porcentaje es requerido',
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
      onDataUpdate: (data: TablaImpuestoRenta[]) => {
        const delAnio = filtrarPorAnio(data, this.anio());
        this.tramos.set(delAnio);
        return delAnio;
      },
    };
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
