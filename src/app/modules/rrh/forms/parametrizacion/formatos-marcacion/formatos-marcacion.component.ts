import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ServiceLocatorRrhService } from '../../../../../shared/basics/service-locator/service-locator-rrh.service';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TableBasicHijosComponent } from '../../../../../shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component';
import { TableConfig } from '../../../../../shared/basics/table/model/table-interface';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { EntidadesRrh } from '../../../model/entidades-rrh';
import { DetalleFormatoMarcacion, FormatoMarcacion } from '../../../model/formato-marcacion';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { DetalleFormatoMarcacionService } from '../../../service/detalle-formato-marcacion.service';
import { FormatoMarcacionService } from '../../../service/formato-marcacion.service';
import {
  criteriosPorEmpresa,
  etiquetaEstado,
  etiquetaSiNo,
  extraerCodigo,
  OPCIONES_ESTADO,
  OPCIONES_SI_NO,
  referenciaEmpresa,
} from '../utiles-parametrizacion';
import { camposDetalleFormato, camposFormato } from './formatos-marcacion.campos';
import { opcionesAviso } from '../../comunes/avisos';

/**
 * Formatos del archivo del reloj biométrico (RHH.FMRC) y su mapeo campo a campo (RHH.DFMR).
 *
 * Maestro-detalle: al seleccionar un formato se cargan sus campos. Esta parametrización es la
 * que permite que el importador de marcaciones no quede atado a una marca de equipo.
 */
@Component({
  selector: 'app-formatos-marcacion',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, TableBasicHijosComponent],
  templateUrl: './formatos-marcacion.component.html',
  styleUrls: ['./formatos-marcacion.component.scss'],
})
export class FormatosMarcacionComponent implements OnInit {
  configFormatos?: TableConfig;
  configDetalle?: TableConfig;
  formatoSeleccionado = signal<FormatoMarcacion | null>(null);

  constructor(
    private formatoService: FormatoMarcacionService,
    private detalleService: DetalleFormatoMarcacionService,
    private detalleRubroService: DetalleRubroService,
    private locatorRrh: ServiceLocatorRrhService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.formatoService.selectByCriteria(criteriosPorEmpresa('nombre')).subscribe({
      next: (data) => this.construirTablaFormatos(data ?? []),
      error: () => {
        this.avisar('No se pudieron cargar los formatos de marcación');
        this.construirTablaFormatos([]);
      },
    });
  }

  onSeleccionFormato(formato: FormatoMarcacion): void {
    this.formatoSeleccionado.set(formato);
    this.locatorRrh.filtroFormatoMarcacion = formato?.codigo ?? null;
    this.cargarDetalle();
  }

  private cargarDetalle(): void {
    const formato = this.formatoSeleccionado();
    if (!formato) {
      this.configDetalle = undefined;
      return;
    }

    this.detalleService.selectByCriteria(this.criteriosDelFormato(formato.codigo)).subscribe({
      next: (data) => this.construirTablaDetalle(data ?? []),
      error: () => {
        this.avisar('No se pudieron cargar los campos del formato');
        this.construirTablaDetalle([]);
      },
    });
  }

  /** RHH.DFMR cuelga del formato, no de la empresa: se filtra por su maestro. */
  private criteriosDelFormato(codigo: number): DatosBusqueda[] {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'formato',
      'codigo',
      codigo.toString(),
      TipoComandosBusqueda.IGUAL,
    );

    const orden = new DatosBusqueda();
    orden.orderBy('orden');

