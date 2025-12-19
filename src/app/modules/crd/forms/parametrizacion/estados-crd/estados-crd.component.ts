import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { TableBasicHijosComponent } from '../../../../../shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component';
import { TableConfig } from '../../../../../shared/basics/table/model/table-interface';
import { FieldConfig } from '../../../../../shared/basics/table/dynamic-form/model/field.interface';
import { FieldFormat } from '../../../../../shared/basics/table/model/field-format-interface';
import { EntidadesCrd } from '../../../model/entidades-crd';
import { EstadosData } from '../../../resolver/estados-resolver.service';
import { EstadoParticipe } from '../../../model/estado-participe';
import { EstadoPrestamo } from '../../../model/estado-prestamo';
import { EstadoCesantia } from '../../../model/estado-cesantia';
import { EstadoCivil } from '../../../model/estado-civil';
import { Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-estados-crd.component',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    TableBasicHijosComponent
  ],
  templateUrl: './estados-crd.component.html',
  styleUrl: './estados-crd.component.scss'
})
export class EstadosCrdComponent implements OnInit {

  // Datos cargados por el resolver
  estadosParticipe: EstadoParticipe[] = [];
  estadosPrestamo: EstadoPrestamo[] = [];
  estadosCesantia: EstadoCesantia[] = [];
  estadosCivil: EstadoCivil[] = [];

  // Configuraciones de tabla para cada entidad
  tableConfigParticipe!: TableConfig;
  tableConfigPrestamo!: TableConfig;
  tableConfigCesantia!: TableConfig;
  tableConfigCivil!: TableConfig;

  // Índice del tab seleccionado
  selectedTabIndex: number = 0;

  // Lista de estados para el header navegable
  estadosEntidades = [
    { nombre: 'Estado Partícipe', icono: 'person', index: 0 },
    { nombre: 'Estado Préstamo', icono: 'account_balance_wallet', index: 1 },
    { nombre: 'Estado Cesantía', icono: 'assignment', index: 2 },
    { nombre: 'Estado Civil', icono: 'family_restroom', index: 3 }
  ];

  constructor(
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) { }

  // Método para navegar al tab correspondiente
  navigateToTab(index: number): void {
    this.selectedTabIndex = index;
  }

  ngOnInit(): void {
    // Obtener datos del resolver
    const data = this.route.snapshot.data['estados'] as EstadosData;
    this.estadosParticipe = data.estadosParticipe || [];
    this.estadosPrestamo = data.estadosPrestamo || [];
    this.estadosCesantia = data.estadosCesantia || [];
    this.estadosCivil = data.estadosCivil || [];

    // Configurar tablas
    this.setupTableConfigs();
  }

  private setupTableConfigs(): void {
    // Estados Partícipe
    this.tableConfigParticipe = {
      entidad: EntidadesCrd.ESTADO_PARTICIPE,
      titulo: 'Estados Partícipe',
      registros: this.estadosParticipe,
      fields: this.getFieldsParticipe(),
      regConfig: this.getRegConfigParticipe(),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };

    // Estados Préstamo
    this.tableConfigPrestamo = {
      entidad: EntidadesCrd.ESTADO_PRESTAMO,
      titulo: 'Estados Préstamo',
      registros: this.estadosPrestamo,
      fields: this.getFieldsPrestamo(),
      regConfig: this.getRegConfigPrestamo(),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };

    // Estados Cesantía
    this.tableConfigCesantia = {
      entidad: EntidadesCrd.ESTADO_CESANTIA,
      titulo: 'Estados Cesantía',
      registros: this.estadosCesantia,
      fields: this.getFieldsCesantia(),
      regConfig: this.getRegConfigCesantia(),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };

    // Estados Civil
    this.tableConfigCivil = {
      entidad: EntidadesCrd.ESTADO_CIVIL,
      titulo: 'Estados Civil',
      registros: this.estadosCivil,
      fields: this.getFieldsCivil(),
      regConfig: this.getRegConfigCivil(),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };
  }

