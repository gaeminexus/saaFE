import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ServiceLocatorRrhService } from '../../../../../shared/basics/service-locator/service-locator-rrh.service';
import { TableBasicHijosComponent } from '../../../../../shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component';
import { TableConfig } from '../../../../../shared/basics/table/model/table-interface';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { ConceptoNomina } from '../../../model/concepto-nomina';
import {
  CuotaDescuento,
  DescuentoRecurrente,
  ESTADOS_CUOTA,
} from '../../../model/descuento-recurrente';
import { Empleado } from '../../../model/empleado';
import { EntidadesRrh } from '../../../model/entidades-rrh';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { ConceptoNominaService } from '../../../service/concepto-nomina.service';
import { EmpleadoService } from '../../../service/empleado.service';
import { criteriosPorEmpresa, extraerCodigo } from '../../parametrizacion/utiles-parametrizacion';
import { referencia, sinAdornos } from '../../comunes/cuerpo-entidad';
import { camposCuota, camposDescuento } from './descuentos-recurrentes.campos';

/**
 * Descuentos recurrentes del colaborador (RHH.DSRC) y su tabla de amortización (RHH.CTDS).
 *
 * Aquí viven los préstamos del IESS, los anticipos, los préstamos internos y las retenciones
 * judiciales. La migración de apertura los deja cargados con su saldo pendiente, y el cálculo
 * del período recoge la cuota que vence en el mes.
 *
 * `DSRC` cuelga del empleado, no de la empresa, así que la pantalla exige elegir colaborador.
 */
@Component({
  selector: 'app-descuentos-recurrentes',
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
  templateUrl: './descuentos-recurrentes.component.html',
  styleUrls: ['./descuentos-recurrentes.component.scss'],
})
export class DescuentosRecurrentesComponent implements OnInit {
  empleados = signal<Empleado[]>([]);
  empleadoSeleccionado = signal<number | null>(null);
  descuentoSeleccionado = signal<DescuentoRecurrente | null>(null);
  configDescuentos?: TableConfig;
  configCuotas?: TableConfig;

  private conceptos: ConceptoNomina[] = [];

  constructor(
    private empleadoService: EmpleadoService,
    private conceptoService: ConceptoNominaService,
    private locatorRrh: ServiceLocatorRrhService,
    private detalleRubroService: DetalleRubroService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const sinFallo = (fuente: any) =>
      fuente.pipe(
        map((filas: any) => filas ?? []),
        catchError(() => of<any[]>([])),
      );

    forkJoin({
      empleados: sinFallo(this.empleadoService.selectByCriteria(criteriosPorEmpresa('apellidos'))),
      conceptos: sinFallo(this.conceptoService.selectByCriteria(criteriosPorEmpresa('nombre'))),
    }).subscribe((datos: any) => {
      this.empleados.set(datos.empleados);
      this.conceptos = datos.conceptos;
    });
  }

  onEmpleadoChange(codigo: number | null): void {
    this.empleadoSeleccionado.set(codigo);
    this.descuentoSeleccionado.set(null);
    this.configCuotas = undefined;
    this.locatorRrh.filtroEmpleado = codigo;

    if (codigo === null) {
      this.configDescuentos = undefined;
      return;
    }
    this.cargarDescuentos();
  }

  private cargarDescuentos(): void {
    this.locatorRrh
      .recargarValores(EntidadesRrh.DESCUENTO_RECURRENTE)
      .then((data) => this.construirTablaDescuentos(Array.isArray(data) ? data : []))
      .catch(() => {
        this.avisar('No se pudieron cargar los descuentos del colaborador');
        this.construirTablaDescuentos([]);
      });
  }

  onSeleccionDescuento(descuento: DescuentoRecurrente): void {
    this.descuentoSeleccionado.set(descuento);
    this.locatorRrh.filtroDescuento = descuento?.codigo ?? null;

    this.locatorRrh
      .recargarValores(EntidadesRrh.CUOTA_DESCUENTO)
      .then((data) => this.construirTablaCuotas(Array.isArray(data) ? data : []))
      .catch(() => {
        this.avisar('No se pudieron cargar las cuotas del descuento');
        this.construirTablaCuotas([]);
      });
  }

