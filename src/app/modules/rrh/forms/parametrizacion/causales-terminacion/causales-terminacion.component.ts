import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TableBasicHijosComponent } from '../../../../../shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component';
import { TableConfig } from '../../../../../shared/basics/table/model/table-interface';
import { ExportService } from '../../../../../shared/services/export.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { CausalTerminacion } from '../../../model/causal-terminacion';
import { EntidadesRrh } from '../../../model/entidades-rrh';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { CausalTerminacionService } from '../../../service/causal-terminacion.service';
import {
  criteriosPorEmpresa,
  etiquetaEstado,
  etiquetaSiNo,
  extraerCodigo,
  OPCIONES_ESTADO,
  OPCIONES_SI_NO,
  referenciaEmpresa,
} from '../utiles-parametrizacion';
import { opcionesAviso } from '../../comunes/avisos';

/** Banderas de efecto de la causal: determinan qué rubros entran en el finiquito. */
const BANDERAS = [
  { name: 'generaDesahucio', label: 'Genera bonificación por desahucio', valor: 'N' },
  { name: 'generaDespido', label: 'Genera indemnización por despido', valor: 'N' },
  { name: 'pagaVacacionesProporcionales', label: 'Paga vacaciones proporcionales', valor: 'S' },
  { name: 'pagaDecimosProporcionales', label: 'Paga décimos proporcionales', valor: 'S' },
  { name: 'generaJubilacionPatronal', label: 'Genera jubilación patronal', valor: 'N' },
  { name: 'requiereAvisoSalida', label: 'Requiere aviso de salida al IESS', valor: 'S' },
  { name: 'requiereActaSut', label: 'Requiere acta de finiquito en el SUT', valor: 'S' },
];

/**
 * Causales de terminación laboral (RHH.CSTR).
 *
 * El cálculo de la liquidación se dirige por estas banderas, nunca por el nombre de la causal.
 */
@Component({
  selector: 'app-causales-terminacion',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, TableBasicHijosComponent],
  templateUrl: './causales-terminacion.component.html',
  styleUrls: ['./causales-terminacion.component.scss'],
})
export class CausalesTerminacionComponent implements OnInit {
  tableConfig?: TableConfig;
  exportData = signal<CausalTerminacion[]>([]);

  constructor(
    private causalService: CausalTerminacionService,
    private exportService: ExportService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.causalService.selectByCriteria(criteriosPorEmpresa('nombre')).subscribe({
      next: (data) => this.construirTabla(data ?? []),
      error: () => {
        this.onTableError({ mensaje: 'No se pudieron cargar las causales de terminación' });
        this.construirTabla([]);
      },
    });
  }

  private construirTabla(registros: CausalTerminacion[]): void {
    this.exportData.set(registros);

    this.tableConfig = {
      entidad: EntidadesRrh.CAUSAL_TERMINACION,
      titulo: 'Causales de terminación',
      registros: this.formatear(registros),
      fields: [
        { column: 'nombre', header: 'Causal', fWidth: '30%' },
        { column: 'articulo', header: 'Artículo CT', fWidth: '14%' },
        { column: 'desahucioLabel', header: 'Desahucio', fWidth: '12%', fAlign: 'aC' },
        { column: 'despidoLabel', header: 'Despido', fWidth: '12%', fAlign: 'aC' },
        { column: 'jubilacionLabel', header: 'Jub. patronal', fWidth: '14%', fAlign: 'aC' },
        { column: 'estadoLabel', header: 'Estado', fWidth: '12%' },
      ],
      regConfig: [
        {
          type: 'input',
          name: 'nombre',
          label: 'Causal',
          inputType: 'text',
          transformToUppercase: true,
          validations: [
            {
              name: 'required',
              validator: Validators.required,
              message: 'El nombre de la causal es requerido',
            },
          ],
        },
        {
          type: 'autocomplete',
          name: 'codigoAlterno',
          label: 'Causal tipificada',
          autocompleteType: 1,
          rubroAlterno: RubrosRrh.CAUSAL_TERMINACION,
          selectField: ['descripcion'],
        },
        {
          type: 'input',
          name: 'articulo',
          label: 'Artículo del Código del Trabajo',
          inputType: 'text',
        },
        ...BANDERAS.map((b) => ({
          type: 'select' as const,
          name: b.name,
          label: b.label,
          value: b.valor,
          autocompleteType: 1,
          selectField: ['descripcion'],
          collections: OPCIONES_SI_NO,
        })),
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
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08',
      onBeforeSave: (datos: any) => {
        const preparado: any = {
          ...datos,
          empresa: referenciaEmpresa(),
          usuarioRegistro: usuarioSesion(),
          codigoAlterno: extraerCodigo(datos.codigoAlterno),
          estado: extraerCodigo(datos.estado),
        };
        for (const b of BANDERAS) preparado[b.name] = extraerCodigo(datos[b.name]);
        return preparado;
      },
      onDataUpdate: (data: CausalTerminacion[]) => {
        this.exportData.set(data ?? []);
        return this.formatear(data ?? []);
      },
    };
  }

  private formatear(registros: CausalTerminacion[]): any[] {
    return registros.map((row) => ({
      ...row,
      desahucioLabel: etiquetaSiNo(row.generaDesahucio),
      despidoLabel: etiquetaSiNo(row.generaDespido),
      jubilacionLabel: etiquetaSiNo(row.generaJubilacionPatronal),
      estadoLabel: etiquetaEstado(row.estado),
    }));
  }

  onTableError(errorData: { mensaje: string; codigoHttp?: number }): void {
    const exito =
      errorData.codigoHttp != null && errorData.codigoHttp >= 200 && errorData.codigoHttp < 300;
    this.snackBar.open(errorData.mensaje, 'Cerrar', {
      ...opcionesAviso(!exito, errorData.mensaje),
    });
  }

  exportarCsv(): void {
    this.exportService.exportToCSV(
      this.formatear(this.exportData()),
      'causales-terminacion',
      ['Causal', 'Artículo CT', 'Desahucio', 'Despido', 'Jub. patronal', 'Estado'],
      ['nombre', 'articulo', 'desahucioLabel', 'despidoLabel', 'jubilacionLabel', 'estadoLabel'],
    );
  }
}
