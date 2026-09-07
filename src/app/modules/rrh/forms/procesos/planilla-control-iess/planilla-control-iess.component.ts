import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { ExportService } from '../../../../../shared/services/export.service';
import { PlanillaControlIess } from '../../../model/planilla-control-iess';
import { PeriodoNomina } from '../../../model/periodo-nomina';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import { PlanillaControlIessService } from '../../../service/planilla-control-iess.service';
import { mensajeDeError } from '../../comunes/mensajes';
import { ColumnaTabla } from '../../comunes/modelo-formulario';
import { TablaRrhComponent } from '../../comunes/tabla-rrh/tabla-rrh.component';
import { aniosDisponibles, criteriosPorEmpresa, filtrarPorAnio } from '../../parametrizacion/utiles-parametrizacion';
import { opcionesAviso } from '../../comunes/avisos';

/**
 * Planilla de control del IESS (`docs/rrh/API-PLANILLA-IESS.md` §7.a).
 *
 * **Para qué existe.** El endpoint `GET /rest/plie/getPeriodo/{idPeriodo}` calcula, desde nuestras
 * nóminas, lo que el portal del IESS *debería* generar. Es el control que habría evitado los
 * 208,22 de marzo de 2026: el portal declaró a dos personas que ya no estaban porque nadie
 * registró su aviso de salida a tiempo, y contra esta planilla la diferencia se habría visto
 * **antes** de transferir. Esta pantalla es para usarla con el portal del IESS abierto en otra
 * ventana, comparando renglón por renglón — el bloque de totales es lo que se compara, no un pie
 * de tabla decorativo.
 *
 * **Por qué el 21,60 % y no el 20,60 %.** El aporte personal + patronal es el 20,60 % de la masa
 * salarial. La contribución CCC (1 %) se calcula sobre la *suma* de sueldos, no sobre cada uno, así
 * que no aparece en ninguna fila del detalle y sin embargo suma al total del comprobante. Con todo
 * lo demás en cero, el total es el 21,60 % de la masa.
 */
@Component({
  selector: 'app-planilla-control-iess',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
    TablaRrhComponent,
  ],
  templateUrl: './planilla-control-iess.component.html',
  styleUrls: ['./planilla-control-iess.component.scss'],
})
export class PlanillaControlIessComponent implements OnInit {
  readonly anios = aniosDisponibles();
  readonly anio = signal<number>(new Date().getFullYear());
  readonly periodos = signal<PeriodoNomina[]>([]);
  readonly periodoSeleccionado = signal<number | null>(null);

  readonly cargando = signal<boolean>(false);
  readonly planilla = signal<PlanillaControlIess | null>(null);
  readonly filas = signal<any[]>([]);

  readonly columnas: ColumnaTabla[] = [
    { campo: 'relacionTrabajo', titulo: 'RT', ancho: '6%' },
    { campo: 'identificacion', titulo: 'Cédula', ancho: '13%' },
    { campo: 'nombre', titulo: 'Nombre', ancho: '25%' },
    { campo: 'sueldo', titulo: 'Sueldo', ancho: '12%', alinear: 'derecha', formato: 'dinero' },
    { campo: 'dias', titulo: 'Días', ancho: '8%', alinear: 'centro', formato: 'numero' },
    { campo: 'aportePersonal', titulo: 'Aporte personal', ancho: '12%', alinear: 'derecha', formato: 'dinero' },
    { campo: 'aportePatronal', titulo: 'Aporte patronal', ancho: '12%', alinear: 'derecha', formato: 'dinero' },
    { campo: 'totalIess', titulo: 'Valor', ancho: '12%', alinear: 'derecha', formato: 'dinero' },
    { campo: 'seguroTiempoParcial', titulo: 'T. parcial', ancho: '12%', alinear: 'derecha', formato: 'dinero' },
  ];

  constructor(
    private periodoService: PeriodoNominaService,
    private planillaControlS: PlanillaControlIessService,
    private funcionesDatosS: FuncionesDatosService,
    private exportService: ExportService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarPeriodos();
  }

  // ─── Período ───────────────────────────────────────────────────────────────

  onAnioChange(anio: number): void {
    this.anio.set(anio);
    this.periodoSeleccionado.set(null);
    this.limpiar();
    this.cargarPeriodos();
  }

  onPeriodoChange(codigo: number | null): void {
    this.periodoSeleccionado.set(codigo);
    this.limpiar();
    if (codigo !== null) this.cargar();
  }

  private cargarPeriodos(): void {
    this.periodoService.selectByCriteria(criteriosPorEmpresa('mes')).subscribe({
      next: (filas) => this.periodos.set(filtrarPorAnio(filas ?? [], this.anio())),
      error: (err) => {
        this.periodos.set([]);
        this.avisar(mensajeDeError(err, 'No se pudieron cargar los períodos.'), true);
      },
    });
  }

  /** Sirve tanto para `PeriodoNomina` como para `PlanillaControlIess`: las dos traen mes y año. */
  etiquetaPeriodo(periodo: { mes: number; anio: number }): string {
    return `${String(periodo.mes).padStart(2, '0')}/${periodo.anio}`;
  }

  // ─── Carga de la planilla ────────────────────────────────────────────────────

  private cargar(): void {
    const idPeriodo = this.periodoSeleccionado();
    if (idPeriodo === null) return;

    this.cargando.set(true);
    this.planillaControlS.getPeriodo(idPeriodo).subscribe({
      next: (planilla) => {
        this.cargando.set(false);
        this.planilla.set(this.normalizar(planilla));
        this.filas.set((planilla.lineas ?? []).map((l) => ({ ...l })));
      },
      error: (err) => {
        this.cargando.set(false);
        this.planilla.set(null);
        this.filas.set([]);
        this.avisar(mensajeDeError(err, 'No se pudo generar la planilla de control.'), true);
      },
    });
  }

  /** `fechaInicio`/`fechaFin` llegan como `LocalDate`, en una de tres formas del backend. */
  private normalizar(planilla: PlanillaControlIess): PlanillaControlIess {
    return {
      ...planilla,
      fechaInicio: this.funcionesDatosS.convertirFechaDesdeBackend(planilla.fechaInicio),
      fechaFin: this.funcionesDatosS.convertirFechaDesdeBackend(planilla.fechaFin),
    };
  }

  private limpiar(): void {
    this.planilla.set(null);
    this.filas.set([]);
  }

  // ─── Exportar ──────────────────────────────────────────────────────────────

  exportarCsv(): void {
    const p = this.planilla();
    if (!p) return;
    this.exportService.exportToCSV(
      this.filas(),
      `planilla-control-iess-${p.anio}-${String(p.mes).padStart(2, '0')}`,
      ['RT', 'Cédula', 'Nombre', 'Sueldo', 'Días', 'Aporte personal', 'Aporte patronal', 'Valor', 'T. parcial'],
      ['relacionTrabajo', 'identificacion', 'nombre', 'sueldo', 'dias', 'aportePersonal', 'aportePatronal', 'totalIess', 'seguroTiempoParcial'],
    );
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      ...opcionesAviso(esError, mensaje),
    });
  }
}
