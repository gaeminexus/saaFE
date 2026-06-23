import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Validators } from '@angular/forms';
import { TableBasicHijosComponent } from '../../../../shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component';
import { TableConfig } from '../../../../shared/basics/table/model/table-interface';
import { EntidadesTesoreria } from '../../model/entidades-cnt';
import { BancoService } from '../../service/banco.service';
import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { ExportService } from '../../../../shared/services/export.service';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

@Component({
  selector: 'app-bancos',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    TableBasicHijosComponent,
  ],
  templateUrl: './bancos.component.html',
  styleUrls: ['./bancos.component.scss'],
})
export class BancosComponent implements OnInit {
  tableConfig!: TableConfig;

  /** Datos sin transformar, guardados por onDataUpdate para exportación. */
  exportData = signal<any[]>([]);

  constructor(
    private bancoService: BancoService,
    private detalleRubroService: DetalleRubroService,
    private exportService: ExportService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarBancos();
  }

  private getEmpresaCodigo(): number | null {
    const raw = localStorage.getItem('idEmpresa');
    return raw ? parseInt(raw, 10) : null;
  }

  private cargarBancos(): void {
    const empresaCodigo = this.getEmpresaCodigo();
    const criterios: DatosBusqueda[] = [];

    if (empresaCodigo) {
      const db = new DatosBusqueda();
      db.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'empresa',
        'codigo',
        empresaCodigo.toString(),
        TipoComandosBusqueda.IGUAL
      );
      criterios.push(db);
    }

    const orden = new DatosBusqueda();
    orden.orderBy('nombre');
    criterios.push(orden);

    this.bancoService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        this.setupTableConfig(Array.isArray(data) ? data : []);
      },
      error: () => this.setupTableConfig([]),
    });
  }

  private setupTableConfig(registros: any[] = []): void {
    this.exportData.set(registros);

    const transformed = registros.map((row) => ({
      ...row,
      conciliaLabel: row.conciliaDescuadre ? 'Sí' : 'No',
      estadoLabel:   row.estado === 1 ? 'Activo' : 'Inactivo',
    }));

    this.tableConfig = {
      entidad: EntidadesTesoreria.BANCO,
      titulo: 'Bancos',
      registros: transformed,
      fields: [
        { column: 'nombre',             header: 'Descripción',       fWidth: '30%' },
        { column: 'R_24_rubroTipoBancoH', header: 'Tipo',              fWidth: '25%' },
        { column: 'conciliaLabel',      header: 'Permite Descuadre', fWidth: '20%' },
        { column: 'estadoLabel',        header: 'Estado',            fWidth: '15%' },
      ],
      regConfig: [
        {
          type: 'input',
          label: 'Descripción',
          name: 'nombre',
          inputType: 'text',
          transformToUppercase: true,
          validations: [
            {
              name: 'required',
              validator: Validators.required,
              message: 'La descripción es requerida',
            },
          ],
        },
        {
          type: 'input',
          label: 'Sigla',
          name: 'sigla',
          inputType: 'text',
          transformToUppercase: true,
        },
        {
          type: 'autocomplete',
          label: 'Tipo de Banco',
          name: 'rubroTipoBancoH',
          rubroAlterno: 24,
          autocompleteType: 1,
        },
        {
          type: 'select',
          label: 'Concilia Descuadre',
          name: 'conciliaDescuadre',
          options: [
            { key: 1, value: 'Sí' },
            { key: 0, value: 'No' },
          ],
        },
        {
          type: 'select',
          label: 'Estado',
          name: 'estado',
          options: [
            { key: 1, value: 'Activo' },
            { key: 0, value: 'Inactivo' },
          ],
        },
      ],
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08',
      onDataUpdate: (data: any[]) => {
        this.exportData.set(data);
        return data.map((row) => ({
          ...row,
          conciliaLabel: row.conciliaDescuadre ? 'Sí' : 'No',
          estadoLabel:   row.estado === 1 ? 'Activo' : 'Inactivo',
        }));
      },
    };
  }

  onTableError(errorData: { mensaje: string; codigoHttp?: number }): void {
    const esExito =
      errorData.codigoHttp != null &&
      errorData.codigoHttp >= 200 &&
      errorData.codigoHttp < 300;
    this.snackBar.open(errorData.mensaje, 'Cerrar', {
      duration: esExito ? 4000 : 8000,
      panelClass: [esExito ? 'snackbar-success' : 'snackbar-error'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  exportToCSV(): void {
    const headers = ['Descripción', 'Tipo', 'Permite Descuadre', 'Estado'];
    const dataKeys = ['nombre', 'tipoDesc', 'conciliaLabel', 'estadoLabel'];
    const data = this.exportData().map((row) => ({
      nombre: row.nombre ?? '',
      tipoDesc: this.getTipoDesc(row),
      conciliaLabel: row.conciliaDescuadre ? 'Sí' : 'No',
      estadoLabel: row.estado === 1 ? 'Activo' : 'Inactivo',
    }));
    this.exportService.exportToCSV(data, 'bancos', headers, dataKeys);
  }

  exportToPDF(): void {
    const headers = ['Descripción', 'Tipo', 'Permite Descuadre', 'Estado'];
    const dataKeys = ['nombre', 'tipoDesc', 'conciliaLabel', 'estadoLabel'];
    const data = this.exportData().map((row) => ({
      nombre: row.nombre ?? '',
      tipoDesc: this.getTipoDesc(row),
      conciliaLabel: row.conciliaDescuadre ? 'Sí' : 'No',
      estadoLabel: row.estado === 1 ? 'Activo' : 'Inactivo',
    }));
    try {
      this.exportService.exportToPDF(data, 'bancos', 'Bancos', headers, dataKeys);
    } catch (e) {
      const w = window as any;
      if (typeof w.loadJsPDF === 'function') {
        w.loadJsPDF().then(() =>
          this.exportService.exportToPDF(data, 'bancos', 'Bancos', headers, dataKeys),
        );
      }
    }
  }

  private getTipoDesc(row: any): string {
    return this.detalleRubroService.getDescripcionByParentAndAlterno(24, row.rubroTipoBancoH) || '—';
  }
}
