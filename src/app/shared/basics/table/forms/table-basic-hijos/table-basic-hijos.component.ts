import { animate, state, style, transition, trigger } from '@angular/animations';
import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, forwardRef, Input, OnInit, OnChanges, SimpleChanges, Output, ViewChild, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorIntl } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { AccionesGrid } from '../../../constantes';
import { GetLocatorService } from '../../../service-locator/get-locator.service';
import { ServiceLocatorService } from '../../../service-locator/service-locator.service';
import { AddTableDialogComponent } from '../../dialogs/add-table/add-table-dialog.component';
import { EditTableDialogComponent } from '../../dialogs/edit-table/edit-table-dialog.component';
import { RemoveTableDialogComponent } from '../../dialogs/remove-table/remove-table-dialog.component';
import { FieldConfig } from '../../dynamic-form/model/field.interface';
import { FieldFormat } from '../../model/field-format-interface';
import { FooterOperations } from '../../model/fields-constants';
import { TableConfig } from '../../model/table-interface';
import { MaterialFormModule } from '../../../../modules/material-form.module';
import { Injectable } from '@angular/core';

// Clase para internacionalización del paginador en español
@Injectable()
export class MatPaginatorIntlEs extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Items por página:';
  override nextPageLabel = 'Siguiente';
  override previousPageLabel = 'Anterior';
  override firstPageLabel = 'Primera página';
  override lastPageLabel = 'Última página';

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) {
      return `0 de ${length}`;
    }
    length = Math.max(length, 0);
    const startIndex = page * pageSize;
    const endIndex = startIndex < length ?
      Math.min(startIndex + pageSize, length) :
      startIndex + pageSize;
    return `${startIndex + 1} - ${endIndex} de ${length}`;
  };
}

