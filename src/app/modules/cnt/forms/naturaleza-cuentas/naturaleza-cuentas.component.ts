import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { FieldConfig } from '../../../../shared/basics/table/dynamic-form/model/field.interface';
import { ConfirmDialogComponent } from '../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { TableBasicHijosComponent } from '../../../../shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component';
import { FieldFormat } from '../../../../shared/basics/table/model/field-format-interface';
import { TableConfig } from '../../../../shared/basics/table/model/table-interface';
import { ColumnaTipo } from '../../../../shared/basics/table/model/fields-constants';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubro } from '../../../../shared/model/detalle-rubro';
import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { ExportService } from '../../../../shared/services/export.service';
import { EntidadesContabilidad } from '../../model/entidades-cnt';
import { NaturalezaCuenta } from '../../model/naturaleza-cuenta';
import { NaturalezaCuentaService } from '../../service/naturaleza-cuenta.service';

// 🔑 Rubro para filtrar tipos de naturaleza (el valor seleccionado se almacena en el campo 'tipo' del formulario)
const RUBRO_TIPO_GRUPO = 12;
const RUBRO_ESTADO = 11;

@Component({
  selector: 'app-naturalezadecuentas',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    TableBasicHijosComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './naturaleza-cuentas.component.html',
  styleUrls: ['./naturaleza-cuentas.component.scss'],
})
export class NaturalezaDeCuentasComponent implements OnInit {
  naturalezaCuentas: NaturalezaCuenta[] = [];
  loading = false;
  error: string | null = null;
  totalElements = 0;

  tableConfig!: TableConfig;

  tipoNaturaleza: DetalleRubro[] = [];

  constructor(
    private naturalezaCuentaService: NaturalezaCuentaService,
    private detalleRubroService: DetalleRubroService,
    private exportService: ExportService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (this.detalleRubroService.estanDatosCargados()) {
      this.tipoNaturaleza = this.detalleRubroService.getDetallesByParent(RUBRO_TIPO_GRUPO);
      this.loadData();
    } else {
      this.detalleRubroService.getAll().subscribe({
        next: (rubros) => {
          this.tipoNaturaleza = this.detalleRubroService.getDetallesByParent(RUBRO_TIPO_GRUPO);
          this.loadData();
        },
        error: (err) => {
          this.loadData();
        },
      });
    }
  }

  private setupTableConfig(): void {
    this.tableConfig = {
      entidad: EntidadesContabilidad.NATURALEZA_CUENTA,
      titulo: 'Naturaleza de Cuentas',
      registros: this.naturalezaCuentas,
      fields: this.getFields(),
      regConfig: this.getRegConfig(),
      add: true,
      edit: true,
      remove: true,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08',
    };
  }

  private getFields(): FieldFormat[] {
    return [
      { column: 'numero', header: 'Número', fWidth: '15%', fSort: true },
      { column: 'nombre', header: 'Nombre', fWidth: '35%', fSort: true },
      { column: 'r_12_tipo', header: 'Tipo', fWidth: '20%', fSort: true },
      { column: 'manejaCentroCosto', header: 'Maneja Centro Costos', fWidth: '20%', fSort: true, fType: ColumnaTipo.CHECK },
      { column: 'Rr_11_estado', header: 'Estado', fWidth: '10%', fSort: true},
    ];
  }

  private getRegConfig(): FieldConfig[] {
    // Transformar DetalleRubro a formato de opciones para el select
    // El valor seleccionado (codigoAlterno) se almacenará en el campo 'tipo'
    const tiposOptions = this.tipoNaturaleza.map((detalle) => ({
      key: detalle.codigoAlterno,
      value: detalle.descripcion,
    }));

    const config: FieldConfig[] = [
      {
        type: 'input' as const,
        label: 'Nombre',
        name: 'nombre',
        inputType: 'text',
        transformToUppercase: true,
        validations: [
          { name: 'required', validator: Validators.required, message: 'El nombre es requerido' },
          { name: 'minlength', validator: Validators.minLength(3), message: 'Mínimo 3 caracteres' },
          {
            name: 'maxlength',
            validator: Validators.maxLength(100),
            message: 'Máximo 100 caracteres',
          },
        ],
      },
      {
        type: 'autocomplete' as const,
        label: 'Tipo de Naturaleza',
        name: 'tipo',
        collections: this.tipoNaturaleza,
        autocompleteType: 1,
        rubroAlterno: RUBRO_TIPO_GRUPO,
        selectField: ['descripcion'],
        validations: [
          { name: 'required', validator: Validators.required, message: 'El tipo es requerido' },
        ],
      },
      {
        type: 'input' as const,
        label: 'Número de Cuenta',
        name: 'numero',
        inputType: 'text',
        validations: [
          { name: 'required', validator: Validators.required, message: 'El número es requerido' },
          {
            name: 'pattern',
            validator: Validators.pattern(/^[0-9]+$/),
            message: 'Solo números permitidos',
          },
        ],
      },
      {
        type: 'checkbox' as const,
        label: 'Maneja Centro de Costo',
        name: 'manejaCentroCosto',
        value: 0, // Valor por defecto numérico
      },
    ];

    return config;
  }

