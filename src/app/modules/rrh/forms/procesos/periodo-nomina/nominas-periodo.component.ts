import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { ExportService } from '../../../../../shared/services/export.service';
import { EstadoNomina } from '../../../model/estados-nomina';
import { Nomina } from '../../../model/nomina';
import { ReglonNomina } from '../../../model/reglon-nomina';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { NominaService } from '../../../service/nomina.service';
import { ReglonNominaService } from '../../../service/reglon-nomina.service';
import {
  CLAVES_DETALLE,
  ENCABEZADOS_DETALLE,
  filasDetalleRenglones,
} from './export-periodo';
import { opcionesAviso } from '../../comunes/avisos';

/**
 * Detalle por colaborador del período: totales por persona y, al desplegar una fila, los
 * renglones con los que se armaron.
 *
 * Los renglones se piden solo al desplegar. Con 18–25 colaboradores y una veintena de conceptos
 * cada uno, traerlos todos por adelantado sería medio millar de filas que casi nadie mira.
 */
@Component({
  selector: 'app-nominas-periodo',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTableModule, MatTooltipModule],
  templateUrl: './nominas-periodo.component.html',
  styleUrls: ['./nominas-periodo.component.scss'],
})
export class NominasPeriodoComponent implements OnChanges {
  @Input({ required: true }) idPeriodo!: number;
  /** Cambia cuando el período se recalcula, para forzar la recarga. */
  @Input() version = 0;
  @Input() permiteAcciones = true;

  @Output() recalcular = new EventEmitter<number>();
  @Output() excluir = new EventEmitter<{ idEmpleado: number; nombre: string }>();

  columnas = [
    'empleado',
    'diasTrabajados',
    'totalIngresos',
    'totalDescuentos',
    'netoPagar',
    'estado',
    'acciones',
  ];

  nominas = signal<any[]>([]);
  expandida = signal<number | null>(null);
  renglones = signal<Map<number, ReglonNomina[]>>(new Map());
  cargando = signal<boolean>(false);
  exportando = signal<boolean>(false);

