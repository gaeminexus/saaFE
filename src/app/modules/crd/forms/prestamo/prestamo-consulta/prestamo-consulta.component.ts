import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { ExportService } from '../../../../../shared/services/export.service';
import {
  FuncionesDatosService,
  TipoFormatoFechaBackend,
} from '../../../../../shared/services/funciones-datos.service';
import { PrestamoDetalleDialogComponent } from '../../../dialog/prestamo-detalle-dialog/prestamo-detalle-dialog.component';
import { EstadoParticipe } from '../../../model/estado-participe';
import { EstadoPrestamo } from '../../../model/estado-prestamo';
import { Filial } from '../../../model/filial';
import { Prestamo } from '../../../model/prestamo';
import { Producto } from '../../../model/producto';
import { EstadoParticipeService } from '../../../service/estado-participe.service';
import { EstadoPrestamoService } from '../../../service/estado-prestamo.service';
import { FilialService } from '../../../service/filial.service';
import { PrestamoService } from '../../../service/prestamo.service';
import { ProductoService } from '../../../service/producto.service';

@Component({
  selector: 'app-prestamo-consulta.component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
  ],
  templateUrl: './prestamo-consulta.component.html',
  styleUrl: './prestamo-consulta.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class PrestamoConsultaComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  loading = signal<boolean>(false);
  error = signal<string>('');
  busquedaRealizada = signal<boolean>(false);

  filialesOptions = signal<Filial[]>([]);
  productosOptions = signal<Producto[]>([]);
  estadosOptions = signal<EstadoPrestamo[]>([]);
  estadosParticipesOptions = signal<EstadoParticipe[]>([]);
  prestamos = signal<Prestamo[]>([]);

  filtrosPrincipalesExpandidos = true;
  filtrosAvanzadosExpandidos = false;

  dataSource = new MatTableDataSource<Prestamo>([]);
  displayedColumns: string[] = [
    'codigo',
    'idAsoprep',
    'entidad',
    'estadoParticipe',
    'producto',
    'fecha',
    'estadoPrestamo',
    'montoSolicitado',
    'totalPagado',
    'saldoTotal',
    'acciones',
  ];

  filtrosForm = new FormGroup({
    idAsoprep: new FormControl<string>(''),
    numeroIdentificacion: new FormControl<string>(''),
    razonSocial: new FormControl<string>(''),
    producto: new FormControl<number | null>(null),
    estadoPrestamo: new FormControl<number | null>(null),
    fechaDesde: new FormControl<Date | null>(null),
    fechaHasta: new FormControl<Date | null>(null),
    filial: new FormControl<number | null>(null),
    montoDesde: new FormControl<number | null>(null),
    montoHasta: new FormControl<number | null>(null),
    saldoDesde: new FormControl<number | null>(null),
    saldoHasta: new FormControl<number | null>(null),
    plazo: new FormControl<number | null>(null),
    esNovacion: new FormControl<number | null>(null),
    reestructurado: new FormControl<number | null>(null),
    refinanciado: new FormControl<number | null>(null),
  });

  binarioOptions = [
    { value: null, label: 'Todos' },
    { value: 1, label: 'Sí' },
    { value: 0, label: 'No' },
  ];

  constructor(
    private prestamoService: PrestamoService,
    private filialService: FilialService,
    private productoService: ProductoService,
    private estadoPrestamoService: EstadoPrestamoService,
    private estadoParticipeService: EstadoParticipeService,
    private exportService: ExportService,
    private funcionesDatos: FuncionesDatosService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarOpciones();
  }

  private cargarOpciones(): void {
    forkJoin({
      filiales: this.filialService.getAll(),
      productos: this.productoService.getAll(),
      estados: this.estadoPrestamoService.getAll(),
      estadosParticipes: this.estadoParticipeService.getAll(),
    }).subscribe({
      next: (res) => {
        this.filialesOptions.set(res.filiales || []);
        this.productosOptions.set(res.productos || []);
        this.estadosParticipesOptions.set(res.estadosParticipes || []);
        this.estadosOptions.set(res.estados || []);
      },
      error: () => {
        this.snackBar.open('No se pudieron cargar las opciones de filtros', 'Cerrar', {
          duration: 3500,
        });
      },
    });
  }

  buscar(): void {
    this.loading.set(true);
    this.error.set('');

    const criterios = this.buildCriteriosBase();

    this.prestamoService.selectByCriteria(criterios).subscribe({
      next: (result) => {
        const prestamos = (result || []).map((p) => this.normalizarPrestamo(p));
        this.prestamos.set(prestamos);
        this.dataSource.data = prestamos;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.busquedaRealizada.set(true);
        this.loading.set(false);

        if (this.paginator) {
          this.paginator.firstPage();
        }

        if (!prestamos.length) {
          this.snackBar.open(
            'No se encontraron préstamos con los criterios seleccionados',
            'Cerrar',
            {
              duration: 3000,
            },
          );
        }
      },
      error: () => {
        this.loading.set(false);
        this.busquedaRealizada.set(true);
        this.prestamos.set([]);
        this.dataSource.data = [];
        this.error.set('Error al consultar préstamos');
      },
    });
  }

  private buildCriteriosBase(): DatosBusqueda[] {
    const criterios: DatosBusqueda[] = [];
    const v = this.filtrosForm.getRawValue();

    if (v.idAsoprep?.trim()) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(
        TipoDatos.LONG,
        'idAsoprep',
        v.idAsoprep.trim(),
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(c);
    }

    if (v.numeroIdentificacion?.trim()) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(
        TipoDatos.STRING,
        'entidad.numeroIdentificacion',
        v.numeroIdentificacion.trim(),
        TipoComandosBusqueda.LIKE,
      );
      criterios.push(c);
    }

    if (v.razonSocial?.trim()) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(
        TipoDatos.STRING,
        'entidad.razonSocial',
        v.razonSocial.trim(),
        TipoComandosBusqueda.LIKE,
      );
      criterios.push(c);
    }

    if (v.producto) {
      const c = new DatosBusqueda();
      c.asignaValorConCampoPadre(
        TipoDatos.LONG,
        'producto',
        'codigo',
        String(v.producto),
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(c);
    }

    if (v.estadoPrestamo) {
      // idEstado = codigoExterno del catálogo (PRSTIDST en el backend)
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(
        TipoDatos.LONG,
        'idEstado',
        String(v.estadoPrestamo),
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(c);
    }

    if (v.filial) {
      const c = new DatosBusqueda();
      c.asignaValorConCampoPadre(
        TipoDatos.LONG,
        'filial',
        'codigo',
        String(v.filial),
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(c);
    }

    if (v.plazo !== null && v.plazo !== undefined) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(
        TipoDatos.INTEGER,
        'plazo',
        String(v.plazo),
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(c);
    }

    this.agregarRangoFechas(criterios, v.fechaDesde, v.fechaHasta);
    this.agregarRangoNumerico(criterios, 'montoSolicitado', v.montoDesde, v.montoHasta);
    this.agregarRangoNumerico(criterios, 'saldoTotal', v.saldoDesde, v.saldoHasta);
    this.agregarBinario(criterios, 'esNovacion', v.esNovacion);
    this.agregarBinario(criterios, 'reestructurado', v.reestructurado);
    this.agregarBinario(criterios, 'refinanciado', v.refinanciado);

    const orderFecha = new DatosBusqueda();
    orderFecha.orderBy('fecha');
    orderFecha.setTipoOrden(DatosBusqueda.ORDER_DESC);
    criterios.push(orderFecha);

    const orderCodigo = new DatosBusqueda();
    orderCodigo.orderBy('codigo');
    orderCodigo.setTipoOrden(DatosBusqueda.ORDER_DESC);
    criterios.push(orderCodigo);

    return criterios;
  }

  private agregarRangoFechas(
    criterios: DatosBusqueda[],
    desde: Date | null,
    hasta: Date | null,
  ): void {
    if (desde && hasta) {
      const d1 = this.funcionesDatos.formatearFechaParaBackend(
        desde,
        TipoFormatoFechaBackend.SOLO_FECHA,
      );
      const d2 = this.funcionesDatos.formatearFechaParaBackend(
        hasta,
        TipoFormatoFechaBackend.SOLO_FECHA,
      );
      if (d1 && d2) {
        const c = new DatosBusqueda();
        c.asignaUnCampoConBetween('fecha', TipoDatos.DATE, d1, TipoComandosBusqueda.BETWEEN, d2);
        criterios.push(c);
      }
      return;
    }

    if (desde) {
      const d1 = this.funcionesDatos.formatearFechaParaBackend(
        desde,
        TipoFormatoFechaBackend.SOLO_FECHA,
      );
      if (d1) {
        const c = new DatosBusqueda();
        c.asignaUnCampoSinTrunc(TipoDatos.DATE, 'fecha', d1, TipoComandosBusqueda.MAYOR_IGUAL);
        criterios.push(c);
      }
    }

    if (hasta) {
      const d2 = this.funcionesDatos.formatearFechaParaBackend(
        hasta,
        TipoFormatoFechaBackend.SOLO_FECHA,
      );
      if (d2) {
        const c = new DatosBusqueda();
        c.asignaUnCampoSinTrunc(TipoDatos.DATE, 'fecha', d2, TipoComandosBusqueda.MENOR_IGUAL);
        criterios.push(c);
      }
    }
  }

  private agregarRangoNumerico(
    criterios: DatosBusqueda[],
    campo: string,
    desde: number | null,
    hasta: number | null,
  ): void {
    if (desde !== null && desde !== undefined && hasta !== null && hasta !== undefined) {
      const c = new DatosBusqueda();
      c.asignaUnCampoConBetween(
        campo,
        TipoDatos.DOUBLE,
        String(desde),
        TipoComandosBusqueda.BETWEEN,
        String(hasta),
      );
      criterios.push(c);
      return;
    }

    if (desde !== null && desde !== undefined) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(
        TipoDatos.DOUBLE,
        campo,
        String(desde),
        TipoComandosBusqueda.MAYOR_IGUAL,
      );
      criterios.push(c);
    }

    if (hasta !== null && hasta !== undefined) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(
        TipoDatos.DOUBLE,
        campo,
        String(hasta),
        TipoComandosBusqueda.MENOR_IGUAL,
      );
      criterios.push(c);
    }
  }

  private agregarBinario(criterios: DatosBusqueda[], campo: string, valor: number | null): void {
    if (valor === null || valor === undefined) {
      return;
    }
    const c = new DatosBusqueda();
    c.asignaUnCampoSinTrunc(TipoDatos.INTEGER, campo, String(valor), TipoComandosBusqueda.IGUAL);
    criterios.push(c);
  }

  private normalizarPrestamo(prestamo: Prestamo): Prestamo {
    return {
      ...prestamo,
      fecha: this.convertirFecha(prestamo.fecha) || prestamo.fecha,
      fechaInicio: this.convertirFecha(prestamo.fechaInicio) || prestamo.fechaInicio,
      fechaFin: this.convertirFecha(prestamo.fechaFin) || prestamo.fechaFin,
      fechaRegistro: this.convertirFecha(prestamo.fechaRegistro) || prestamo.fechaRegistro,
      fechaModificacion:
        this.convertirFecha(prestamo.fechaModificacion) || prestamo.fechaModificacion,
      fechaAprobacion: this.convertirFecha(prestamo.fechaAprobacion) || prestamo.fechaAprobacion,
      fechaAdjudicacion:
        this.convertirFecha(prestamo.fechaAdjudicacion) || prestamo.fechaAdjudicacion,
      fechaRechazo: this.convertirFecha(prestamo.fechaRechazo) || prestamo.fechaRechazo,
      fechaLegalizacion:
        this.convertirFecha(prestamo.fechaLegalizacion) || prestamo.fechaLegalizacion,
      fechaAcreditacion:
        this.convertirFecha(prestamo.fechaAcreditacion) || prestamo.fechaAcreditacion,
    };
  }

  private convertirFecha(fecha: any): Date | null {
    if (!fecha) return null;
    if (Array.isArray(fecha)) {
      const [year, month, day, hour = 0, minute = 0, second = 0, nanoseconds = 0] = fecha;
      const ms = Math.floor(nanoseconds / 1000000);
      return new Date(year, month - 1, day, hour, minute, second, ms);
    }
    if (fecha instanceof Date) return fecha;
    if (typeof fecha === 'string' || typeof fecha === 'number') return new Date(fecha);
    return null;
  }

  limpiarFiltros(): void {
    this.filtrosForm.patchValue({
      idAsoprep: '',
      numeroIdentificacion: '',
      razonSocial: '',
      producto: null,
      estadoPrestamo: null,
      fechaDesde: null,
      fechaHasta: null,
      filial: null,
      montoDesde: null,
      montoHasta: null,
      saldoDesde: null,
      saldoHasta: null,
      plazo: null,
      esNovacion: null,
      reestructurado: null,
      refinanciado: null,
    });
    this.prestamos.set([]);
    this.dataSource.data = [];
    this.busquedaRealizada.set(false);
  }

  /**
   * Obtiene el nombre del estado del préstamo buscando en el catálogo cargado.
   * Busca por codigoExterno o codigoAlterno en estadosOptions.
   */
  private obtenerNombreEstadoPrestamo(codigoAlterno: number, nombreFallback?: string): string {
    // Buscar en catálogo cargado por codigoExterno o codigoAlterno (NO por codigo/PK)
    const estado = this.estadosOptions().find(
      (e) => e.codigoExterno === codigoAlterno || e.codigoAlterno === codigoAlterno
    );

    if (estado?.nombre) {
      return estado.nombre;
    }

    // Si viene un nombreFallback del backend, usarlo
    if (nombreFallback) {
      return nombreFallback;
    }

    // Último recurso: mostrar código
    console.warn(`Estado de préstamo no encontrado en catálogo: código ${codigoAlterno}`);
    return `Estado ${codigoAlterno}`;
  }

  private resolverNombreEstado(p: Prestamo): string {
    if (p.estadoPrestamo?.nombre) return p.estadoPrestamo.nombre;
    if (p.idEstado) {
      return this.obtenerNombreEstadoPrestamo(p.idEstado);
    }
    return '';
  }

  obtenerEstadoPrestamo(p: Prestamo): string {
    // Normalizar estadoPrestamo: el backend puede enviar el estado de varias formas
    const estadoObjeto = typeof p.estadoPrestamo === 'object' && p.estadoPrestamo ? p.estadoPrestamo : null;
    const nombreOriginal: string | undefined = estadoObjeto?.nombre;

    // p.idEstado es el código alterno/externo del estado préstamo (PRSTIDST en BD)
    const codigoAltEstado =
      p.idEstado ??
      (typeof p.estadoPrestamo === 'number' ? p.estadoPrestamo : null) ??
      (estadoObjeto
        ? (estadoObjeto.codigoExterno ?? estadoObjeto.codigoAlterno ?? null)
        : null);

    if (codigoAltEstado != null) {
      return this.obtenerNombreEstadoPrestamo(codigoAltEstado, nombreOriginal);
    }

    // Si ya viene el nombre en el objeto, usarlo
    if (nombreOriginal) {
      return nombreOriginal;
    }

    return '-';
  }

  obtenerClaseEstadoPrestamo(p: Prestamo): string {
    // Usar el método normalizado para obtener el nombre del estado
    const nombreEstado = this.obtenerEstadoPrestamo(p).toLowerCase();
    if (!nombreEstado || nombreEstado === '-') {
      return 'estado-desconocido';
    }

    // Estados de préstamo: Vigente, Cancelado, Vencido, Mora, etc.
    if (nombreEstado.includes('vigente') || nombreEstado.includes('activo')) {
      return 'estado-prestamo-vigente';
    }
    if (nombreEstado.includes('cancelado') || nombreEstado.includes('liquidado') || nombreEstado.includes('pagado')) {
      return 'estado-prestamo-cancelado';
    }
    if (nombreEstado.includes('vencido') || nombreEstado.includes('mora')) {
      return 'estado-prestamo-vencido';
    }
    if (nombreEstado.includes('pendiente') || nombreEstado.includes('proceso') || nombreEstado.includes('aprobacion')) {
      return 'estado-prestamo-pendiente';
    }
    if (nombreEstado.includes('suspendido') || nombreEstado.includes('congelado')) {
      return 'estado-prestamo-suspendido';
    }
    if (nombreEstado.includes('rechazado') || nombreEstado.includes('anulado')) {
      return 'estado-prestamo-rechazado';
    }

    return 'estado-desconocido';
  }

  obtenerEstadoParticipe(p: Prestamo): string {
    const idEstado = p.entidad?.idEstado;
    if (idEstado === undefined || idEstado === null) {
      return '-';
    }

    const estado = this.estadosParticipesOptions().find((e) => e.codigo === idEstado);
    return estado?.nombre || `Estado ${idEstado}`;
  }

  obtenerClaseEstadoParticipe(p: Prestamo): string {
    const idEstado = p.entidad?.idEstado;
    if (idEstado === undefined || idEstado === null) {
      return 'estado-desconocido';
    }

    const estado = this.estadosParticipesOptions().find((e) => e.codigo === idEstado);
    const nombreEstado = estado?.nombre?.toLowerCase() || '';

    // Mapeo específico por palabras clave
    // IMPORTANTE: 'activo' debe ir ANTES de 'inactivo' para evitar falsos positivos
    if (nombreEstado.includes('activo') && !nombreEstado.includes('inactivo')) {
      return 'estado-activo';
    }
    if (nombreEstado.includes('aprobado')) {
      return 'estado-activo';
    }
    if (nombreEstado.includes('rechazado')) {
      return 'estado-inactivo';
    }
    if (nombreEstado.includes('pendiente')) {
      return 'estado-pendiente';
    }
    if (nombreEstado.includes('inactivo')) {
      return 'estado-suspendido';
    }
    if (nombreEstado.includes('proceso')) {
      return 'estado-revision';
    }
    if (nombreEstado.includes('cesado') || nombreEstado.includes('cesante')) {
      return 'estado-cesado';
    }
    if (nombreEstado.includes('jubilado')) {
      return 'estado-jubilado';
    }
    if (nombreEstado.includes('fallecida') || nombreEstado.includes('fallecido')) {
      return 'estado-fallecido';
    }
    if (nombreEstado.includes('desafiliacion') || nombreEstado.includes('desafiliado')) {
      return 'estado-desafiliado';
    }
    if (nombreEstado.includes('disponible')) {
      return 'estado-disponible';
    }
    if (nombreEstado.includes('pension')) {
      return 'estado-pension';
    }
    if (nombreEstado.includes('aportar')) {
      return 'estado-aportar';
    }

    return 'estado-desconocido';
  }

  exportarCSV(): void {
    const data = this.prestamos();
    if (!data.length) {
      this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 2500 });
      return;
    }

    const rows = data.map((p) => ({
      Codigo: p.codigo,
      NumeroPrestamo: p.idAsoprep,
      Entidad: p.entidad?.razonSocial || p.entidad?.nombreComercial || '',
      Identificacion: p.entidad?.numeroIdentificacion || '',
      EstadoParticipe: this.obtenerEstadoParticipe(p),
      EstadoPrestamo: this.obtenerEstadoPrestamo(p),
      Producto: p.producto?.nombre || '',
      Fecha: p.fecha ? new Date(p.fecha).toLocaleDateString('es-ES') : '',
      MontoSolicitado: p.montoSolicitado || 0,
      TotalPagado: p.totalPagado || 0,
      SaldoTotal: p.saldoTotal || 0,
    }));

    const headers = [
      'Codigo',
      'NumeroPrestamo',
      'Entidad',
      'Identificacion',
      'EstadoParticipe',
      'EstadoPrestamo',
      'Producto',
      'Fecha',
      'MontoSolicitado',
      'TotalPagado',
      'SaldoTotal',
    ];

    this.exportService.exportToCSV(rows, 'prestamos-consulta', headers, headers);
  }

  exportarPDF(): void {
    const data = this.prestamos();
    if (!data.length) {
      this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 2500 });
      return;
    }

    const rows = data.map((p) => ({
      codigo: String(p.codigo || ''),
      numero: String(p.idAsoprep || ''),
      entidad: p.entidad?.razonSocial || p.entidad?.nombreComercial || '',
      estadoParticipe: this.obtenerEstadoParticipe(p),
      estadoPrestamo: this.obtenerEstadoPrestamo(p),
      producto: p.producto?.nombre || '',
      fecha: p.fecha ? new Date(p.fecha).toLocaleDateString('es-ES') : '',
      monto: String(p.montoSolicitado || 0),
      saldo: String(p.saldoTotal || 0),
    }));

    const headers = [
      'Código',
      'N° Préstamo',
      'Entidad',
      'Estado Partícipe',
      'Estado Préstamo',
      'Producto',
      'Fecha',
      'Monto',
      'Saldo',
    ];
    const keys = ['codigo', 'numero', 'entidad', 'estadoParticipe', 'estadoPrestamo', 'producto', 'fecha', 'monto', 'saldo'];
    this.exportService.exportToPDF(
      rows,
      'prestamos-consulta',
      'Consulta de Préstamos',
      headers,
      keys,
    );
  }

  verDetalle(prestamo: Prestamo): void {
    if (!prestamo?.codigo) {
      return;
    }

    this.dialog.open(PrestamoDetalleDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { codigoPrestamo: prestamo.codigo },
      panelClass: 'prestamo-detalle-dialog',
    });
  }

  abrirIngreso(prestamo: Prestamo): void {
    this.router.navigate(['/menucreditos/prestamo-edit'], {
      state: { prestamo },
    });
  }

  generarTablaDesdeConsulta(prestamo: Prestamo): void {
    this.router.navigate(['/menucreditos/prestamo-edit'], {
      state: { prestamo, enfocarGenerarTabla: true },
    });
  }

  toggleFiltrosPrincipales(): void {
    this.filtrosPrincipalesExpandidos = !this.filtrosPrincipalesExpandidos;
  }

  toggleFiltrosAvanzados(): void {
    this.filtrosAvanzadosExpandidos = !this.filtrosAvanzadosExpandidos;
  }
}
