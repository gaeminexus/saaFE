import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { ExportService } from '../../../../../shared/services/export.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { Empleado } from '../../../model/empleado';
import { ResumenNomina } from '../../../model/resumen-nomina';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { EmpleadoService } from '../../../service/empleado.service';
import { ResumenNominaService } from '../../../service/resumen-nomina.service';
import { criteriosPorEmpresa } from '../../parametrizacion/utiles-parametrizacion';
import { CAMPOS_ASISTENCIA_PERSISTEN, rangoPorDefecto } from '../utiles-asistencia';
import { CorreccionResumenDialogComponent } from './correccion-resumen-dialog.component';

/**
 * Resumen diario de asistencia (RHH.RSMN).
 *
 * Muestra por día las tres figuras de hora extra por separado —suplementarias al 50 %,
 * extraordinarias al 100 % y recargo nocturno del 25 %—, porque se pagan distinto y sumarlas
 * sería un error de cálculo, no de presentación.
 *
 * Los días marcados como inconsistentes por la consolidación se destacan y se filtran aparte:
 * son los que hay que revisar antes de calcular el período.
 */
@Component({
  selector: 'app-resumen-diario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './resumen-diario.component.html',
  styleUrls: ['./resumen-diario.component.scss'],
})
export class ResumenDiarioComponent implements OnInit {
  /**
   * De las once columnas que el script 05 agregó a `RHH.RSMN`, la entidad del backend solo mapea
   * `tipoAusencia`. Mientras esto sea `false`, las horas y la marca de inconsistencia llegan en
   * `undefined` y la pantalla lo advierte en lugar de presentar los ceros como una medición.
   */
  camposPersisten = CAMPOS_ASISTENCIA_PERSISTEN;

  columnas = [
    'fecha',
    'entrada',
    'salida',
    'atraso',
    'anticipada',
    'trabajadas',
    'suplementarias',
    'extraordinarias',
    'nocturnas',
    'ausencia',
    'acciones',
  ];

  empleados = signal<Empleado[]>([]);
  empleadoSeleccionado = signal<number | null>(null);
  desde = signal<string>('');
  hasta = signal<string>('');
  resumenes = signal<any[]>([]);
  soloInconsistentes = signal<boolean>(false);
  cargando = signal<boolean>(false);
  consolidando = signal<boolean>(false);

  inconsistentes = computed(() => this.resumenes().filter((r) => r.inconsistente === 'S').length);
  filas = computed(() =>
    this.soloInconsistentes()
      ? this.resumenes().filter((r) => r.inconsistente === 'S')
      : this.resumenes(),
  );

  totales = computed(() => {
    const suma = (campo: string) =>
      this.resumenes().reduce((total, fila) => total + Number(fila[campo] ?? 0), 0);
    return {
      trabajadas: suma('horasTrabajadas'),
      suplementarias: suma('horasSuplementarias'),
      extraordinarias: suma('horasExtraordinarias'),
      nocturnas: suma('horasNocturnas'),
      atraso: suma('minutosTarde'),
    };
  });

  puedeConsultar = computed(
    () => this.empleadoSeleccionado() !== null && !!this.desde() && !!this.hasta(),
  );

  constructor(
    private resumenService: ResumenNominaService,
    private empleadoService: EmpleadoService,
    private detalleRubroService: DetalleRubroService,
    private exportService: ExportService,
    private dialog: MatDialog,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const rango = rangoPorDefecto();
    this.desde.set(rango.desde);
    this.hasta.set(rango.hasta);

    this.empleadoService.selectByCriteria(criteriosPorEmpresa('apellidos')).subscribe({
      next: (data) => this.empleados.set(data ?? []),
      error: () => {
        this.empleados.set([]);
        this.avisar('No se pudo cargar la lista de colaboradores', true);
      },
    });
  }

  consultar(): void {
    if (!this.puedeConsultar()) return;

    this.cargando.set(true);
    this.resumenService.selectByCriteria(this.criterios()).subscribe({
      next: (data) => {
        this.cargando.set(false);
        this.resumenes.set(this.formatear(data ?? []));
      },
      error: () => {
        this.cargando.set(false);
        this.resumenes.set([]);
        this.avisar('No se pudo cargar el resumen diario', true);
      },
    });
  }