  // ⚠️ Debe ser público para que el template pueda llamarlo
  public loadData(): void {
    this.loading = true;
    this.error = null;

    const idSucursal = parseInt(localStorage.getItem('idSucursal') || '280', 10);

    // Crear criterios usando el patrón DatosBusqueda
    const criterioConsultaArray: Array<DatosBusqueda> = [];

    // Filtro por empresa (código dinámico)
    const criterioEmpresa = new DatosBusqueda();
    criterioEmpresa.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empresa',
      'codigo',
      String(idSucursal),
      TipoComandosBusqueda.IGUAL
    );
    criterioConsultaArray.push(criterioEmpresa);

    // Ordenar por nombre
    const criterioOrden = new DatosBusqueda();
    criterioOrden.orderBy('nombre');
    criterioConsultaArray.push(criterioOrden);

    this.naturalezaCuentaService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : (data as any)?.data ?? [];

        this.naturalezaCuentas = list.sort((a: any, b: any) => (a.numero || 0) - (b.numero || 0));

        this.totalElements = this.naturalezaCuentas.length;
        this.loading = false;
        this.setupTableConfig();
      },
      error: (err) => {
        // Fallback a getAll() si falla el filtro
        this.naturalezaCuentaService.getAll().subscribe({
          next: (data) => {
            const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
            const filtered = list.filter((nat: any) => nat?.empresa?.codigo === idSucursal);

            this.naturalezaCuentas = filtered.sort((a: any, b: any) => (a.numero || 0) - (b.numero || 0));

            this.totalElements = this.naturalezaCuentas.length;
            this.loading = false;
            this.setupTableConfig();
          },
          error: () => {
            this.error = 'Error al recuperar datos de naturaleza de cuentas';
            this.loading = false;
          },
        });
      },
    });
  }

  // Métodos de exportación
  public exportToCSV(): void {
    const headers = ['Número', 'Nombre', 'Tipo de Naturaleza', 'Centro de Costos', 'Estado'];
    const dataKeys = ['numero', 'nombre', 'tipo', 'manejaCentroCosto', 'estado'];
    const filename = `naturaleza-cuentas-${new Date().toISOString().split('T')[0]}`;

    this.exportService.exportToCSV(this.naturalezaCuentas, filename, headers, dataKeys);
  }

  public exportToPDF(): void {
    const headers = ['Número', 'Nombre', 'Tipo', 'C. Costos', 'Estado'];
    const dataKeys = ['numero', 'nombre', 'tipo', 'manejaCentroCosto', 'estado'];
    const filename = `naturaleza-cuentas-${new Date().toISOString().split('T')[0]}`;
    const title = 'Reporte de Naturaleza de Cuentas';

    // Transformar los datos para el PDF con labels formateados
    const transformedData = this.naturalezaCuentas.map((item) => ({
      numero: item.numero || '',
      nombre: item.nombre || '',
      tipo: this.tipoLabel(item.tipo),
      manejaCentroCosto: this.manejaCentroCostoLabel(item.manejaCentroCosto),
      estado: this.estadoLabel(item.estado),
    }));

    this.exportService.exportToPDF(transformedData, filename, title, headers, dataKeys);
  }

  // Helpers de formato para exportación
  private tipoLabel(valor: any): string {
    return this.detalleRubroService.getDescripcionByParentAndAlterno(RUBRO_TIPO_GRUPO, valor) || String(valor ?? '');
  }

  private manejaCentroCostoLabel(valor: any): string {
    if (valor === 1 || valor === true || String(valor).toUpperCase() === '1') return 'Sí';
    return 'No';
  }

  private estadoLabel(valor: any): string {
    return Number(valor) === 1 ? 'Activo' : 'Inactivo';
  }

  /**
   * Maneja los errores emitidos por el componente table-basic-hijos
   * y los muestra en un snackbar al usuario solo si son errores reales (400+)
   */
  onTableError(errorData: { mensaje: string; codigoHttp?: number }): void {
    // Solo mostrar snackbar si es un error real (código 400 o superior)
    // Los códigos 200-299 se manejan en onOperacionCompletada
    if (errorData.codigoHttp && errorData.codigoHttp >= 400) {
      this.snackBar.open(errorData.mensaje, 'Cerrar', {
        duration: 8000,
        panelClass: ['error-snackbar'],
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    }
  }

  onOperacionCompletada(evento: any): void {
    // Manejo especial para operación de DELETE (operacion === 3) con código 200
    if (evento.operacion === 3 && evento.exitoso && evento.codigoHttp === 200) {
      // Mostrar diálogo de confirmación directamente (sin snackbar previo)
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '450px',
        data: {
          title: 'Confirmación de Inactivación',
          message: evento.resultado + '\n\n¿Desea inactivar la naturaleza y todas sus cuentas?',
          confirmText: 'Aceptar',
          cancelText: 'Cancelar',
          type: 'warning'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // Aquí se implementará la lógica de inactivación en el futuro
        }
      });
    } else if (!evento.exitoso || (evento.codigoHttp && evento.codigoHttp >= 400)) {
      // Solo mostrar snackbar para errores reales (códigos 400+)
      const mensaje = evento.resultado || 'Error al procesar la operación';

      this.snackBar.open(mensaje, 'Cerrar', {
        duration: 8000,
        panelClass: ['error-snackbar'],
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    }
    // Si es exitoso con código 200-299 y no es delete, no hacer nada (sin snackbar)
  }
}

