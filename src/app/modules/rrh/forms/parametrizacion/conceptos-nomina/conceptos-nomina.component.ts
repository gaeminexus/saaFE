import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PlanCuenta } from '../../../../cnt/model/plan-cuenta';
import { PlanCuentaService } from '../../../../cnt/service/plan-cuenta.service';
import { TableBasicHijosComponent } from '../../../../../shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component';
import { TableConfig } from '../../../../../shared/basics/table/model/table-interface';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { empresaSesionCodigo } from '../../../../../shared/services/empresa-sesion';
import { ExportService } from '../../../../../shared/services/export.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { ConceptoNomina } from '../../../model/concepto-nomina';
import { EntidadesRrh } from '../../../model/entidades-rrh';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { ConceptoNominaService } from '../../../service/concepto-nomina.service';
import {
  criteriosPorEmpresa,
  etiquetaEstado,
  etiquetaSiNo,
  extraerCodigo,
  OPCIONES_ESTADO,
  OPCIONES_SI_NO,
  referenciaEmpresa,
} from '../utiles-parametrizacion';
import { camposConceptoNomina } from './conceptos-nomina.campos';
import { opcionesAviso } from '../../comunes/avisos';

/**
 * Catálogo de conceptos de nómina (RHH.CPNM).
 *
 * Cada ingreso, descuento, aporte patronal y provisión del rol es una fila de esta tabla; el
 * motor de cálculo se dirige por ella y no por código. Las banderas de imponibilidad y de base
 * determinan en qué acumulados entra cada concepto.
 */
@Component({
  selector: 'app-conceptos-nomina',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, TableBasicHijosComponent],
  templateUrl: './conceptos-nomina.component.html',
  styleUrls: ['./conceptos-nomina.component.scss'],
})
export class ConceptosNominaComponent implements OnInit {
  tableConfig?: TableConfig;
  exportData = signal<ConceptoNomina[]>([]);
  cargando = signal<boolean>(true);

  private planCuentas: PlanCuenta[] = [];

  constructor(
    private conceptoService: ConceptoNominaService,
    private planCuentaService: PlanCuentaService,
    private detalleRubroService: DetalleRubroService,
    private exportService: ExportService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarPlanCuentas();
  }

  /** El combo de cuenta contable busca por número y por nombre, según la regla de combos. */
  private cargarPlanCuentas(): void {
    const empresa = empresaSesionCodigo();
    if (empresa === null) {
      this.cargarConceptos();
      return;
    }

    this.planCuentaService.getByEmpresa(empresa).subscribe({
      next: (data) => {
        this.planCuentas = data ?? [];
        this.cargarConceptos();
      },
      error: () => this.cargarConceptos(),
    });
  }

  private cargarConceptos(): void {
    this.cargando.set(true);
    this.conceptoService.selectByCriteria(criteriosPorEmpresa('orden')).subscribe({
      next: (data) => this.construirTabla(data ?? []),
      error: (err) => {
        this.onTableError({ mensaje: this.mensajeDeError(err) });
        this.construirTabla([]);
      },
    });
  }

  private construirTabla(registros: ConceptoNomina[]): void {
    this.exportData.set(registros);
    this.cargando.set(false);

    this.tableConfig = {
      entidad: EntidadesRrh.CONCEPTO_NOMINA,
      titulo: 'Conceptos de nómina',
      registros: this.formatear(registros),
      fields: [
        { column: 'codigoAlterno', header: 'Código', fWidth: '7%', fAlign: 'aC' },
        { column: 'nombre', header: 'Concepto', fWidth: '22%' },
        { column: 'rolMotorLabel', header: 'Rol motor', fWidth: '17%' },
        { column: 'tipoConceptoLabel', header: 'Tipo', fWidth: '13%' },
        { column: 'tipoCalculoLabel', header: 'Cálculo', fWidth: '15%' },
        { column: 'imponibleIessLabel', header: 'Imp. IESS', fWidth: '8%', fAlign: 'aC' },
        { column: 'imponibleIrLabel', header: 'Grav. IR', fWidth: '8%', fAlign: 'aC' },
        { column: 'estadoLabel', header: 'Estado', fWidth: '10%' },
      ],
      regConfig: camposConceptoNomina({
        planCuentas: this.planCuentas,
        opcionesSiNo: OPCIONES_SI_NO,
        opcionesEstado: OPCIONES_ESTADO,
        validadorRequerido: Validators.required,
      }),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08',
      onBeforeSave: (datos: any) => this.prepararGuardado(datos),
      onDataUpdate: (data: ConceptoNomina[]) => {
        this.exportData.set(data ?? []);
        return this.formatear(data ?? []);
      },
    };
  }

