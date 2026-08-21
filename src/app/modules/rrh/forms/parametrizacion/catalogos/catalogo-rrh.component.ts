import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ServiceLocatorRrhService } from '../../../../../shared/basics/service-locator/service-locator-rrh.service';
import { TableBasicHijosComponent } from '../../../../../shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component';
import { TableConfig } from '../../../../../shared/basics/table/model/table-interface';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { cargoDe, departamentoDe } from '../../../model/departamento-cargo';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { CargoService } from '../../../service/cargo.service';
import { DepartamentoService } from '../../../service/departamento.service';
import {
  ClaveCatalogo,
  DefinicionCatalogo,
  definicionCatalogo,
} from './catalogos-rrh.config';

/**
 * Pantalla genérica de los catálogos de parametrización de RRHH que ya existían: cargos,
 * departamentos, la asignación entre ambos, tipos de contrato y turnos.
 *
 * Las cinco son el mismo maestro sobre `table-basic-hijos`; lo único que cambia es la definición
 * declarativa de `catalogos-rrh.config.ts`, que se elige por la clave que trae la ruta. Antes
 * eran diez componentes de entre 160 y 400 líneas cada uno.
 */
@Component({
  selector: 'app-catalogo-rrh',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, TableBasicHijosComponent],
  templateUrl: './catalogo-rrh.component.html',
  styleUrls: ['./catalogo-rrh.component.scss'],
})
export class CatalogoRrhComponent implements OnInit {
  definicion?: DefinicionCatalogo;
  tableConfig?: TableConfig;
  cargando = signal<boolean>(true);

  constructor(
    private route: ActivatedRoute,
    private locatorRrh: ServiceLocatorRrhService,
    private departamentoService: DepartamentoService,
    private cargoService: CargoService,
    private detalleRubroService: DetalleRubroService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const clave = this.route.snapshot.data['catalogo'] as ClaveCatalogo;

    // departamento-cargo necesita ambos catálogos para sus combos; el resto no depende de nada
    const dependencias =
      clave === 'departamento-cargo'
        ? forkJoin({
            departamentos: this.departamentoService
              .selectByCriteria([])
              .pipe(catchError(() => of([]))),
            cargos: this.cargoService.selectByCriteria([]).pipe(catchError(() => of([]))),
          })
        : of({ departamentos: [], cargos: [] });

    dependencias.subscribe((deps) => {
      this.definicion = definicionCatalogo(clave, {
        departamentos: deps.departamentos ?? [],
        cargos: deps.cargos ?? [],
      });
      this.cargar();
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.locatorRrh
      .recargarValores(this.definicion!.entidad)
      .then((data) => this.construirTabla(Array.isArray(data) ? data : []))
      .catch(() => {
        this.avisar(`No se pudieron cargar los registros de ${this.definicion!.titulo}`);
        this.construirTabla([]);
      });
  }

  private construirTabla(registros: any[]): void {
    const definicion = this.definicion!;
    this.cargando.set(false);

    this.tableConfig = {
      entidad: definicion.entidad,
      titulo: definicion.titulo,
      registros: this.formatear(registros),
      fields: definicion.fields,
      regConfig: definicion.regConfig,
      add: true,
      edit: true,
      remove: definicion.permiteBorrar,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08',
      onBeforeSave: (datos: any) => ({
        ...definicion.onBeforeSave(datos),
        usuarioRegistro: usuarioSesion(),
      }),
      onDataUpdate: (data: any[]) => this.formatear(data ?? []),
    };
  }

  /**
   * Etiquetas legibles de las columnas derivadas.
   *
   * Estas tablas guardan hoy el estado como 'A' / 'I', pero el script 05 prevé migrarlo al rubro
   * numérico; la etiqueta acepta las dos formas para no romperse el día de la migración.
   */
  private formatear(registros: any[]): any[] {
    return registros.map((row) => ({
      ...row,
      estadoLabel: this.esActivo(row.estado) ? 'Activo' : 'Inactivo',
      departamentoLabel: departamentoDe(row)?.nombre ?? '—',
      cargoLabel: cargoDe(row)?.nombre ?? '—',
      relacionLaboralLabel:
        this.detalleRubroService.getDescripcionByParentAndAlterno(
          RubrosRrh.TIPO_RELACION_LABORAL,
          row.tipoRelacionLaboral,
        ) || '—',
    }));
  }

  private esActivo(estado: unknown): boolean {
    const texto = String(estado ?? '').trim().toUpperCase();
    return texto.startsWith('A') || texto === '1';
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
