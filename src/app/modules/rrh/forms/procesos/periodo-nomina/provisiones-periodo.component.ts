import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { ExportService } from '../../../../../shared/services/export.service';
import { ProvisionNomina } from '../../../model/provision-nomina';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { ProvisionNominaService } from '../../../service/provision-nomina.service';
import {
  CLAVES_PROVISIONES,
  ENCABEZADOS_PROVISIONES,
  filasProvisiones,
  totalesPorTipoProvision,
} from './export-periodo';

/**
 * Provisiones del período (RHH.PVNM).
 *
 * No afectan al neto del colaborador, pero sí al costo total del empleador, y son una obligación
 * legal: décimos, vacaciones, fondos de reserva y aporte patronal en modalidad acumulada.
 *
 * El total por tipo es lo que se contrasta contra el asiento de provisiones, y el contador de
 * colaboradores por tipo es lo que delata una provisión que falta: la de vacaciones es
 * obligatoria para todos, así que si su contador no coincide con el número de colaboradores del
 * período, hay alguien sin provisionar.
 */
@Component({
  selector: 'app-provisiones-periodo',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTableModule],
  templateUrl: './provisiones-periodo.component.html',
  styleUrls: ['./provisiones-periodo.component.scss'],
})
export class ProvisionesPeriodoComponent implements OnChanges {
  @Input({ required: true }) idPeriodo!: number;
  /** Cambia cuando el período se recalcula, para forzar la recarga. */
  @Input() version = 0;
  /** Colaboradores del período, para detectar provisiones que faltan. */
  @Input() numeroColaboradores = 0;

  columnas = ['empleado', 'tipo', 'baseCalculo', 'valor'];

  provisiones = signal<any[]>([]);
  cargando = signal<boolean>(false);

  totales = computed(() =>
    totalesPorTipoProvision(
      this.provisiones(),
      (rubro, valor) => this.rubro(rubro, valor),
      RubrosRrh.TIPO_PROVISION,
    ),
  );

  totalGeneral = computed(() =>
    this.provisiones().reduce((total, fila) => total + Number(fila.valor ?? 0), 0),
  );

  /** Tipos cuyo contador no llega al total de colaboradores del período. */
  incompletas = computed(() =>
    this.numeroColaboradores > 0
      ? this.totales().filter((t) => t.colaboradores < this.numeroColaboradores)
      : [],
  );

  constructor(
    private provisionService: ProvisionNominaService,
    private detalleRubroService: DetalleRubroService,
    private exportService: ExportService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['idPeriodo'] || cambios['version']) {
      this.cargar();
    }
  }

  private cargar(): void {
    if (!this.idPeriodo) return;

    this.cargando.set(true);
    this.provisionService.selectByCriteria(this.criterios()).subscribe({
      next: (data) => {
        this.cargando.set(false);
        this.provisiones.set(this.formatear(data ?? []));
      },
      error: () => {
        this.cargando.set(false);
        this.provisiones.set([]);
        this.avisar('No se pudieron cargar las provisiones del período');
      },
    });
  }

  private criterios(): DatosBusqueda[] {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'periodoNomina',
      'codigo',
      this.idPeriodo.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    const orden = new DatosBusqueda();
    orden.orderBy('tipoProvision');
    return [db, orden];
  }

  private formatear(registros: ProvisionNomina[]): any[] {
    return registros.map((row) => {
      const empleado = row.empleado as any;
      return {
        ...row,
        nombreEmpleado: `${empleado?.apellidos ?? ''} ${empleado?.nombres ?? ''}`.trim(),
        identificacion: empleado?.identificacion ?? '',
        tipoLabel: this.rubro(RubrosRrh.TIPO_PROVISION, row.tipoProvision),
      };
    });
  }

  exportarCsv(): void {
    const filas = filasProvisiones(
      this.provisiones(),
      (rubro, valor) => this.rubro(rubro, valor),
      RubrosRrh.TIPO_PROVISION,
    );
    this.exportService.exportToCSV(
      filas,
      'provisiones-periodo',
      ENCABEZADOS_PROVISIONES,
      CLAVES_PROVISIONES,
    );
  }

  private rubro(rubroAlterno: number, valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '';
    return this.detalleRubroService.getDescripcionByParentAndAlterno(rubroAlterno, valor) || '';
  }

  private avisar(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 8000,
      panelClass: ['snackbar-error'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}
