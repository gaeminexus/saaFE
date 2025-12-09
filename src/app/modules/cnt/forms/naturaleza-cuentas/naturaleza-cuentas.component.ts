import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { FieldConfig } from '../../../../shared/basics/table/dynamic-form/model/field.interface';
import { TableBasicHijosComponent } from '../../../../shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component';
import { FieldFormat } from '../../../../shared/basics/table/model/field-format-interface';
import { TableConfig } from '../../../../shared/basics/table/model/table-interface';
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

@Component({
  selector: 'app-naturalezadecuentas',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
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
    private exportService: ExportService
  ) {}

  ngOnInit(): void {
    // Debug: Verificar detalles de rubro cargados
    if (this.detalleRubroService.estanDatosCargados()) {
      this.tipoNaturaleza = this.detalleRubroService.getDetallesByParent(RUBRO_TIPO_GRUPO);
      console.log('📦 Tipos de naturaleza cargados:', this.tipoNaturaleza);
      console.log('📦 Cantidad de tipos:', this.tipoNaturaleza.length);
    } else {
      console.warn(
        '⚠️ DetalleRubroService no está cargado. Los tipos de naturaleza no estarán disponibles.'
      );
      console.warn('⚠️ Verifica que AppStateService.inicializarApp() se ejecute en el login.');
      // Intentar cargar después
      setTimeout(() => {
        if (this.detalleRubroService.estanDatosCargados()) {
          this.tipoNaturaleza = this.detalleRubroService.getDetallesByParent(RUBRO_TIPO_GRUPO);
          console.log('📦 Tipos de naturaleza cargados (retry):', this.tipoNaturaleza);
          // Reconfigurar tabla con datos actualizados
          if (this.naturalezaCuentas.length > 0) {
            this.setupTableConfig();
          }
        }
      }, 1000);
    }

    this.loadData();
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
      remove: false,
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
      { column: 'tipoFormateado', header: 'Tipo', fWidth: '20%', fSort: true },
      { column: 'centroCostoFormateado', header: 'Centro de Costos', fWidth: '20%', fSort: true },
      { column: 'estadoFormateado', header: 'Estado', fWidth: '10%', fSort: true },
    ];
  }

  private getRegConfig(): FieldConfig[] {
    console.log('🔧 getRegConfig() - tipoNaturaleza:', this.tipoNaturaleza);

    // Transformar DetalleRubro a formato de opciones para el select
    // El valor seleccionado (codigoAlterno) se almacenará en el campo 'tipo'
    const tiposOptions = this.tipoNaturaleza.map((detalle) => ({
      key: detalle.codigoAlterno,
      value: detalle.descripcion,
    }));

    console.log(`✅ Opciones transformadas para select:`, tiposOptions);

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
        value: false,
      },
    ];

    console.log('📋 Configuración final de campos del formulario:', config);
    return config;
  }

  // ⚠️ Debe ser público para que el template pueda llamarlo
  public loadData(): void {
    this.loading = true;
    this.error = null;

    const idSucursal = parseInt(localStorage.getItem('idSucursal') || '280', 10);
    console.log(`🔍 Iniciando carga de naturalezas de cuenta para empresa ${idSucursal}...`);

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
        console.log(`📡 Respuesta del backend para naturalezas empresa ${idSucursal}:`, data);
        const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
        console.log(`📋 Lista de naturalezas procesada para empresa ${idSucursal}:`, list);

        // Transformar datos numéricos a texto legible para el grid
        this.naturalezaCuentas = list
          .map((item: any) => ({
            ...item,
            tipoFormateado: this.tipoLabel(item.tipo),
            centroCostoFormateado: this.manejaCentroCostoLabel(item.manejaCentroCosto),
            estadoFormateado: this.estadoLabel(item.estado),
          }))
          .sort((a: any, b: any) => (b.numero || 0) - (a.numero || 0));

        this.totalElements = this.naturalezaCuentas.length;
        this.loading = false;

        // Configurar la tabla con los datos cargados
        this.setupTableConfig();

        console.log(
          `✅ Se cargaron ${list.length} naturalezas para empresa ${idSucursal} exitosamente`
        );
      },
      error: (err) => {
        console.error(`❌ Error al cargar naturalezas con empresa ${idSucursal}:`, err);

        // Fallback a getAll() si falla el filtro
        console.log('🔄 Probando getAll como fallback...');
        this.naturalezaCuentaService.getAll().subscribe({
          next: (data) => {
            console.log('📡 Respuesta fallback getAll:', data);
            const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
            const filtered = list.filter((nat: any) => nat?.empresa?.codigo === idSucursal);

            // Transformar datos numéricos a texto legible para el grid
            this.naturalezaCuentas = filtered
              .map((item: any) => ({
                ...item,
                tipoFormateado: this.tipoLabel(item.tipo),
                centroCostoFormateado: this.manejaCentroCostoLabel(item.manejaCentroCosto),
                estadoFormateado: this.estadoLabel(item.estado),
              }))
              .sort((a: any, b: any) => (b.numero || 0) - (a.numero || 0));

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
    const filename = `naturaleza-cuentas-${new Date().toISOString().split('T')[0]}`;

    this.exportService.exportToCSV(this.naturalezaCuentas, filename, headers);
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
    const n = Number(valor);
    if (n === 1) return 'Deudora';
    if (n === 2) return 'Acreedora';
    return String(valor ?? '');
  }

  private manejaCentroCostoLabel(valor: any): string {
    if (valor === 1 || valor === true || String(valor).toUpperCase() === '1') return 'Sí';
    return 'No';
  }

  private estadoLabel(valor: any): string {
    return Number(valor) === 1 ? 'Activo' : 'Inactivo';
  }
}