    return [db, orden];
  }

  private construirTablaFormatos(registros: FormatoMarcacion[]): void {
    this.configFormatos = {
      entidad: EntidadesRrh.FORMATO_MARCACION,
      titulo: 'Formatos de archivo',
      registros: registros.map((row) => ({
        ...row,
        tipoFormatoLabel:
          this.detalleRubroService.getDescripcionByParentAndAlterno(
            RubrosRrh.FORMATO_ARCHIVO_MARCACION,
            row.tipoFormato,
          ) || '—',
        estadoLabel: etiquetaEstado(row.estado),
      })),
      fields: [
        { column: 'nombre', header: 'Formato', fWidth: '30%' },
        { column: 'marca', header: 'Marca y modelo', fWidth: '28%' },
        { column: 'tipoFormatoLabel', header: 'Tipo', fWidth: '24%' },
        { column: 'estadoLabel', header: 'Estado', fWidth: '18%' },
      ],
      regConfig: camposFormato(OPCIONES_ESTADO, Validators.required),
      add: true,
      edit: true,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08',
      onBeforeSave: (datos: any) => ({
        ...datos,
        empresa: referenciaEmpresa(),
        tipoFormato: extraerCodigo(datos.tipoFormato),
        estado: extraerCodigo(datos.estado),
        usuarioRegistro: usuarioSesion(),
      }),
      onDataUpdate: (data: FormatoMarcacion[]) =>
        (data ?? []).map((row) => ({
          ...row,
          tipoFormatoLabel:
            this.detalleRubroService.getDescripcionByParentAndAlterno(
              RubrosRrh.FORMATO_ARCHIVO_MARCACION,
              row.tipoFormato,
            ) || '—',
          estadoLabel: etiquetaEstado(row.estado),
        })),
    };
  }

  private construirTablaDetalle(registros: DetalleFormatoMarcacion[]): void {
    const formato = this.formatoSeleccionado()!;

    this.configDetalle = {
      entidad: EntidadesRrh.DETALLE_FORMATO_MARCACION,
      titulo: `Campos de ${formato.nombre}`,
      registros: this.formatearDetalle(registros),
      fields: [
        { column: 'orden', header: 'Orden', fWidth: '10%', fAlign: 'aC' },
        { column: 'campoLabel', header: 'Campo', fWidth: '28%' },
        { column: 'posicion', header: 'Posición', fWidth: '13%', fAlign: 'aC' },
        { column: 'indiceInicio', header: 'Inicio', fWidth: '13%', fAlign: 'aC' },
        { column: 'longitud', header: 'Longitud', fWidth: '13%', fAlign: 'aC' },
        { column: 'obligatorioLabel', header: 'Obligatorio', fWidth: '13%', fAlign: 'aC' },
      ],
      regConfig: camposDetalleFormato(OPCIONES_SI_NO, OPCIONES_ESTADO, Validators.required),
      add: true,
      edit: true,
      remove: true,
      paginator: false,
      filter: false,
      fSize: 'em-1',
      row_size: 's08',
      onBeforeSave: (datos: any) => ({
        ...datos,
        formato: { codigo: formato.codigo },
        campo: extraerCodigo(datos.campo),
        obligatorio: extraerCodigo(datos.obligatorio),
        estado: extraerCodigo(datos.estado),
        usuarioRegistro: usuarioSesion(),
      }),
      onDataUpdate: (data: DetalleFormatoMarcacion[]) => this.formatearDetalle(data ?? []),
    };
  }

  private formatearDetalle(registros: DetalleFormatoMarcacion[]): any[] {
    return registros.map((row) => ({
      ...row,
      campoLabel:
        this.detalleRubroService.getDescripcionByParentAndAlterno(
          RubrosRrh.CAMPO_ARCHIVO_MARCACION,
          row.campo,
        ) || '—',
      obligatorioLabel: etiquetaSiNo(row.obligatorio),
    }));
  }

  onTableError(errorData: { mensaje: string; codigoHttp?: number }): void {
    const exito =
      errorData.codigoHttp != null && errorData.codigoHttp >= 200 && errorData.codigoHttp < 300;
    this.snackBar.open(errorData.mensaje, 'Cerrar', {
      ...opcionesAviso(!exito, errorData.mensaje),
    });
  }

  private avisar(mensaje: string): void {
    this.onTableError({ mensaje });
  }
}