  // ========== Estados Partícipe ==========
  private getFieldsParticipe(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '60%' },
      { column: 'codigoExterno', header: 'Código Externo', fWidth: '40%' },
    ];
  }

  private getRegConfigParticipe(): FieldConfig[] {
    return [
      {
        type: 'input',
        label: 'Nombre',
        name: 'nombre',
        inputType: 'text',
        validations: [
          { name: 'required', validator: Validators.required, message: 'El nombre es requerido' },
          { name: 'maxlength', validator: Validators.maxLength(100), message: 'Máximo 100 caracteres' }
        ]
      },
      {
        type: 'input',
        label: 'Código Externo',
        name: 'codigoExterno',
        inputType: 'number',
        validations: [
          { name: 'required', validator: Validators.required, message: 'El código externo es requerido' }
        ]
      }
    ];
  }

  // ========== Estados Préstamo ==========
  private getFieldsPrestamo(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '60%' },
      { column: 'codigoExterno', header: 'Código Externo', fWidth: '40%' },
    ];
  }

  private getRegConfigPrestamo(): FieldConfig[] {
    return [
      {
        type: 'input',
        label: 'Nombre',
        name: 'nombre',
        inputType: 'text',
        validations: [
          { name: 'required', validator: Validators.required, message: 'El nombre es requerido' },
          { name: 'maxlength', validator: Validators.maxLength(100), message: 'Máximo 100 caracteres' }
        ]
      },
      {
        type: 'input',
        label: 'Código Externo',
        name: 'codigoExterno',
        inputType: 'number',
        validations: [
          { name: 'required', validator: Validators.required, message: 'El código externo es requerido' }
        ]
      }
    ];
  }

  // ========== Estados Cesantía ==========
  private getFieldsCesantia(): FieldFormat[] {
    return [
      { column: 'descripcion', header: 'Descripción', fWidth: '100%' },
    ];
  }

  private getRegConfigCesantia(): FieldConfig[] {
    return [
      {
        type: 'input',
        label: 'Descripción',
        name: 'descripcion',
        inputType: 'text',
        validations: [
          { name: 'required', validator: Validators.required, message: 'La descripción es requerida' },
          { name: 'maxlength', validator: Validators.maxLength(200), message: 'Máximo 200 caracteres' }
        ]
      }
    ];
  }

  // ========== Estados Civil ==========
  private getFieldsCivil(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '60%' },
      { column: 'codigoAuxiliar', header: 'Código Auxiliar', fWidth: '40%' },
    ];
  }

  private getRegConfigCivil(): FieldConfig[] {
    return [
      {
        type: 'input',
        label: 'Nombre',
        name: 'nombre',
        inputType: 'text',
        validations: [
          { name: 'required', validator: Validators.required, message: 'El nombre es requerido' },
          { name: 'maxlength', validator: Validators.maxLength(100), message: 'Máximo 100 caracteres' }
        ]
      },
      {
        type: 'input',
        label: 'Código Auxiliar',
        name: 'codigoAuxiliar',
        inputType: 'number',
        validations: [
          { name: 'required', validator: Validators.required, message: 'El código auxiliar es requerido' }
        ]
      }
    ];
  }

  /**
   * Maneja los errores emitidos por el componente table-basic-hijos
   * y los muestra en un snackbar al usuario con color según el código HTTP
   */
  onTableError(errorData: { mensaje: string; codigoHttp?: number }): void {
    const esExito = errorData.codigoHttp && errorData.codigoHttp >= 200 && errorData.codigoHttp < 300;
    const panelClass = esExito ? 'success-snackbar' : 'error-snackbar';

    this.snackBar.open(errorData.mensaje, 'Cerrar', {
      duration: esExito ? 4000 : 8000,
      panelClass: [panelClass],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
}
