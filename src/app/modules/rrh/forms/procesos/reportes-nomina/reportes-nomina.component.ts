import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { guardarArchivo, mensajeReporteFallido } from '../../../../../shared/services/descarga-reporte';
import { JasperReportesService } from '../../../../../shared/services/jasper-reportes.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { Empleado } from '../../../model/empleado';
import { PeriodoNomina } from '../../../model/periodo-nomina';
import { EmpleadoService } from '../../../service/empleado.service';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import {
  aniosDisponibles,
  criteriosPorEmpresa,
  filtrarPorAnio,
} from '../../parametrizacion/utiles-parametrizacion';
import { ReportesNomina } from '../descarga-reporte';
import { InlineAutocompleteComponent } from '../../comunes/inline-autocomplete/inline-autocomplete.component';
import { opcionesAviso } from '../../comunes/avisos';

interface ReporteDisponible {
  plantilla: string;
  titulo: string;
  descripcion: string;
  icono: string;
  archivo: string;
}

/**
 * Los tres reportes del período. El rol individual no está aquí: se descarga por colaborador
 * desde la pantalla de roles de pago.
 */
const REPORTES: ReporteDisponible[] = [
  {
    plantilla: ReportesNomina.ROL_CONSOLIDADO,
    titulo: 'Rol consolidado',
    descripcion: 'Todos los colaboradores del período en una sola planilla, con sus totales.',
    icono: 'table_view',
    archivo: 'rol-consolidado',
  },
  {
    plantilla: ReportesNomina.PROVISIONES,
    titulo: 'Provisiones',
    descripcion:
      'Décimos, vacaciones y fondos de reserva provisionados en el período. El aporte patronal no aparece: no se provisiona.',
    icono: 'savings',
    archivo: 'provisiones',
  },
  {
    plantilla: ReportesNomina.RESUMEN_APORTES,
    titulo: 'Resumen de aportes',
    descripcion:
      'Aporte personal, patronal, IECE y SECAP del período. Es con lo que se cuadra contra la planilla del IESS.',
    icono: 'account_balance',
    archivo: 'resumen-aportes',
  },
  {
    plantilla: ReportesNomina.CONTROL_IESS,
    titulo: 'Control IESS',
    descripcion: 'Verificado el 2026-09-03: pide período de nómina, igual que los tres de arriba.',
    icono: 'fact_check',
    archivo: 'control-iess',
  },
];

/**
 * Reportes internos de nómina (fase 5).
 *
 * Ninguno tiene endpoint propio: los tres se piden por `POST /rest/rprt/generar` con
 * `modulo: 'rhh'`, a través de `JasperReportesService`.
 *
 * Las tres plantillas están publicadas en `rep/rhh/` desde la entrega de la fase 5; sus nombres
 * viven en `ReportesNomina`, en `../descarga-reporte`.
 */
@Component({
  selector: 'app-reportes-nomina',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
    InlineAutocompleteComponent,
  ],
  templateUrl: './reportes-nomina.component.html',
  styleUrls: ['./reportes-nomina.component.scss'],
})
export class ReportesNominaComponent implements OnInit {
  reportes = REPORTES;
  formatos = ['PDF', 'EXCEL'];

  anios = aniosDisponibles();
  anio = signal<number>(new Date().getFullYear());
  periodos = signal<PeriodoNomina[]>([]);
  periodoSeleccionado = signal<number | null>(null);
  formato = signal<string>('PDF');
  generando = signal<string | null>(null);

  /**
   * Formulario 107 individual: pide `P_MPLD_CODIGO` + `P_ANIO`, no período — por eso vive aparte
   * del `REPORTES[]` de arriba, con su propio selector de colaborador y de año.
   */
  empleados: Empleado[] = [];
  empleadoF107 = signal<Empleado | null>(null);
  anioF107 = signal<number>(new Date().getFullYear());
  generandoF107 = signal<boolean>(false);

  readonly etiquetaEmpleado = (e: Empleado | null): string =>
    e ? `${e.identificacion ?? ''} — ${e.apellidos ?? ''} ${e.nombres ?? ''}`.trim() : '';
  readonly buscarPorEmpleado = (e: Empleado | null): string[] => [
    e?.identificacion != null ? String(e.identificacion) : '',
    e?.apellidos ?? '',
    e?.nombres ?? '',
  ];

  constructor(
    private periodoService: PeriodoNominaService,
    private empleadoService: EmpleadoService,
    private jasperService: JasperReportesService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarPeriodos();
    this.empleadoService.selectByCriteria(criteriosPorEmpresa('apellidos')).subscribe({
      next: (data) => (this.empleados = data ?? []),
      error: () => {
        this.empleados = [];
        this.avisar('No se pudo cargar la lista de colaboradores', true);
      },
    });
  }

  onAnioChange(anio: number): void {
    this.anio.set(anio);
    this.periodoSeleccionado.set(null);
    this.cargarPeriodos();
  }

  private cargarPeriodos(): void {
    this.periodoService.selectByCriteria(criteriosPorEmpresa('mes')).subscribe({
      next: (data) => this.periodos.set(filtrarPorAnio(data, this.anio())),
      error: () => {
        this.periodos.set([]);
        this.avisar('No se pudieron cargar los períodos de nómina', true);
      },
    });
  }

  generar(reporte: ReporteDisponible): void {
    const idPeriodo = this.periodoSeleccionado();
    if (idPeriodo === null || this.generando()) return;

    const periodo = this.periodos().find((p) => p.codigo === idPeriodo);
    this.generando.set(reporte.plantilla);

    this.jasperService
      .generar(
        'rhh',
        reporte.plantilla,
        { P_PRDN_CODIGO: idPeriodo, P_USUARIO: usuarioSesion() },
        this.formato(),
      )
      .subscribe({
        next: (blob) => {
          this.generando.set(null);
          const sufijo = periodo ? `${periodo.anio}-${String(periodo.mes).padStart(2, '0')}` : idPeriodo;
          guardarArchivo(blob, `${reporte.archivo}-${sufijo}.${this.extension()}`);
        },
        error: (err) => {
          this.generando.set(null);
          mensajeReporteFallido(err).then((mensaje) => this.avisar(mensaje, true));
        },
      });
  }

  generarF107(): void {
    const empleado = this.empleadoF107();
    if (!empleado || this.generandoF107()) return;

    this.generandoF107.set(true);
    this.jasperService
      .generar(
        'rhh',
        ReportesNomina.FORMULARIO_107,
        { P_MPLD_CODIGO: empleado.codigo, P_ANIO: this.anioF107(), P_USUARIO: usuarioSesion() },
        this.formato(),
      )
      .subscribe({
        next: (blob) => {
          this.generandoF107.set(false);
          guardarArchivo(blob, `formulario-107-${empleado.identificacion}-${this.anioF107()}.${this.extension()}`);
        },
        error: (err) => {
          this.generandoF107.set(false);
          mensajeReporteFallido(err).then((mensaje) => this.avisar(mensaje, true));
        },
      });
  }

  private extension(): string {
    return this.formato() === 'EXCEL' ? 'xlsx' : 'pdf';
  }

  etiquetaPeriodo(periodo: PeriodoNomina): string {
    return `${periodo.mes}/${periodo.anio}`;
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      ...opcionesAviso(esError, mensaje),
    });
  }
}
