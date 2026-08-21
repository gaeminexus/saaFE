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
import {
  DetalleFormatoBancario,
  FormatoArchivoBancario,
} from '../../../model/formato-archivo-bancario';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { DetalleFormatoBancarioService } from '../../../service/detalle-formato-bancario.service';
import { FormatoArchivoBancarioService } from '../../../service/formato-archivo-bancario.service';
import {
  criteriosPorEmpresa,
  etiquetaEstado,
  extraerCodigo,
  OPCIONES_ESTADO,
  OPCIONES_SI_NO,
  referenciaEmpresa,
} from '../utiles-parametrizacion';
import {
  camposDetalleFormatoBancario,
  camposFormatoBancario,
} from './formatos-archivo-bancario.campos';

/** Lado del relleno en los formatos de ancho fijo. */
const OPCIONES_LADO = [
  { codigo: 'I', descripcion: 'Izquierda' },
  { codigo: 'D', descripcion: 'Derecha' },
];

/**
 * Formatos del archivo de pago del banco (RHH.FMBN) y sus campos (RHH.DFMB).
 *
 * Espejo de salida de los formatos de marcación: si el archivo que entra del reloj es dato, el
 * que sale al banco también. **Es precondición de la orden de pago**: sin un formato activo para
 * la empresa no se puede generar ningún archivo bancario.
 */
@Component({
  selector: 'app-formatos-archivo-bancario',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, TableBasicHijosComponent],
  templateUrl: './formatos-archivo-bancario.component.html',
  styleUrls: ['./formatos-archivo-bancario.component.scss'],
})
export class FormatosArchivoBancarioComponent implements OnInit {
  configFormatos?: TableConfig;
  configDetalle?: TableConfig;
  formatoSeleccionado = signal<FormatoArchivoBancario | null>(null);
  hayFormatoActivo = signal<boolean>(true);

  constructor(
    private formatoService: FormatoArchivoBancarioService,
    private detalleService: DetalleFormatoBancarioService,
    private detalleRubroService: DetalleRubroService,
    private locatorRrh: ServiceLocatorRrhService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.formatoService.selectByCriteria(criteriosPorEmpresa('nombre')).subscribe({
      next: (data) => this.construirTablaFormatos(data ?? []),
      error: () => {
        this.avisar('No se pudieron cargar los formatos del archivo bancario');
        this.construirTablaFormatos([]);
      },
    });
  }

  onSeleccionFormato(formato: FormatoArchivoBancario): void {
    this.formatoSeleccionado.set(formato);
    this.locatorRrh.filtroFormatoBancario = formato?.codigo ?? null;
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

  /** RHH.DFMB cuelga del formato, no de la empresa. */
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

  private construirTablaFormatos(registros: FormatoArchivoBancario[]): void {
    this.revisarFormatoActivo(registros);

    this.configFormatos = {
      entidad: EntidadesRrh.FORMATO_ARCHIVO_BANCARIO,
      titulo: 'Formatos del archivo bancario',
      registros: this.formatearFormatos(registros),
      fields: [
        { column: 'nombre', header: 'Formato', fWidth: '28%' },
        { column: 'banco', header: 'Banco', fWidth: '24%' },
        { column: 'tipoFormatoLabel', header: 'Tipo', fWidth: '22%' },
        { column: 'extension', header: 'Extensión', fWidth: '12%', fAlign: 'aC' },
        { column: 'estadoLabel', header: 'Estado', fWidth: '14%' },
      ],
      regConfig: camposFormatoBancario(OPCIONES_ESTADO, Validators.required),
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
      onDataUpdate: (data: FormatoArchivoBancario[]) => {
        this.revisarFormatoActivo(data ?? []);
        return this.formatearFormatos(data ?? []);
      },
    };
  }

  /** Sin un formato activo, la orden de pago no puede generar su archivo: se avisa aquí. */
  private revisarFormatoActivo(registros: FormatoArchivoBancario[]): void {
    this.hayFormatoActivo.set((registros ?? []).some((f) => Number(f.estado) === 1));
  }

  private formatearFormatos(registros: FormatoArchivoBancario[]): any[] {
    return (registros ?? []).map((row) => ({
      ...row,
      tipoFormatoLabel:
        this.detalleRubroService.getDescripcionByParentAndAlterno(
          RubrosRrh.FORMATO_ARCHIVO_MARCACION,
          row.tipoFormato,
        ) || '—',
      estadoLabel: etiquetaEstado(row.estado),
    }));
  }

  private construirTablaDetalle(registros: DetalleFormatoBancario[]): void {
    const formato = this.formatoSeleccionado()!;

    this.configDetalle = {
      entidad: EntidadesRrh.DETALLE_FORMATO_BANCARIO,
      titulo: `Campos de ${formato.nombre}`,
      registros: this.formatearDetalle(registros),
      fields: [
        { column: 'orden', header: 'Orden', fWidth: '10%', fAlign: 'aC' },
        { column: 'campoLabel', header: 'Campo', fWidth: '30%' },
        { column: 'indiceInicio', header: 'Inicio', fWidth: '12%', fAlign: 'aC' },
        { column: 'longitud', header: 'Longitud', fWidth: '12%', fAlign: 'aC' },
        { column: 'valorFijo', header: 'Valor fijo', fWidth: '22%' },
        { column: 'estadoLabel', header: 'Estado', fWidth: '14%' },
      ],
      regConfig: camposDetalleFormatoBancario(
        OPCIONES_SI_NO,
        OPCIONES_ESTADO,
        OPCIONES_LADO,
        Validators.required,
      ),
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
        ladoRelleno: extraerCodigo(datos.ladoRelleno),
        incluyeSeparadorDecimal: extraerCodigo(datos.incluyeSeparadorDecimal),
        estado: extraerCodigo(datos.estado),
        usuarioRegistro: usuarioSesion(),
      }),
      onDataUpdate: (data: DetalleFormatoBancario[]) => this.formatearDetalle(data ?? []),
    };
  }

  private formatearDetalle(registros: DetalleFormatoBancario[]): any[] {
    return (registros ?? []).map((row) => ({
      ...row,
      campoLabel:
        this.detalleRubroService.getDescripcionByParentAndAlterno(
          RubrosRrh.CAMPO_ARCHIVO_BANCARIO,
          row.campo,
        ) || '—',
      estadoLabel: etiquetaEstado(row.estado),
    }));
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