@Component({
  selector: 'app-table-basic-hijos',
  standalone: true,
  imports: [
    MaterialFormModule,
    FormsModule,
  ],
  providers: [
    { provide: MatPaginatorIntl, useClass: MatPaginatorIntlEs }
  ],
  templateUrl: './table-basic-hijos.component.html',
  styleUrl: './table-basic-hijos.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({height: '0px', minHeight: '0'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class TableBasicHijosComponent implements OnInit, OnChanges, AfterViewInit {

  @Input()
  configTable!: TableConfig;
  @Input()
  tableHijosConfig!: TableConfig[];

  @Output() emiteRegistro = new EventEmitter<any>();
  @Output() emiteButtonExtra = new EventEmitter<any>();

  textoFiltro!: string;
  fields!: FieldFormat[];
  registros!: any[];
  regConfig!: FieldConfig[];
  entidad!: number;
  hijos!: any[];
  selectedRowIndex = 0;
  existe = true;
  tootTipExtra = '';
  tamPag = 10;
  salto = 25;

  @ViewChild(MatPaginator, { static: false })
  paginator!: MatPaginator;
  @ViewChild(MatSort, { static: false })
  sort!: MatSort;

  expandedElement: any | null;

  dataSource = new MatTableDataSource();
  displayedColumnsActions: string[] = [];

  // Inyección usando inject() para evitar dependencias circulares
  public serviceLocatorService = inject(ServiceLocatorService);
  public getLocatorService = inject(GetLocatorService);
  public dialog = inject(MatDialog);
  private changeDetectorRefs = inject(ChangeDetectorRef);
  // Comentamos temporalmente para evitar dependencia circular
  // public funciones = inject(FuncionesTableService);

  constructor() { }

  shouldShowExpandedDetail = (): boolean => {
    return this.configTable?.tiene_hijos || false;
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['configTable'] && this.configTable) {

      this.fields = this.configTable.fields || [];
      this.registros = this.configTable.registros || [];
      this.regConfig = this.configTable.regConfig || [];
      this.entidad = this.configTable.entidad || 0;

      if (this.dataSource) {
        this.dataSource.data = this.registros || [];

        // Reconfigurar el sort después de actualizar los datos
        this.configurarSort();

        // Forzar actualización del paginador
        this.actualizarPaginador();
      }

      // Regenerar la configuración cuando cambien los datos
      this.generaArregloBotonesInicial();
      this.configurarPropiedadesTabla();

      // Reinicializar sort después de cambios en la configuración
      setTimeout(() => {
        this.configurarSort();
        this.actualizarPaginador();
      }, 0);
    }
  }

  configurarPropiedadesTabla(): void {
    if (!this.configTable) {
      return;
    }

    const validaPaginador = 'paginator' in this.configTable;
    if (!validaPaginador) {
      this.configTable.paginator = true;
    }

    const validaFilter = 'filter' in this.configTable;
    if (!validaFilter) {
      this.configTable.filter = true;
    }

    const validaNumPaginator = 'paginator_start' in this.configTable;
    if (!validaNumPaginator) {
      this.tamPag = 10;
    } else {
      this.tamPag = this.configTable.paginator_start || 10;
    }

    const validaPaginatorSalto = 'paginator_salto' in this.configTable;
    if (!validaPaginatorSalto) {
      this.salto = 25;
    } else {
      this.salto = this.configTable.paginator_salto || 25;
    }

    const toolTip = 'tipButtonExtra' in this.configTable;
    if (toolTip) {
      this.tootTipExtra = this.configTable.tipButtonExtra || 'Edita registro';
    } else {
      this.tootTipExtra = 'Edita registro';
    }

    this.fields.forEach(value => {
      const existeSort = 'fSort' in value;
      if (!existeSort) {
        value.fSort = true;
      }
    });

    if (this.tableHijosConfig) {
      this.hijos = this.tableHijosConfig.filter(s => s.entidad_padre === this.entidad);
    }
  }

  ngOnInit(): void {
    // Validación inicial para evitar errores cuando configTable es undefined
    if (!this.configTable) {
      this.fields = [];
      this.registros = [];
      this.regConfig = [];
      this.entidad = 0;
      this.dataSource.data = [];
      return;
    }

    this.fields = this.configTable.fields || [];
    this.registros = this.configTable.registros || [];
    this.regConfig = this.configTable.regConfig || [];
    this.entidad = this.configTable.entidad || 0;

    this.dataSource.data = this.registros;
    this.generaArregloBotonesInicial();
    this.configurarPropiedadesTabla();

  }

  generaArregloBotonesInicial(): void {
    if (!this.configTable) {
      return;
    }

    this.displayedColumnsActions = []; // Limpiar el array antes de llenarlo

    // PRIMERO: Columna de acciones unificada al inicio
    const tieneAcciones = this.configTable.edit || this.configTable.remove ||
                         this.configTable.buttonExtra || this.configTable.tiene_hijos;

    if (tieneAcciones) {
      this.displayedColumnsActions.push('acciones_unificadas');
    }

    // SEGUNDO: Las columnas de datos
    this.fields.forEach(r => {
      if (r.column) {
        this.displayedColumnsActions.push(r.column);
      }
    });
  }

  ngAfterViewInit(): void {

    // Configurar paginator
    if (this.configTable?.paginator && this.paginator) {
      this.dataSource.paginator = this.paginator;
    } else {
      this.dataSource.paginator = null;
    }

    // Configurar sort
    if (this.sort) {
      this.dataSource.sort = this.sort;

      // Configurar sortingDataAccessor para campos anidados si es necesario
      this.dataSource.sortingDataAccessor = (item: any, property: string) => {
        if (property && item) {
          // Manejo de propiedades anidadas (ej: "campo.subcampo")
          if (property.includes('.')) {
            return property.split('.').reduce((o: any, p: string) => o && o[p], item);
          }
          // Convertir a string para comparación consistente
          const value = item[property];
          return value !== null && value !== undefined ? value.toString() : '';
        }
        return '';
      };

      // Verificar que el sort tenga las columnas correctas
      setTimeout(() => {
      }, 100);
    } else {
    }

    // Forzar detección de cambios
    this.changeDetectorRefs.detectChanges();
  }  add(): void {
    const dialogRef = this.dialog.open(AddTableDialogComponent, {
          disableClose: true,
          data: {
            regConfig: this.regConfig,
            entidad: this.entidad,
            accion: AccionesGrid.ADD
          }
        });

    dialogRef.afterClosed().subscribe(result => {
      if (result){
        if (this.configTable.es_hijo && this.configTable.campo_padre) {
          result[this.configTable.campo_padre] = this.configTable.reg_padre;
        }
        this.ejecuta(AccionesGrid.ADD, result);
      }
    });
  }

  edit(registro: any): void {
    const dialogRef = this.dialog.open(EditTableDialogComponent, {
          disableClose: true,
          data: {
            regConfig: this.regConfig,
            entidad: this.entidad,
            accion: AccionesGrid.EDIT,
            registro
          }
        });

    dialogRef.afterClosed().subscribe(result => {
      if (result){
        this.ejecuta(AccionesGrid.EDIT, result);
      }
    });
  }

  delete(registro: any): void{
    const dialogRef = this.dialog.open(RemoveTableDialogComponent, {
          disableClose: true,
          data: {
            registro,
          }
        });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 1){
        this.ejecuta(AccionesGrid.REMOVE, registro.codigo);
      }
    });
  }

  async ejecuta(opcion: number, result: any): Promise<void> {
    try {
      // Ejecutar la operación principal
      await this.serviceLocatorService.ejecutaServicio(this.entidad, result, opcion);

      // Recargar datos después de la operación
      if (this.configTable.es_hijo) {
        try {
          const re = await this.getLocatorService.obtienePorPadre(
            this.entidad,
            this.configTable.reg_padre.codigo
          );
          this.asignaYRefresca(re);
        } catch (error) {
          // Opcional: mostrar mensaje al usuario
          // this.mostrarMensajeError('Error al cargar los datos relacionados');
        }
      } else {
        try {
          const re = await this.serviceLocatorService.recargarValores(this.entidad);
          this.asignaYRefresca(re);
        } catch (error) {
          // Opcional: mostrar mensaje al usuario
          // this.mostrarMensajeError('Error al recargar los datos');
        }
      }
    } catch (error) {
      // Opcional: mostrar mensaje al usuario
      // this.mostrarMensajeError('Error al procesar la operación');
    }
  }

  asignaYRefresca(regist: any): void {
    this.dataSource.data = regist;
    this.registros = regist;

    // Reconfigurar el sort después de actualizar los datos
    this.configurarSort();

    // Forzar actualización del paginador
    this.actualizarPaginador();

    this.changeDetectorRefs.detectChanges();
  }

  private actualizarPaginador(): void {
    if (this.paginator && this.dataSource) {
      // Desconectar y reconectar el paginador para forzar actualización
      const currentPage = this.paginator.pageIndex;
      this.dataSource.paginator = null;

      setTimeout(() => {
        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
          // Restaurar la página si es válida
          if (currentPage < this.paginator.getNumberOfPages()) {
            this.paginator.pageIndex = currentPage;
          } else {
            this.paginator.firstPage();
          }
        }
      }, 0);
    }
  }

  private configurarSort(): void {
    if (this.sort && this.dataSource) {
      // Desconectar el sort temporalmente
      this.dataSource.sort = null;

      // Reconectar después de un tick
      setTimeout(() => {
        if (this.sort) {
          this.dataSource.sort = this.sort;
        }
      }, 0);
    }
  }

  // tslint:disable-next-line: typedef
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  clearFilter(): void {
    this.textoFiltro = '';
    this.dataSource.filter = '';
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  recuperaDetalle(row: any): void {
    // console.log(row);
    this.hijos.forEach(val => {
      this.getLocatorService.obtienePorPadre(
        val.entidad,
        row.codigo).then(resul => {
          val.registros = resul;
          val.reg_padre = row;
          });
      });
  }

  numPuntos(cadena: string): number {
    return cadena.split('.').length;
  }

  recP(cadena: string, posicion: number): string {
    return cadena.split('.')[posicion];
  }

  numRepeticion(cadena: string, caracter: string): number {
    return cadena.split(caracter).length;
  }

  recuperaCampo(cadena: string, posicion: number, caracter: string): string {
    return cadena.split(caracter)[posicion];
  }

  // Emisores
  emitirRegistro(registro: any): void{
    this.selectedRowIndex = registro.codigo;
    this.emiteRegistro.emit(registro);
  }

  emitirButtonExtra(registro: any): void {
    this.selectedRowIndex = registro.codigo;
    this.emiteButtonExtra.emit(registro);
  }

  darFormatoFooterCell(reg: FieldFormat, index: number): string {
    let resultado = '';
    let suma = 0;
    if (reg.footer_label) {
      resultado = reg.footer_label;
    }
    if (reg.footer_operartion === FooterOperations.SUMA) {
      if (this.registros && reg.column) {
        suma = this.registros.map(t => t[reg.column!]).reduce((acc, value) => acc + value, 0);
        if (suma || suma === 0) {
          this.fields[index].footer_Sum = suma;
          resultado = this.formatoCash(suma);
        }
      }
    }
    return resultado;
  }

  // Métodos auxiliares para evitar dependencia circular con FuncionesTableService
  formatoCash(value: number): string {
    if (value === null || value === undefined) return '';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  }

  darFormatoHeader(reg: FieldFormat, fSize: string): string {
    // Implementación simplificada para el formato de header
    return fSize || 'header-default';
  }

  darFormatoColumn(reg: FieldFormat, fSize: string): string {
    // Implementación simplificada para el formato de columna
    return fSize || 'column-default';
  }

  darFormatoBotones(rowSize: string): string {
    // Implementación simplificada para el formato de botones
    return rowSize || 'button-default';
  }

  darFormatoFila(selectedRowIndex: number, codigo: number, rowSize: string, index: number): string {
    // Implementación simplificada para el formato de fila
    const baseClass = rowSize || 'row-default';
    return selectedRowIndex === codigo ? `${baseClass} selected` : baseClass;
  }

  procesaCampo(row: any, reg: FieldFormat): string {
    // Implementación simplificada para procesar campos
    if (!row || !reg?.column) {
      return '';
    }
    const value = row[reg.column];
    return value !== null && value !== undefined ? value.toString() : '';
  }

  // Método auxiliar para mostrar mensajes de error
  private mostrarMensajeError(mensaje: string): void {
    console.error(mensaje);
    // Aquí puedes implementar la lógica para mostrar el error al usuario
    // Por ejemplo, usando MatSnackBar, notificaciones toast, etc.
    // this.snackBar.open(mensaje, 'Cerrar', { duration: 5000 });
  }

}
