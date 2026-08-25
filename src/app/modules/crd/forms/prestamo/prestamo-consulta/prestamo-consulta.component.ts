import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
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
import { Observable, Subject, forkJoin, from, of } from 'rxjs';
import { catchError, filter, map, mergeMap, take, takeUntil } from 'rxjs/operators';

import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { ExportService } from '../../../../../shared/services/export.service';
import {
  FuncionesDatosService,
  TipoFormatoFechaBackend,
} from '../../../../../shared/services/funciones-datos.service';
import { PrestamoDetalleDialogComponent } from '../../../dialog/prestamo-detalle-dialog/prestamo-detalle-dialog.component';
import { DetallePrestamo } from '../../../model/detalle-prestamo';
import {
  CodigoEstadoCuota,
  obtenerCodigoEstadoCuota,
} from '../../../model/estado-cuota-prestamo';
import { EstadoParticipe } from '../../../model/estado-participe';
import { EstadoPrestamo } from '../../../model/estado-prestamo';
import { Filial } from '../../../model/filial';
import { Prestamo } from '../../../model/prestamo';
import { Producto } from '../../../model/producto';
import { DetallePrestamoService } from '../../../service/detalle-prestamo.service';
import { EstadoParticipeService } from '../../../service/estado-participe.service';
import { EstadoPrestamoService } from '../../../service/estado-prestamo.service';
import { FilialService } from '../../../service/filial.service';
import { PrestamoService } from '../../../service/prestamo.service';
import { ProductoService } from '../../../service/producto.service';

/**
 * Peticiones simultáneas de cuotas al backend. No existe un endpoint que devuelva el conteo
 * agregado, así que la columna "Cuotas en Mora" pide la tabla de amortización préstamo por
 * préstamo; el tope evita saturar el backend al paginar de a 100 filas o al exportar.
 */
const CONCURRENCIA_CUOTAS_MORA = 6;

