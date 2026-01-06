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
import { ListadosData } from '../../../resolver/listados-crd-resolver.service';
import { MotivoPrestamo } from '../../../model/motivo-prestamo';
import { MetodoPago } from '../../../model/metodo-pago';
import { NivelEstudio } from '../../../model/nivel-estudio';
import { Profesion } from '../../../model/profesion';
import { Producto } from '../../../model/producto';
import { Filial } from '../../../model/filial';
import { TipoPrestamo } from '../../../model/tipo-prestamo';
import { FilialService } from '../../../service/filial.service';
import { TipoPrestamoService } from '../../../service/tipo-prestamo.service';
import { Validators } from '@angular/forms';
import { SelectFieldConfig } from '../../../../../shared/basics/table/dynamic-form/model/select.interface';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-listados-crd.component',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    TableBasicHijosComponent
  ],
  templateUrl: './listados-crd.component.html',
  styleUrl: './listados-crd.component.scss'
})
export class ListadosCrdComponent implements OnInit {

  // Datos cargados por el resolver
  motivosPrestamo: MotivoPrestamo[] = [];
  metodosPago: MetodoPago[] = [];
  nivelesEstudio: NivelEstudio[] = [];
  profesiones: Profesion[] = [];
  productos: Producto[] = [];

  // Datos para selects
  filiales: Filial[] = [];
  tiposPrestamo: TipoPrestamo[] = [];

  // Configuraciones de tabla para cada entidad
  tableConfigMotivoPrestamo!: TableConfig;
  tableConfigMetodoPago!: TableConfig;
  tableConfigNivelEstudio!: TableConfig;
  tableConfigProfesion!: TableConfig;
  tableConfigProducto!: TableConfig;

  // Índice del tab seleccionado
  selectedTabIndex: number = 0;

  // Lista de listados para el header navegable
  listadosEntidades = [
    { nombre: 'Motivo Préstamo', icono: 'comment', index: 0 },
    { nombre: 'Método Pago', icono: 'payment', index: 1 },
    { nombre: 'Nivel Estudio', icono: 'school', index: 2 },
    { nombre: 'Profesión', icono: 'work', index: 3 },
    { nombre: 'Productos', icono: 'category', index: 4 }
  ];

  constructor(
    private route: ActivatedRoute,
    private filialService: FilialService,
    private tipoPrestamoService: TipoPrestamoService,
    private snackBar: MatSnackBar
  ) { }

  // Método para navegar al tab correspondiente
  navigateToTab(index: number): void {
    this.selectedTabIndex = index;
  }

  ngOnInit(): void {
    // Obtener datos del resolver
    const data = this.route.snapshot.data['listados'] as ListadosData;
    this.motivosPrestamo = data.motivosPrestamo || [];
    this.metodosPago = data.metodosPago || [];
    this.nivelesEstudio = data.nivelesEstudio || [];
    this.profesiones = data.profesiones || [];
    this.productos = data.productos || [];

    // Cargar datos para los selects de Producto
    this.cargarDatosSelects();

    // Configurar tablas
    this.setupTableConfigs();
  }

  private cargarDatosSelects(): void {
    this.filialService.getAll().subscribe({
      next: (data) => this.filiales = data || [],
      error: (err) => console.error('Error al cargar filiales:', err)
    });

    this.tipoPrestamoService.getAll().subscribe({
      next: (data) => this.tiposPrestamo = data || [],
      error: (err) => console.error('Error al cargar tipos de préstamo:', err)
    });
  }

  private setupTableConfigs(): void {
    // Motivo Préstamo
    this.tableConfigMotivoPrestamo = {
      entidad: EntidadesCrd.MOTIVO_PRESTAMO,
      titulo: 'Motivos de Préstamo',
      registros: this.motivosPrestamo,
      fields: this.getFieldsMotivoPrestamo(),
      regConfig: this.getRegConfigMotivoPrestamo(),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };

    // Método Pago
    this.tableConfigMetodoPago = {
      entidad: EntidadesCrd.METODO_PAGO,
      titulo: 'Métodos de Pago',
      registros: this.metodosPago,
      fields: this.getFieldsMetodoPago(),
      regConfig: this.getRegConfigMetodoPago(),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };

    // Nivel Estudio
    this.tableConfigNivelEstudio = {
      entidad: EntidadesCrd.NIVEL_ESTUDIO,
      titulo: 'Niveles de Estudio',
      registros: this.nivelesEstudio,
      fields: this.getFieldsNivelEstudio(),
      regConfig: this.getRegConfigNivelEstudio(),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };

    // Profesión
    this.tableConfigProfesion = {
      entidad: EntidadesCrd.PROFESION,
      titulo: 'Profesiones',
      registros: this.profesiones,
      fields: this.getFieldsProfesion(),
      regConfig: this.getRegConfigProfesion(),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };

    // Producto
    this.tableConfigProducto = {
      entidad: EntidadesCrd.PRODUCTO,
      titulo: 'Productos',
      registros: this.productos,
      fields: this.getFieldsProducto(),
      regConfig: this.getRegConfigProducto(),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08'
    };
  }