  /** Traduce los rubros y las banderas a texto para las columnas de la tabla. */
  private formatear(registros: ConceptoNomina[]): any[] {
    return registros.map((row) => ({
      ...row,
      rolMotorLabel: this.descripcionRubro(RubrosRrh.ROL_MOTOR_CONCEPTO, row.rolMotor),
      tipoConceptoLabel: this.descripcionRubro(RubrosRrh.TIPO_CONCEPTO_NOMINA, row.tipoConcepto),
      tipoCalculoLabel: this.descripcionRubro(RubrosRrh.TIPO_CALCULO_CONCEPTO, row.tipoCalculo),
      imponibleIessLabel: etiquetaSiNo(row.imponibleIess),
      imponibleIrLabel: etiquetaSiNo(row.imponibleIr),
      estadoLabel: etiquetaEstado(row.estado),
    }));
  }

  private descripcionRubro(rubro: number, valor: number | null): string {
    if (valor === null || valor === undefined) return '—';
    return this.detalleRubroService.getDescripcionByParentAndAlterno(rubro, valor) || '—';
  }

  private prepararGuardado(datos: any): any {
    const rubros = [
      'rolMotor',
      'tipoConcepto',
      'tipoCalculo',
      'baseCalculo',
      'tipoRelacionLaboral',
      'estado',
    ];
    const preparado: any = { ...datos, empresa: referenciaEmpresa(), usuarioRegistro: usuarioSesion() };

    for (const campo of rubros) {
      preparado[campo] = extraerCodigo(datos[campo]);
    }
    for (const bandera of Object.keys(datos).filter((k) => k.startsWith('base') || k.startsWith('imponible'))) {
      preparado[bandera] = extraerCodigo(datos[bandera]);
    }
    for (const bandera of ['aportaFondosReserva', 'patronal', 'provision', 'obligatorio', 'recortable']) {
      preparado[bandera] = extraerCodigo(datos[bandera]);
    }

    const cuenta = extraerCodigo(datos.planCuenta);
    preparado.planCuenta = cuenta === null ? null : { codigo: cuenta };

    return preparado;
  }

  onTableError(errorData: { mensaje: string; codigoHttp?: number }): void {
    const exito =
      errorData.codigoHttp != null && errorData.codigoHttp >= 200 && errorData.codigoHttp < 300;
    this.snackBar.open(errorData.mensaje, 'Cerrar', {
      ...opcionesAviso(!exito, errorData.mensaje),
    });
  }

  exportarCsv(): void {
    const { encabezados, claves, datos } = this.datosExportables();
    this.exportService.exportToCSV(datos, 'conceptos-nomina', encabezados, claves);
  }

  exportarPdf(): void {
    const { encabezados, claves, datos } = this.datosExportables();
    this.exportService.exportToPDF(
      datos,
      'conceptos-nomina',
      'Conceptos de nómina',
      encabezados,
      claves,
    );
  }

  private datosExportables() {
    return {
      encabezados: [
        'Código',
        'Concepto',
        'Rol motor',
        'Tipo',
        'Cálculo',
        'Imp. IESS',
        'Grav. IR',
        'Estado',
      ],
      claves: [
        'codigoAlterno',
        'nombre',
        'rolMotorLabel',
        'tipoConceptoLabel',
        'tipoCalculoLabel',
        'imponibleIessLabel',
        'imponibleIrLabel',
        'estadoLabel',
      ],
      datos: this.formatear(this.exportData()),
    };
  }

  private mensajeDeError(error: any): string {
    if (typeof error === 'string') return error;
    return error?.message || 'No se pudieron cargar los conceptos de nómina';
  }
}