/** Conteo de cuotas en mora de un préstamo, o el estado de su carga. */
type EstadoCuotasMora = 'cargando' | 'error' | number;

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
export class PrestamoConsultaComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('fechaDesdeInput', { read: ElementRef }) fechaDesdeInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaHastaInput', { read: ElementRef }) fechaHastaInputRef!: ElementRef<HTMLInputElement>;
  private _rawFechaDesde = '';
  private _rawFechaHasta = '';

  loading = signal<boolean>(false);
  error = signal<string>('');
  busquedaRealizada = signal<boolean>(false);

  /**
   * Cuotas vencidas impagas por código de préstamo. Se llena bajo demanda: solo se consultan
   * los préstamos que la tabla está renderizando (página y orden actuales) y los que falten
   * al momento de exportar.
   */
  cuotasMora = signal<Map<number, EstadoCuotasMora>>(new Map());
  private readonly cuotasMora$ = toObservable(this.cuotasMora);
  private readonly destroy$ = new Subject<void>();
  calculandoCuotasMoraExport = signal<boolean>(false);

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
    'cuotasMora',
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
    private detallePrestamoService: DetallePrestamoService,
    private exportService: ExportService,
    private funcionesDatos: FuncionesDatosService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarOpciones();
  }

  ngAfterViewInit(): void {
    // `connect()` emite las filas realmente renderizadas (ya ordenadas y paginadas), así que
    // basta escucharlo para cargar el conteo de la página visible cuando el usuario pagina,
    // ordena o lanza una búsqueda nueva.
    this.dataSource
      .connect()
      .pipe(takeUntil(this.destroy$))
      .subscribe((filas) => this.cargarCuotasMora(filas));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
        this.cuotasMora.set(new Map());
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

  capturarFechaDesdeRaw(event: Event): void {
    this._rawFechaDesde = (event.target as HTMLInputElement).value;
  }

  syncFechaDesdeFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaDesde || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaDesde = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatos.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.filtrosForm.get('fechaDesde')?.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.fechaDesdeInputRef?.nativeElement) this.fechaDesdeInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaDesdePickerChange(date: Date | null | undefined): void {
    this.filtrosForm.get('fechaDesde')?.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatos.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.fechaDesdeInputRef?.nativeElement) this.fechaDesdeInputRef.nativeElement.value = formatted;
    });
  }

  capturarFechaHastaRaw(event: Event): void {
    this._rawFechaHasta = (event.target as HTMLInputElement).value;
  }

  syncFechaHastaFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaHasta || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaHasta = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatos.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.filtrosForm.get('fechaHasta')?.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.fechaHastaInputRef?.nativeElement) this.fechaHastaInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaHastaPickerChange(date: Date | null | undefined): void {
    this.filtrosForm.get('fechaHasta')?.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatos.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.fechaHastaInputRef?.nativeElement) this.fechaHastaInputRef.nativeElement.value = formatted;
    });
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
    this.cuotasMora.set(new Map());
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

    const estado = this.estadosParticipesOptions().find((e) => e.codigoExterno === idEstado);
    return estado?.nombre || `Estado ${idEstado}`;
  }

  obtenerClaseEstadoParticipe(p: Prestamo): string {
    const idEstado = p.entidad?.idEstado;
    if (idEstado === undefined || idEstado === null) {
      return 'estado-desconocido';
    }

    const estado = this.estadosParticipesOptions().find((e) => e.codigoExterno === idEstado);
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

  // ===================== Cuotas en mora =====================

  /**
   * Resuelve el conteo de cuotas en mora de los préstamos que todavía no lo tengan.
   *
   * El backend no expone un agregado, así que se pide la tabla de amortización de cada
   * préstamo y se cuenta en el cliente. Solo se consultan los préstamos que se van a
   * mostrar, para no traer las cuotas de todo el resultado de la búsqueda.
   */
  private cargarCuotasMora(prestamos: readonly Prestamo[]): void {
    const actual = this.cuotasMora();
    const pendientes = Array.from(
      new Set(
        prestamos
          .map((prestamo) => prestamo?.codigo)
          .filter((codigo): codigo is number => codigo != null && !actual.has(codigo)),
      ),
    );

    if (!pendientes.length) {
      return;
    }

    const enCurso = new Map(actual);
    pendientes.forEach((codigo) => enCurso.set(codigo, 'cargando'));
    this.cuotasMora.set(enCurso);

    from(pendientes)
      .pipe(
        mergeMap(
          (codigo) => this.consultarCuotasEnMora(codigo).pipe(map((total) => ({ codigo, total }))),
          CONCURRENCIA_CUOTAS_MORA,
        ),
        takeUntil(this.destroy$),
      )
      .subscribe(({ codigo, total }) => {
        const actualizado = new Map(this.cuotasMora());
        actualizado.set(codigo, total);
        this.cuotasMora.set(actualizado);
      });
  }

  private consultarCuotasEnMora(codigoPrestamo: number): Observable<EstadoCuotasMora> {
    const criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatos.LONG,
      'prestamo',
      'codigo',
      String(codigoPrestamo),
      TipoComandosBusqueda.IGUAL,
    );

    return this.detallePrestamoService.selectByCriteria([criterio]).pipe(
      map((detalles) => this.contarCuotasEnMora(detalles || [])),
      catchError(() => of<EstadoCuotasMora>('error')),
    );
  }

  /**
   * Cuota en mora = vence antes de hoy y no está PAGADA ni CANCELADA_ANTICIPADA.
   *
   * Es el mismo criterio de la corrida de mora del backend (`selectCuotasVencidasByPrestamo`),
   * y no el estado EN_MORA de la cuota: una cuota vencida con abono queda en PARCIAL y la
   * corrida no la sobreescribe, pero sigue estando en mora.
   */
  private contarCuotasEnMora(detalles: DetallePrestamo[]): number {
    const corte = new Date();
    corte.setHours(0, 0, 0, 0);

    return detalles.filter((detalle) => {
      const estado = obtenerCodigoEstadoCuota(detalle);
      if (
        estado === CodigoEstadoCuota.PAGADA ||
        estado === CodigoEstadoCuota.CANCELADA_ANTICIPADA
      ) {
        return false;
      }
      const vencimiento = this.convertirFecha(detalle.fechaVencimiento);
      return !!vencimiento && vencimiento.getTime() < corte.getTime();
    }).length;
  }

  cuotasMoraCargando(p: Prestamo): boolean {
    const valor = p?.codigo != null ? this.cuotasMora().get(p.codigo) : undefined;
    return valor === undefined || valor === 'cargando';
  }

  cuotasMoraConError(p: Prestamo): boolean {
    return p?.codigo != null && this.cuotasMora().get(p.codigo) === 'error';
  }

  cuotasEnMora(p: Prestamo): number {
    const valor = p?.codigo != null ? this.cuotasMora().get(p.codigo) : undefined;
    return typeof valor === 'number' ? valor : 0;
  }

  claseCuotasMora(p: Prestamo): string {
    return this.cuotasEnMora(p) > 0 ? 'cuotas-mora-atraso' : 'cuotas-mora-al-dia';
  }

  tooltipCuotasMora(p: Prestamo): string {
    const total = this.cuotasEnMora(p);
    if (total === 0) {
      return 'Sin cuotas vencidas pendientes de pago';
    }
    return total === 1
      ? '1 cuota vencida pendiente de pago'
      : `${total} cuotas vencidas pendientes de pago`;
  }

  /**
   * Ejecuta `continuar` cuando todos los préstamos indicados ya tienen resuelto su conteo.
   *
   * La tabla solo consulta la página visible, así que al exportar hay que completar el resto:
   * es una petición por préstamo, por eso se avisa al usuario mientras terminan.
   */
  private conCuotasMoraResueltas(prestamos: Prestamo[], continuar: () => void): void {
    this.cargarCuotasMora(prestamos);

    const codigos = prestamos
      .map((prestamo) => prestamo?.codigo)
      .filter((codigo): codigo is number => codigo != null);

    const resueltas = (mapa: Map<number, EstadoCuotasMora>) =>
      codigos.every((codigo) => {
        const valor = mapa.get(codigo);
        return valor !== undefined && valor !== 'cargando';
      });

    if (resueltas(this.cuotasMora())) {
      continuar();
      return;
    }

    this.calculandoCuotasMoraExport.set(true);
    this.snackBar.open('Calculando cuotas en mora para la exportación...', 'Cerrar', {
      duration: 3000,
    });

    this.cuotasMora$.pipe(filter(resueltas), take(1), takeUntil(this.destroy$)).subscribe(() => {
      this.calculandoCuotasMoraExport.set(false);
      continuar();
    });
  }

  /** En la exportación una consulta fallida va vacía, para no confundirla con un cero real. */
  private valorExportCuotasMora(p: Prestamo): number | string {
    return this.cuotasMoraConError(p) ? '' : this.cuotasEnMora(p);
  }

  exportarCSV(): void {
    const data = this.prestamos();
    if (!data.length) {
      this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 2500 });
      return;
    }

    this.conCuotasMoraResueltas(data, () => this.generarCSV(data));
  }

  private generarCSV(data: Prestamo[]): void {
    const rows = data.map((p) => ({
      Codigo: p.codigo,
      NumeroPrestamo: p.idAsoprep,
      Entidad: p.entidad?.razonSocial || p.entidad?.nombreComercial || '',
      Identificacion: p.entidad?.numeroIdentificacion || '',
      EstadoParticipe: this.obtenerEstadoParticipe(p),
      EstadoPrestamo: this.obtenerEstadoPrestamo(p),
      CuotasEnMora: this.valorExportCuotasMora(p),
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
      'CuotasEnMora',
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

    this.conCuotasMoraResueltas(data, () => this.generarPDF(data));
  }

  private generarPDF(data: Prestamo[]): void {
    const rows = data.map((p) => ({
      codigo: String(p.codigo || ''),
      numero: String(p.idAsoprep || ''),
      entidad: p.entidad?.razonSocial || p.entidad?.nombreComercial || '',
      estadoParticipe: this.obtenerEstadoParticipe(p),
      estadoPrestamo: this.obtenerEstadoPrestamo(p),
      cuotasMora: String(this.valorExportCuotasMora(p)),
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
      'Cuotas Mora',
      'Producto',
      'Fecha',
      'Monto',
      'Saldo',
    ];
    const keys = [
      'codigo',
      'numero',
      'entidad',
      'estadoParticipe',
      'estadoPrestamo',
      'cuotasMora',
      'producto',
      'fecha',
      'monto',
      'saldo',
    ];
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
