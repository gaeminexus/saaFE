import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { ExportService } from '../../../../../shared/services/export.service';
import { JasperReportesService } from '../../../../../shared/services/jasper-reportes.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { ESTADOS_GENERA_ROLES, estadoEn } from '../../../model/estados-nomina';
import { PeriodoNomina } from '../../../model/periodo-nomina';
import { RolPago } from '../../../model/rolPago';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import { RolPagoService } from '../../../service/rol-pago.service';
import {
  aniosDisponibles,
  filtrarPorAnio,
  criteriosPorEmpresa,
} from '../../parametrizacion/utiles-parametrizacion';
import { guardarArchivo, mensajeReporteFallido, ReportesNomina } from '../descarga-reporte';
import { SeleccionFilas } from '../seleccion-filas';
import { admiteRecepcion, etiquetaEstadoRol, estadoRol } from './estado-rol';

/**
 * Roles de pago del período (RHH.RLPG).
 *
 * Tres procesos de `GeneracionRolPagoService` cuelgan de esta pantalla: regenerar los roles del
 * período, verificar la integridad de uno contra su nómina, y registrar la recepción.
 *
 * **Los roles se generan al aprobar el período, no aquí.** El botón de regenerar existe para el
 * período que se reabrió y recalculó, y para el que se aprobó antes de que la generación
 * existiera; por eso solo aparece sobre períodos ya aprobados.
 *
 * La descarga del PDF va contra `JasperReportesService`, con la plantilla `RPRT_ROLL_INDV` que
 * publica `rep/rhh/` desde la entrega de la fase 5.
 */
@Component({
  selector: 'app-roles-pago',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './roles-pago.component.html',
  styleUrls: ['./roles-pago.component.scss'],
})
export class RolesPagoComponent implements OnInit {
  columnas = [
    'seleccion',
    'numero',
    'empleado',
    'fechaEmision',
    'ingresos',
    'descuentos',
    'neto',
    'estadoRol',
    'acciones',
  ];

  anios = aniosDisponibles();
  anio = signal<number>(new Date().getFullYear());
  periodos = signal<PeriodoNomina[]>([]);
  periodoSeleccionado = signal<number | null>(null);
  roles = signal<any[]>([]);
  cargando = signal<boolean>(false);
  descargando = signal<number | null>(null);
  procesando = signal<boolean>(false);

  /** Códigos de rol marcados para registrar su recepción en bloque. */
  seleccion = new SeleccionFilas();

  /** Resultado de la última verificación de cada rol: `true` íntegro, `false` desactualizado. */
  verificaciones = signal<Map<number, boolean>>(new Map());

  totalNeto = computed(() =>
    this.roles().reduce((total, rol) => total + Number(rol.neto ?? 0), 0),
  );

  periodoActual = computed(
    () => this.periodos().find((p) => p.codigo === this.periodoSeleccionado()) ?? null,
  );

  /**
   * Verificado en `GeneracionRolPagoServiceImpl:234`: admite APROBADO, CONTABILIZADO y PAGADO.
   * La lista vive en `estados-nomina.ts` para que las guardas de los tres procesos de la
   * máquina de estados salgan del mismo sitio.
   */
  puedeRegenerar = computed(() => estadoEn(this.periodoActual(), ESTADOS_GENERA_ROLES));

  seleccionables = computed(() => this.roles().filter((rol) => admiteRecepcion(rol)));

  todosSeleccionados = computed(() =>
    this.seleccion.cubre(this.seleccionables().map((rol) => rol.codigo)),
  );

  constructor(
    private rolPagoService: RolPagoService,
    private periodoService: PeriodoNominaService,
    private jasperService: JasperReportesService,
    private exportService: ExportService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarPeriodos();
  }