  constructor(
    private nominaService: NominaService,
    private reglonService: ReglonNominaService,
    private detalleRubroService: DetalleRubroService,
    private exportService: ExportService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['idPeriodo'] || cambios['version']) {
      this.expandida.set(null);
      this.renglones.set(new Map());
      this.cargar();
    }
  }

  private cargar(): void {
    if (!this.idPeriodo) return;

    this.cargando.set(true);
    this.nominaService.selectByCriteria(this.criteriosDelPeriodo()).subscribe({
      next: (data) => {
        this.cargando.set(false);
        this.nominas.set(this.formatear(data ?? []));
      },
      error: () => {
        this.cargando.set(false);
        this.nominas.set([]);
        this.avisar('No se pudieron cargar las nóminas del período');
      },
    });
  }

  alternarDetalle(fila: any): void {
    const abierta = this.expandida() === fila.codigo;
    this.expandida.set(abierta ? null : fila.codigo);

    if (abierta || this.renglones().has(fila.codigo)) return;
    this.cargarRenglones(fila.codigo);
  }

  private cargarRenglones(idNomina: number): void {
    this.reglonService.selectByCriteria(this.criteriosDeNomina(idNomina)).subscribe({
      next: (data) => {
        const mapa = new Map(this.renglones());
        mapa.set(idNomina, data ?? []);
        this.renglones.set(mapa);
      },
      error: () => this.avisar('No se pudieron cargar los renglones del rol'),
    });
  }

  private criteriosDeNomina(idNomina: number): DatosBusqueda[] {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'nomina',
      'codigo',
      idNomina.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    const orden = new DatosBusqueda();
    orden.orderBy('orden');
    return [db, orden];
  }

  renglonesDe(idNomina: number): ReglonNomina[] {
    return this.renglones().get(idNomina) ?? [];
  }

  tipoConceptoLabel(renglon: ReglonNomina): string {
    if (renglon.tipoConcepto === null || renglon.tipoConcepto === undefined) return '—';
    return (
      this.detalleRubroService.getDescripcionByParentAndAlterno(
        RubrosRrh.TIPO_CONCEPTO_NOMINA,
        renglon.tipoConcepto,
      ) || '—'
    );
  }

  private criteriosDelPeriodo(): DatosBusqueda[] {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'periodoNomina',
      'codigo',
      this.idPeriodo.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    const orden = new DatosBusqueda();
    orden.orderBy('codigo');
    return [db, orden];
  }

  private formatear(registros: Nomina[]): any[] {
    return registros.map((row) => ({
      ...row,
      nombreEmpleado: `${row.empleado?.apellidos ?? ''} ${row.empleado?.nombres ?? ''}`.trim(),
      identificacion: row.empleado?.identificacion ?? '',
      estadoLabel:
        this.detalleRubroService.getDescripcionByParentAndAlterno(
          RubrosRrh.ESTADO_NOMINA,
          Number(row.estado),
        ) || '—',
      excluida: Number(row.estado) === EstadoNomina.EXCLUIDA,
    }));
  }

  onRecalcular(fila: any): void {
    this.recalcular.emit(fila.empleado?.codigo);
  }

  onExcluir(fila: any): void {
    this.excluir.emit({ idEmpleado: fila.empleado?.codigo, nombre: fila.nombreEmpleado });
  }

  /** Resumen: una fila por colaborador. Dice quién no cuadra. */
  exportarResumen(): void {
    this.exportService.exportToCSV(
      this.nominas(),
      'nominas-periodo-resumen',
      ['Identificación', 'Colaborador', 'Días', 'Ingresos', 'Descuentos', 'Neto', 'Estado'],
      [
        'identificacion',
        'nombreEmpleado',
        'diasTrabajados',
        'totalIngresos',
        'totalDescuentos',
        'netoPagar',
        'estadoLabel',
      ],
    );
  }

  /**
   * Detalle: una fila por colaborador y concepto. Es el archivo que se pone al lado del rol de
   * ASOPREP en Excel para cuadrar el período renglón a renglón.
   *
   * Pide los renglones de cada nómina por separado, con la misma consulta que ya usa el detalle
   * expandible. Se podría hacer en una sola llamada filtrando por `nomina.periodoNomina.codigo`,
   * pero eso son tres niveles de anidamiento: reutilizar la consulta que la pantalla ya ejercita
   * es lo que garantiza que el export funcione el día de la prueba.
   */
  exportarDetalle(): void {
    const nominas = this.nominas();
    if (nominas.length === 0) return;

    this.exportando.set(true);

    forkJoin(
      nominas.map((nomina) =>
        this.reglonService.selectByCriteria(this.criteriosDeNomina(nomina.codigo)).pipe(
          map((renglones) => ({ codigo: nomina.codigo, renglones: renglones ?? [] })),
          catchError(() => of({ codigo: nomina.codigo, renglones: [] as ReglonNomina[] })),
        ),
      ),
    ).subscribe((resultados) => {
      this.exportando.set(false);

      const mapa = new Map<number, ReglonNomina[]>();
      let vacias = 0;
      for (const resultado of resultados) {
        mapa.set(resultado.codigo, resultado.renglones);
        if (resultado.renglones.length === 0) vacias++;
      }

      const filas = filasDetalleRenglones(
        nominas,
        mapa,
        (rubro, valor) => this.rubro(rubro, valor),
        RubrosRrh.TIPO_CONCEPTO_NOMINA,
      );

      if (filas.length === 0) {
        this.avisar('El período no tiene renglones que exportar');
        return;
      }

      this.exportService.exportToCSV(
        filas,
        'nominas-periodo-detalle',
        ENCABEZADOS_DETALLE,
        CLAVES_DETALLE,
      );

      // Un colaborador sin renglones es un dato, no un fallo del export: hay que poder verlo
      if (vacias > 0) {
        this.avisar(`${vacias} colaborador(es) no tienen renglones en este período.`);
      }
    });
  }

  private rubro(rubroAlterno: number, valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '';
    return this.detalleRubroService.getDescripcionByParentAndAlterno(rubroAlterno, valor) || '';
  }

  private avisar(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      ...opcionesAviso(true, mensaje),
    });
  }
}
