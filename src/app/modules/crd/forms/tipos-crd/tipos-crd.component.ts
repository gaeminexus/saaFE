import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { TableBasicHijosComponent } from '../../../../shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component';
import { TableConfig } from '../../../../shared/basics/table/model/table-interface';
import { FieldConfig } from '../../../../shared/basics/table/dynamic-form/model/field.interface';
import { FieldFormat } from '../../../../shared/basics/table/model/field-format-interface';
import { EntidadesCrd } from '../../model/entidades-crd';
import { TiposData } from '../../resolver/tipos-crd-resolver.service';
import { TipoContrato } from '../../model/tipo-contrato';
import { TipoParticipe } from '../../model/tipo-participe';
import { TipoPrestamo } from '../../model/tipo-prestamo';
import { TipoRequisitoPrestamo } from '../../model/tipo-requisito-prestamo';
import { TipoCesantia } from '../../model/tipo-cesantia';
import { TipoCalificacionCredito } from '../../model/tipo-calificacion-credito';
import { TipoAporte } from '../../model/tipo-aporte';
import { TipoAdjunto } from '../../model/tipo-adjunto';
import { TipoGenero } from '../../model/tipo-genero';
import { TipoHidrocarburifica } from '../../model/tipo-hidrocarburifica';
import { TipoIdentificacion } from '../../model/tipo-identificacion';
import { TipoVivienda } from '../../model/tipo-vivienda';
import { Validators } from '@angular/forms';

@Component({
  selector: 'app-tipos-crd.component',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    TableBasicHijosComponent
  ],
  templateUrl: './tipos-crd.component.html',
  styleUrl: './tipos-crd.component.scss'
})
export class TiposCrdComponent implements OnInit {

  // Datos cargados por el resolver
  tiposContrato: TipoContrato[] = [];
  tiposParticipe: TipoParticipe[] = [];
  tiposPrestamo: TipoPrestamo[] = [];
  tiposRequisitoPrestamo: TipoRequisitoPrestamo[] = [];
  tiposCesantia: TipoCesantia[] = [];
  tiposCalificacionCredito: TipoCalificacionCredito[] = [];
  tiposAporte: TipoAporte[] = [];
  tiposAdjunto: TipoAdjunto[] = [];
  tiposGenero: TipoGenero[] = [];
  tiposHidrocarburifica: TipoHidrocarburifica[] = [];
  tiposIdentificacion: TipoIdentificacion[] = [];
  tiposVivienda: TipoVivienda[] = [];

  // Configuraciones de tabla para cada entidad
  tableConfigContrato!: TableConfig;
  tableConfigParticipe!: TableConfig;
  tableConfigPrestamo!: TableConfig;
  tableConfigRequisitoPrestamo!: TableConfig;
  tableConfigCesantia!: TableConfig;
  tableConfigCalificacionCredito!: TableConfig;
  tableConfigAporte!: TableConfig;
  tableConfigAdjunto!: TableConfig;
  tableConfigGenero!: TableConfig;
  tableConfigHidrocarburifica!: TableConfig;
  tableConfigIdentificacion!: TableConfig;
  tableConfigVivienda!: TableConfig;

  // Índice del tab seleccionado
  selectedTabIndex: number = 0;

  // Lista de tipos para el header navegable
  tiposEntidades = [
    { nombre: 'Tipo Contrato', icono: 'description', index: 0 },
    { nombre: 'Tipo Partícipe', icono: 'person', index: 1 },
    { nombre: 'Tipo Préstamo', icono: 'account_balance_wallet', index: 2 },
    { nombre: 'Tipo Requisito', icono: 'checklist', index: 3 },
    { nombre: 'Tipo Cesantía', icono: 'work_off', index: 4 },
    { nombre: 'Tipo Calificación', icono: 'star_rate', index: 5 },
    { nombre: 'Tipo Aporte', icono: 'payments', index: 6 },
    { nombre: 'Tipo Adjunto', icono: 'attach_file', index: 7 },
    { nombre: 'Tipo Género', icono: 'wc', index: 8 },
    { nombre: 'Tipo Hidrocarburo', icono: 'local_gas_station', index: 9 },
    { nombre: 'Tipo Identificación', icono: 'badge', index: 10 },
    { nombre: 'Tipo Vivienda', icono: 'home', index: 11 }
  ];

  constructor(private route: ActivatedRoute) { }