  /**
   * Consolida las marcaciones del rango en resúmenes diarios.
   *
   * Es el paso que convierte los eventos sueltos del reloj en el día trabajado del que sale la
   * nómina. Un día con marcaciones impares sale `inconsistente = 'S'` en vez de adivinarse, y
   * quien no tenga turno sale con sus horas y sin atraso: no se inventa un horario.
   */
  consolidar(): void {
    if (!this.desde() || !this.hasta() || this.consolidando()) return;

    this.consolidando.set(true);
    this.resumenService.consolidar(this.desde(), this.hasta()).subscribe({
      next: (generados) => {
        this.consolidando.set(false);
        this.avisar(`${generados ?? 0} resumen(es) generados.`);
        if (this.puedeConsultar()) this.consultar();
      },
      error: (err) => {
        this.consolidando.set(false);
        const mensaje =
          typeof err === 'string' && err.trim()
            ? err
            : err?.mensaje || err?.message || 'No se pudo consolidar el rango.';
        this.avisar(mensaje, true);
      },
    });
  }

  corregir(fila: any): void {
    this.dialog
      .open(CorreccionResumenDialogComponent, {
        width: '760px',
        data: {
          resumen: fila,
          etiquetaEmpleado: this.etiquetaEmpleadoDe(),
          tiposAusencia: this.detalleRubroService.getDetallesByParent(RubrosRrh.TIPO_AUSENCIA) ?? [],
        },
      })
      .afterClosed()
      .subscribe((corregido) => {
        if (!corregido) return;
        this.guardarCorreccion(corregido);
      });
  }

  private guardarCorreccion(resumen: ResumenNomina): void {
    this.resumenService.update({ ...resumen, usuarioRegistro: usuarioSesion() }).subscribe({
      next: () => {
        this.avisar('Resumen corregido.');
        this.consultar();
      },
      error: (err) =>
        this.avisar(typeof err === 'string' ? err : err?.message || 'No se pudo guardar', true),
    });
  }

  private criterios(): DatosBusqueda[] {
    const dbEmpleado = new DatosBusqueda();
    dbEmpleado.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empleado',
      'codigo',
      this.empleadoSeleccionado()!.toString(),
      TipoComandosBusqueda.IGUAL,
    );

    const dbDesde = new DatosBusqueda();
    dbDesde.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.DATE,
      'fecha',
      this.desde(),
      TipoComandosBusqueda.MAYOR_IGUAL,
    );

    const dbHasta = new DatosBusqueda();
    dbHasta.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.DATE,
      'fecha',
      this.hasta(),
      TipoComandosBusqueda.MENOR_IGUAL,
    );

    const orden = new DatosBusqueda();
    orden.orderBy('fecha');

    return [dbEmpleado, dbDesde, dbHasta, orden];
  }

  private formatear(registros: ResumenNomina[]): any[] {
    return registros.map((row) => ({
      ...row,
      ausenciaLabel:
        row.tipoAusencia === null || row.tipoAusencia === undefined
          ? '—'
          : this.detalleRubroService.getDescripcionByParentAndAlterno(
              RubrosRrh.TIPO_AUSENCIA,
              row.tipoAusencia,
            ) || '—',
    }));
  }

  private etiquetaEmpleadoDe(): string {
    const empleado = this.empleados().find((e) => e.codigo === this.empleadoSeleccionado());
    return empleado ? this.etiquetaEmpleado(empleado) : '';
  }

  etiquetaEmpleado(empleado: Empleado): string {
    return `${empleado.identificacion} — ${empleado.apellidos ?? ''} ${empleado.nombres ?? ''}`.trim();
  }

  irAHorasExtra(): void {
    this.router.navigate(['/menurecursoshumanos/procesos/horas-extra']);
  }

  irAMarcaciones(): void {
    this.router.navigate(['/menurecursoshumanos/asistencia/marcaciones']);
  }

  exportarCsv(): void {
    this.exportService.exportToCSV(
      this.filas(),
      'resumen-diario',
      [
        'Fecha',
        'Atraso (min)',
        'Salida anticipada (min)',
        'Trabajadas',
        'Suplementarias',
        'Extraordinarias',
        'Nocturnas',
        'Ausencia',
      ],
      [
        'fecha',
        'minutosTarde',
        'minutosSalidaAnticipada',
        'horasTrabajadas',
        'horasSuplementarias',
        'horasExtraordinarias',
        'horasNocturnas',
        'ausenciaLabel',
      ],
    );
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: esError ? 8000 : 4000,
      panelClass: [esError ? 'snackbar-error' : 'snackbar-success'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}