  // ========== Motivo Préstamo ==========
  private getFieldsMotivoPrestamo(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '100%' },
    ];
  }

  private getRegConfigMotivoPrestamo(): FieldConfig[] {
    return [
      {
        type: 'input',
        label: 'Nombre',
        name: 'nombre',
        inputType: 'text',
        value: '',
        validations: [
          { name: 'required', validator: Validators.required, message: 'El nombre es requerido' }
        ]
      }
    ];
  }

  // ========== Método Pago ==========
  private getFieldsMetodoPago(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '60%' },
      { column: 'codigoSBS', header: 'Código SBS', fWidth: '20%' },
    ];
  }

  private getRegConfigMetodoPago(): FieldConfig[] {
    return [
      {
        type: 'input',
        label: 'Nombre',
        name: 'nombre',
        inputType: 'text',
        value: '',
        validations: [
          { name: 'required', validator: Validators.required, message: 'El nombre es requerido' }
        ]
      },
      {
        type: 'input',
        label: 'Código SBS',
        name: 'codigoSBS',
        inputType: 'text',
        value: '',
        validations: [
          { name: 'required', validator: Validators.required, message: 'El código SBS es requerido' }
        ]
      },
    ];
  }

  // ========== Nivel Estudio ==========
  private getFieldsNivelEstudio(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '100%' },
    ];
  }

  private getRegConfigNivelEstudio(): FieldConfig[] {
    return [
      {
        type: 'input',
        label: 'Nombre',
        name: 'nombre',
        inputType: 'text',
        value: '',
        validations: [
          { name: 'required', validator: Validators.required, message: 'El nombre es requerido' }
        ]
      }
    ];
  }

  // ========== Profesión ==========
  private getFieldsProfesion(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '65%' },
      { column: 'codigoSBS', header: 'Código SBS', fWidth: '20%' },
    ];
  }

  private getRegConfigProfesion(): FieldConfig[] {
    return [
      {
        type: 'input',
        label: 'Nombre',
        name: 'nombre',
        inputType: 'text',
        value: '',
        validations: [
          { name: 'required', validator: Validators.required, message: 'El nombre es requerido' }
        ]
      },
      {
        type: 'input',
        label: 'Código SBS',
        name: 'codigoSBS',
        inputType: 'text',
        value: '',
        validations: [
          { name: 'required', validator: Validators.required, message: 'El código SBS es requerido' }
        ]
      },
    ];
  }

  // ========== Producto ==========
  private getFieldsProducto(): FieldFormat[] {
    return [
      { column: 'nombre', header: 'Nombre', fWidth: '25%' },
      { column: 'codigoSBS', header: 'Código SBS', fWidth: '12%' },
      { column: 'codigoPetro', header: 'Código Petrocomercial', fWidth: '15%' },
      { column: 'filial.nombre', header: 'Filial', fWidth: '20%' },
      { column: 'tipoPrestamo.nombre', header: 'Tipo Préstamo', fWidth: '20%' },
    ];
  }

  private getRegConfigProducto(): FieldConfig[] {
    return [
      {
        type: 'input',
        label: 'Nombre',
        name: 'nombre',
        inputType: 'text',
        value: '',
        validations: [
          { name: 'required', validator: Validators.required, message: 'El nombre es requerido' }
        ]
      },
      {
        type: 'input',
        label: 'Código SBS',
        name: 'codigoSBS',
        inputType: 'text',
        value: '',
        validations: [
          { name: 'required', validator: Validators.required, message: 'El código SBS es requerido' }
        ]
      },
      {
        type: 'input',
        label: 'Código Petrocomercial',
        name: 'codigoPetro',
        inputType: 'text',
        value: '',
        validations: []
      },
      {
        type: 'select',
        label: 'Filial',
        name: 'filial',
        value: null,
        options: this.filiales,
        validations: [
          { name: 'required', validator: Validators.required, message: 'La filial es requerida' }
        ]
      } as SelectFieldConfig,
      {
        type: 'select',
        label: 'Tipo Préstamo',
        name: 'tipoPrestamo',
        value: null,
        options: this.tiposPrestamo,
        validations: [
          { name: 'required', validator: Validators.required, message: 'El tipo de préstamo es requerido' }
        ]
      } as SelectFieldConfig,
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