  // Método para navegar al tab correspondiente
  navigateToTab(index: number): void {
    this.selectedTabIndex = index;
  }

  ngOnInit(): void {
    // Obtener datos del resolver
    const data = this.route.snapshot.data['tipos'] as TiposData;
    this.tiposContrato = data.tiposContrato || [];
    this.tiposParticipe = data.tiposParticipe || [];
    this.tiposPrestamo = data.tiposPrestamo || [];
    this.tiposRequisitoPrestamo = data.tiposRequisitoPrestamo || [];
    this.tiposCesantia = data.tiposCesantia || [];
    this.tiposCalificacionCredito = data.tiposCalificacionCredito || [];
    this.tiposAporte = data.tiposAporte || [];
    this.tiposAdjunto = data.tiposAdjunto || [];
    this.tiposGenero = data.tiposGenero || [];
    this.tiposHidrocarburifica = data.tiposHidrocarburifica || [];
    this.tiposIdentificacion = data.tiposIdentificacion || [];
    this.tiposVivienda = data.tiposVivienda || [];

    // Configurar tablas
    this.setupTableConfigs();
  }

  private setupTableConfigs(): void {
    // Tipo Contrato
    this.tableConfigContrato = {
      entidad: EntidadesCrd.TIPO_CONTRATO,
      titulo: 'Tipos de Contrato',
      registros: this.tiposContrato,
      fields: this.getFieldsContrato(),
      regConfig: this.getRegConfigContrato(),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };

    // Tipo Partícipe
    this.tableConfigParticipe = {
      entidad: EntidadesCrd.TIPO_PARTICIPE,
      titulo: 'Tipos de Partícipe',
      registros: this.tiposParticipe,
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

    // Tipo Préstamo
    this.tableConfigPrestamo = {
      entidad: EntidadesCrd.TIPO_PRESTAMO,
      titulo: 'Tipos de Préstamo',
      registros: this.tiposPrestamo,
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

    // Tipo Requisito Préstamo
    this.tableConfigRequisitoPrestamo = {
      entidad: EntidadesCrd.TIPO_REQUISITO_PRESTAMO,
      titulo: 'Tipos de Requisito de Préstamo',
      registros: this.tiposRequisitoPrestamo,
      fields: this.getFieldsRequisitoPrestamo(),
      regConfig: this.getRegConfigRequisitoPrestamo(),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };

    // Tipo Cesantía
    this.tableConfigCesantia = {
      entidad: EntidadesCrd.TIPO_CESANTIA,
      titulo: 'Tipos de Cesantía',
      registros: this.tiposCesantia,
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

    // Tipo Calificación Crédito
    this.tableConfigCalificacionCredito = {
      entidad: EntidadesCrd.TIPO_CALIFICACION_CREDITO,
      titulo: 'Tipos de Calificación de Crédito',
      registros: this.tiposCalificacionCredito,
      fields: this.getFieldsCalificacionCredito(),
      regConfig: this.getRegConfigCalificacionCredito(),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };

    // Tipo Aporte
    this.tableConfigAporte = {
      entidad: EntidadesCrd.TIPO_APORTE,
      titulo: 'Tipos de Aporte',
      registros: this.tiposAporte,
      fields: this.getFieldsAporte(),
      regConfig: this.getRegConfigAporte(),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };

    // Tipo Adjunto
    this.tableConfigAdjunto = {
      entidad: EntidadesCrd.TIPO_ADJUNTO,
      titulo: 'Tipos de Adjunto',
      registros: this.tiposAdjunto,
      fields: this.getFieldsAdjunto(),
      regConfig: this.getRegConfigAdjunto(),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };

    // Tipo Género
    this.tableConfigGenero = {
      entidad: EntidadesCrd.TIPO_GENERO,
      titulo: 'Tipos de Género',
      registros: this.tiposGenero,
      fields: this.getFieldsGenero(),
      regConfig: this.getRegConfigGenero(),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };

    // Tipo Hidrocarburífica
    this.tableConfigHidrocarburifica = {
      entidad: EntidadesCrd.TIPO_HIDROCARBURIFICA,
      titulo: 'Tipos Hidrocarburífica',
      registros: this.tiposHidrocarburifica,
      fields: this.getFieldsHidrocarburifica(),
      regConfig: this.getRegConfigHidrocarburifica(),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };

    // Tipo Identificación
    this.tableConfigIdentificacion = {
      entidad: EntidadesCrd.TIPO_IDENTIFICACION,
      titulo: 'Tipos de Identificación',
      registros: this.tiposIdentificacion,
      fields: this.getFieldsIdentificacion(),
      regConfig: this.getRegConfigIdentificacion(),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };

    // Tipo Vivienda
    this.tableConfigVivienda = {
      entidad: EntidadesCrd.TIPO_VIVIENDA,
      titulo: 'Tipos de Vivienda',
      registros: this.tiposVivienda,
      fields: this.getFieldsVivienda(),
      regConfig: this.getRegConfigVivienda(),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };
  }

  // ========== Tipo Contrato ==========
  private getFieldsContrato(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '70%' },
      { column: 'codigoSbs', header: 'Código SBS', fWidth: '30%' },
    ];
  }

  private getRegConfigContrato(): FieldConfig[] {
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
        label: 'Código SBS',
        name: 'codigoSbs',
        inputType: 'text',
        validations: [
          { name: 'required', validator: Validators.required, message: 'El código SBS es requerido' },
          { name: 'maxlength', validator: Validators.maxLength(10), message: 'Máximo 10 caracteres' }
        ]
      }
    ];
  }

  // ========== Tipo Partícipe ==========
  private getFieldsParticipe(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '70%' },
      { column: 'codigoSuperBancos', header: 'Código SBS', fWidth: '30%' },
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
        label: 'Código Super Bancos',
        name: 'codigoSuperBancos',
        inputType: 'text',
        validations: [
          { name: 'required', validator: Validators.required, message: 'El código es requerido' },
          { name: 'maxlength', validator: Validators.maxLength(10), message: 'Máximo 10 caracteres' }
        ]
      }
    ];
  }

  // ========== Tipo Préstamo ==========
  private getFieldsPrestamo(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '100%' },
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
      }
    ];
  }

  // ========== Tipo Requisito Préstamo ==========
  private getFieldsRequisitoPrestamo(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '70%' },
      { column: 'valor', header: 'Valor', fWidth: '30%' },
    ];
  }

  private getRegConfigRequisitoPrestamo(): FieldConfig[] {
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
        label: 'Valor',
        name: 'valor',
        inputType: 'number',
        validations: [
          { name: 'required', validator: Validators.required, message: 'El valor es requerido' }
        ]
      }
    ];
  }

  // ========== Tipo Cesantía ==========
  private getFieldsCesantia(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '100%' },
    ];
  }

  private getRegConfigCesantia(): FieldConfig[] {
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
      }
    ];
  }

  // ========== Tipo Calificación Crédito ==========
  private getFieldsCalificacionCredito(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '100%' },
    ];
  }

  private getRegConfigCalificacionCredito(): FieldConfig[] {
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
      }
    ];
  }

  // ========== Tipo Aporte ==========
  private getFieldsAporte(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '100%' },
    ];
  }

  private getRegConfigAporte(): FieldConfig[] {
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
      }
    ];
  }

  // ========== Tipo Adjunto ==========
  private getFieldsAdjunto(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '100%' },
    ];
  }

  private getRegConfigAdjunto(): FieldConfig[] {
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
      }
    ];
  }

  // ========== Tipo Género ==========
  private getFieldsGenero(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '100%' },
    ];
  }

  private getRegConfigGenero(): FieldConfig[] {
    return [
      {
        type: 'input',
        label: 'Nombre',
        name: 'nombre',
        inputType: 'text',
        validations: [
          { name: 'required', validator: Validators.required, message: 'El nombre es requerido' },
          { name: 'maxlength', validator: Validators.maxLength(50), message: 'Máximo 50 caracteres' }
        ]
      }
    ];
  }

  // ========== Tipo Hidrocarburífica ==========
  private getFieldsHidrocarburifica(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '100%' },
    ];
  }

  private getRegConfigHidrocarburifica(): FieldConfig[] {
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
      }
    ];
  }

  // ========== Tipo Identificación ==========
  private getFieldsIdentificacion(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '100%' },
    ];
  }

  private getRegConfigIdentificacion(): FieldConfig[] {
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
      }
    ];
  }

  // ========== Tipo Vivienda ==========
  private getFieldsVivienda(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '100%' },
    ];
  }

  private getRegConfigVivienda(): FieldConfig[] {
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
      }
    ];
  }
}