  private construirTablaDescuentos(registros: DescuentoRecurrente[]): void {
    this.configDescuentos = {
      entidad: EntidadesRrh.DESCUENTO_RECURRENTE,
      titulo: 'Descuentos recurrentes',
      registros: this.formatearDescuentos(registros),
      fields: [
        { column: 'tipoLabel', header: 'Tipo', fWidth: '22%' },
        { column: 'numero', header: 'Referencia', fWidth: '14%' },
        { column: 'conceptoLabel', header: 'Concepto', fWidth: '20%' },
        { column: 'valor', header: 'Monto', fWidth: '13%', fType: 2, fAlign: 'aR' },
        { column: 'saldo', header: 'Saldo', fWidth: '13%', fType: 2, fAlign: 'aR' },
        { column: 'cuotasLabel', header: 'Cuotas', fWidth: '10%', fAlign: 'aC' },
        { column: 'estadoLabel', header: 'Estado', fWidth: '12%' },
      ],
      regConfig: camposDescuento(this.conceptos),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08',
      onBeforeSave: (datos: any) => ({
        ...sinAdornos(datos),
        empleado: { codigo: this.empleadoSeleccionado() },
        conceptoNomina: referencia(datos.conceptoNomina),
        tipoDescuento: extraerCodigo(datos.tipoDescuento),
        estado: extraerCodigo(datos.estado),
        usuarioRegistro: usuarioSesion(),
      }),
      onDataUpdate: (data: DescuentoRecurrente[]) => this.formatearDescuentos(data ?? []),
    };
  }

  private construirTablaCuotas(registros: CuotaDescuento[]): void {
    const descuento = this.descuentoSeleccionado()!;

    this.configCuotas = {
      entidad: EntidadesRrh.CUOTA_DESCUENTO,
      titulo: `Cuotas de ${descuento.numero || 'la obligación'}`,
      registros: this.formatearCuotas(registros),
      fields: [
        { column: 'numeroCuota', header: 'Cuota', fWidth: '10%', fAlign: 'aC' },
        { column: 'fechaVencimiento', header: 'Vence', fWidth: '16%', fType: 1 },
        { column: 'total', header: 'Total', fWidth: '15%', fType: 2, fAlign: 'aR' },
        { column: 'valorDescontado', header: 'Descontado', fWidth: '15%', fType: 2, fAlign: 'aR' },
        { column: 'saldo', header: 'Saldo', fWidth: '15%', fType: 2, fAlign: 'aR' },
        { column: 'estadoLabel', header: 'Estado', fWidth: '15%' },
      ],
      regConfig: camposCuota(),
      add: true,
      edit: true,
      remove: true,
      paginator: true,
      filter: false,
      fSize: 'em-1',
      row_size: 's08',
      onBeforeSave: (datos: any) => ({
        ...sinAdornos(datos),
        descuentoRecurrente: { codigo: descuento.codigo },
        estado: extraerCodigo(datos.estado),
        usuarioRegistro: usuarioSesion(),
      }),
      onDataUpdate: (data: CuotaDescuento[]) => this.formatearCuotas(data ?? []),
    };
  }

  private formatearDescuentos(registros: DescuentoRecurrente[]): any[] {
    return registros.map((row) => ({
      ...row,
      tipoLabel: this.rubro(RubrosRrh.TIPO_DESCUENTO_RECURRENTE, row.tipoDescuento),
      estadoLabel: this.rubro(RubrosRrh.ESTADO_DESCUENTO_RECURRENTE, row.estado),
      conceptoLabel: (row.conceptoNomina as any)?.nombre ?? '—',
      cuotasLabel:
        row.numeroCuotas === null || row.numeroCuotas === undefined
          ? '—'
          : `${row.cuotasPagadas ?? 0} / ${row.numeroCuotas}`,
    }));
  }

  private formatearCuotas(registros: CuotaDescuento[]): any[] {
    return registros.map((row) => ({
      ...row,
      estadoLabel:
        ESTADOS_CUOTA.find((e) => e.codigo === Number(row.estado))?.descripcion ?? 'Desconocido',
    }));
  }

  private rubro(rubroAlterno: number, valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '—';
    return this.detalleRubroService.getDescripcionByParentAndAlterno(rubroAlterno, valor) || '—';
  }

  etiquetaEmpleado(empleado: Empleado): string {
    return `${empleado.identificacion} — ${empleado.apellidos ?? ''} ${empleado.nombres ?? ''}`.trim();
  }

  onTableError(errorData: { mensaje: string; codigoHttp?: number }): void {
    const exito =
      errorData.codigoHttp != null && errorData.codigoHttp >= 200 && errorData.codigoHttp < 300;
    this.snackBar.open(errorData.mensaje, 'Cerrar', {
      duration: exito ? 4000 : 8000,
      panelClass: [exito ? 'snackbar-success' : 'snackbar-error'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  private avisar(mensaje: string): void {
    this.onTableError({ mensaje });
  }
}