  onAnioChange(anio: number): void {
    this.anio.set(anio);
    this.periodoSeleccionado.set(null);
    this.roles.set([]);
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

  onPeriodoChange(codigo: number | null): void {
    this.periodoSeleccionado.set(codigo);
    this.seleccion.limpiar();
    this.verificaciones.set(new Map());

    if (codigo === null) {
      this.roles.set([]);
      return;
    }

    this.cargando.set(true);
    this.rolPagoService.selectByCriteria(this.criterios(codigo)).subscribe({
      next: (data) => {
        this.cargando.set(false);
        this.roles.set(this.formatear(data ?? []));
      },
      error: () => {
        this.cargando.set(false);
        this.roles.set([]);
        this.avisar('No se pudieron cargar los roles de pago', true);
      },
    });
  }

  /** Recarga los roles del período seleccionado sin tocar la selección de período. */
  private recargar(): void {
    this.onPeriodoChange(this.periodoSeleccionado());
  }

  // ─── Procesos ──────────────────────────────────────────────────────────────

  /**
   * Regenera los roles del período. No es la vía normal —los genera `aprobarPeriodo`—, sino la
   * salida para un período reabierto y recalculado, cuyos roles quedaron desactualizados.
   */
  regenerar(): void {
    const idPeriodo = this.periodoSeleccionado();
    if (idPeriodo === null || this.procesando()) return;

    this.procesando.set(true);
    this.rolPagoService.generar(idPeriodo).subscribe({
      next: (generados) => {
        this.procesando.set(false);
        this.avisar(`${generados ?? 0} rol(es) de pago generados.`);
        this.recargar();
      },
      error: (err) => {
        this.procesando.set(false);
        this.avisar(this.mensajeDeError(err, 'No se pudieron generar los roles de pago.'), true);
      },
    });
  }

  /**
   * Contrasta el rol contra su nómina. Un `false` no es un error de la pantalla: significa que
   * el rol entregado ya no coincide con los valores vigentes y hay que regenerarlo.
   */
  verificar(rol: any): void {
    this.rolPagoService.verificar(rol.codigo).subscribe({
      next: (integro) => {
        const mapa = new Map(this.verificaciones());
        mapa.set(rol.codigo, integro === true);
        this.verificaciones.set(mapa);
        this.avisar(
          integro
            ? `El rol ${rol.numero || rol.codigo} coincide con su nómina.`
            : `El rol ${rol.numero || rol.codigo} ya no coincide con su nómina: hay que regenerarlo.`,
          integro !== true,
        );
      },
      error: (err) => this.avisar(this.mensajeDeError(err, 'No se pudo verificar el rol.'), true),
    });
  }

  /** Registra la recepción de los roles marcados. */
  registrarRecepcion(): void {
    const codigos = this.seleccion.valores();
    if (codigos.length === 0 || this.procesando()) return;

    this.procesando.set(true);
    this.rolPagoService.registrarRecepcion(codigos).subscribe({
      // El número lo devuelve el servidor: puede ser menor que lo marcado si alguno ya constaba
      next: (marcados) => {
        this.procesando.set(false);
        this.avisar(`Recepción registrada en ${marcados ?? 0} rol(es).`);
        this.recargar();
      },
      error: (err) => {
        this.procesando.set(false);
        this.avisar(this.mensajeDeError(err, 'No se pudo registrar la recepción.'), true);
      },
    });
  }

  // ─── Selección ─────────────────────────────────────────────────────────────

  alternarSeleccion(rol: any): void {
    this.seleccion.alternar(rol.codigo);
  }

  alternarTodos(): void {
    if (this.todosSeleccionados()) {
      this.seleccion.limpiar();
      return;
    }
    this.seleccion.fijar(this.seleccionables().map((rol) => rol.codigo));
  }

  estaSeleccionado(rol: any): boolean {
    return this.seleccion.contiene(rol.codigo);
  }

  admiteRecepcion(rol: any): boolean {
    return admiteRecepcion(rol);
  }

  /** `undefined` mientras no se haya verificado; luego `true` íntegro o `false` desactualizado. */
  resultadoVerificacion(rol: any): boolean | undefined {
    return this.verificaciones().get(rol.codigo);
  }

  /** Descarga el rol individual en PDF, por `POST /rest/rprt/generar` con `modulo: 'rhh'`. */
  descargarPdf(rol: any): void {
    this.descargando.set(rol.codigo);

    this.jasperService
      .generar('rhh', ReportesNomina.ROL_INDIVIDUAL, {
        P_RLPG_CODIGO: rol.codigo,
        P_USUARIO: usuarioSesion(),
      })
      .subscribe({
        next: (blob) => {
          this.descargando.set(null);
          guardarArchivo(blob, `rol-pago-${rol.numero || rol.codigo}.pdf`);
        },
        error: (err) => {
          this.descargando.set(null);
          mensajeReporteFallido(err).then((mensaje) => this.avisar(mensaje, true));
        },
      });
  }

  private criterios(idPeriodo: number): DatosBusqueda[] {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'nomina.periodoNomina',
      'codigo',
      idPeriodo.toString(),
      TipoComandosBusqueda.IGUAL,
    );

    const orden = new DatosBusqueda();
    orden.orderBy('numero');

    return [db, orden];
  }

  private formatear(registros: RolPago[]): any[] {
    return registros.map((row) => ({
      ...row,
      empleadoLabel: this.etiquetaEmpleado(row.nomina?.empleado),
      estadoRolLabel: etiquetaEstadoRol(row),
      estadoRolClase: `estado-${estadoRol(row)}`,
    }));
  }

  etiquetaEmpleado(empleado: any): string {
    if (!empleado) return '—';
    return `${empleado.identificacion ?? ''} — ${empleado.apellidos ?? ''} ${empleado.nombres ?? ''}`.trim();
  }

  etiquetaPeriodo(periodo: PeriodoNomina): string {
    return `${periodo.mes}/${periodo.anio}`;
  }

  exportarCsv(): void {
    this.exportService.exportToCSV(
      this.roles(),
      'roles-pago',
      ['Número', 'Colaborador', 'Emisión', 'Ingresos', 'Descuentos', 'Neto', 'Estado'],
      [
        'numero',
        'empleadoLabel',
        'fechaEmision',
        'totalIngresos',
        'totalDescuentos',
        'neto',
        'estadoRolLabel',
      ],
    );
  }

  /** El backend devuelve el mensaje en el cuerpo del error; si no lo trae, se usa el genérico. */
  private mensajeDeError(error: any, generico: string): string {
    if (typeof error === 'string' && error.trim()) return error;
    return error?.mensaje || error?.message || generico;
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
