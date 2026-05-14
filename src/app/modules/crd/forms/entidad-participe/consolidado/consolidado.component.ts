import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { catchError, forkJoin, from, map, mergeMap, of, switchMap, toArray } from 'rxjs';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';

import { Aporte } from '../../../model/aporte';
import { BaseInicialParticipes } from '../../../model/base-inicial-participes';
import { Entidad } from '../../../model/entidad';
import { EstadoParticipe } from '../../../model/estado-participe';
import { TipoAporte } from '../../../model/tipo-aporte';
import { AporteService } from '../../../service/aporte.service';
import { EntidadService } from '../../../service/entidad.service';
import { EstadoParticipeService } from '../../../service/estado-participe.service';
import { TipoAporteService } from '../../../service/tipo-aporte.service';
import { ExportService } from '../../../../../shared/services/export.service';

interface EstadoFiltroOption {
  codigo: number;
  nombre: string;
}

type ColumnaTipoAporte =
  | 'cesantiaPatronal'
  | 'cesantiaPersonal'
  | 'cesantiaRetiroVoluntario'
  | 'jubilacionPatronal'
  | 'jubilacionPersonal'
  | 'jubilacionRetiroVoluntario'
  | 'pensionComplementaria'
  | 'rendimientoCesantiaPersonal'
  | 'rendimientoJubilacionPatronal'
  | 'rendimientoCesantiaPatronal'
  | 'rendimientoJubilacionPersonal';

const TIPO_APORTE_CODIGO_COLUMNA: Readonly<Record<number, ColumnaTipoAporte>> = {
  9: 'jubilacionPersonal',
  11: 'cesantiaPersonal',
  12: 'rendimientoCesantiaPersonal',
  13: 'jubilacionPatronal',
  14: 'cesantiaPatronal',
  15: 'rendimientoJubilacionPatronal',
  16: 'rendimientoCesantiaPatronal',
  21: 'cesantiaRetiroVoluntario',
  22: 'jubilacionRetiroVoluntario',
  23: 'pensionComplementaria',
  24: 'rendimientoJubilacionPersonal',
};

@Component({
  selector: 'app-consolidado',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialFormModule, MatTableModule, MatPaginatorModule],
  templateUrl: './consolidado.component.html',
  styleUrl: './consolidado.component.scss',
})
export class ConsolidadoComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private entidadService = inject(EntidadService);
  private aporteService = inject(AporteService);
  private estadoParticipeService = inject(EstadoParticipeService);
  private tipoAporteService = inject(TipoAporteService);
  private exportService = inject(ExportService);

  filtrosForm!: FormGroup;

  loading = signal<boolean>(false);
  buscado = signal<boolean>(false);
  errorMsg = signal<string>('');

  estadosPermitidos = signal<EstadoFiltroOption[]>([]);
  tiposAporteOptions = signal<TipoAporte[]>([]);

  rowsAll = signal<BaseInicialParticipes[]>([]);
  rowsPage = signal<BaseInicialParticipes[]>([]);

  pageSize = 15;
  pageIndex = 0;

  readonly cols: string[] = [
    'idSaa', 'cedula', 'nombre', 'estadoParticipe',
    'cesantiaPatronal', 'cesantiaPersonal', 'cesantiaRetiroVoluntario',
    'jubilacionPatronal', 'jubilacionPersonal', 'jubilacionRetiroVoluntario',
    'pensionComplementaria',
    'rendimientoCesantiaPersonal', 'rendimientoJubilacionPatronal',
    'rendimientoCesantiaPatronal', 'rendimientoJubilacionPersonal',
    'totalGeneral',
  ];

  readonly meses = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];

  readonly anios = Array.from({ length: 15 }, (_, index) => new Date().getFullYear() - index);

  totalGeneral = computed(() =>
    this.rowsAll().reduce((sum, row) => sum + (row.totalGeneral || 0), 0)
  );

  totalRegistros = computed(() => this.rowsAll().length);

  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarOpciones();
  }

  private inicializarFormulario(): void {
    const ahora = new Date();
    this.filtrosForm = this.fb.group({
      mes: [ahora.getMonth() + 1],
      anio: [ahora.getFullYear()],
      estadoParticipe: [null],
      tipoAporte: [null],
    });
  }

  private cargarOpciones(): void {
    forkJoin({
      estados: this.estadoParticipeService.getAll(),
      tiposAporte: this.tipoAporteService.getAll(),
    }).subscribe({
      next: (result) => {
        const estados = Array.isArray(result.estados) ? result.estados : [];
        const permitidos = estados
          .filter((estado) => this.esEstadoPermitido(estado))
          .map((estado) => ({ codigo: estado.codigo, nombre: estado.nombre }));

        const tiposAporte = Array.isArray(result.tiposAporte) ? result.tiposAporte : [];

        this.estadosPermitidos.set(permitidos);
        this.tiposAporteOptions.set(tiposAporte);
      },
      error: () => {
        this.snackBar.open('Error cargando opciones de filtros', 'Cerrar', { duration: 3000 });
      },
    });
  }

  buscar(): void {
    const { mes, anio, estadoParticipe, tipoAporte } = this.filtrosForm.value;

    if (!mes || !anio) {
      this.snackBar.open('Debe seleccionar mes y año', 'Cerrar', { duration: 3000 });
      return;
    }

    const estadosObjetivo = estadoParticipe
      ? [Number(estadoParticipe)]
      : this.estadosPermitidos().map((item) => item.codigo);

    if (!estadosObjetivo.length) {
      this.snackBar.open('No se encontraron estados permitidos para la consulta', 'Cerrar', {
        duration: 3500,
      });
      return;
    }

    const fechaCorte = this.obtenerFechaCorte(Number(anio), Number(mes));

    this.loading.set(true);
    this.buscado.set(false);
    this.errorMsg.set('');

    const consultasEntidades = estadosObjetivo.map((estado) => this.buscarEntidadesPorEstado(estado));

    forkJoin(consultasEntidades)
      .pipe(
        map((listasPorEstado) => {
          const merged = listasPorEstado.flat();
          const uniqueMap = new Map<number, Entidad>();
          merged.forEach((entidad) => {
            if (entidad?.codigo != null) {
              uniqueMap.set(entidad.codigo, entidad);
            }
          });
          return [...uniqueMap.values()];
        }),
        switchMap((entidades) => {
          if (!entidades.length) {
            return of([] as BaseInicialParticipes[]);
          }

          // Limitar concurrencia a 5 peticiones simultáneas para evitar ERR_INSUFFICIENT_RESOURCES
          return from(entidades).pipe(
            mergeMap(
              (entidad) => this.buscarAportesEntidad(entidad, fechaCorte, tipoAporte),
              5
            ),
            toArray(),
            map((rows) => rows.filter((row): row is BaseInicialParticipes => row !== null))
          );
        })
      )
      .subscribe({
        next: (rows) => {
          this.rowsAll.set(rows);
          this.pageIndex = 0;
          this.actualizarPagina();
          this.loading.set(false);
          this.buscado.set(true);

          if (!rows.length) {
            this.snackBar.open('No se encontraron resultados para los filtros seleccionados', 'Cerrar', {
              duration: 3000,
            });
          }
        },
        error: (error) => {
          this.rowsAll.set([]);
          this.rowsPage.set([]);
          this.loading.set(false);
          this.buscado.set(true);
          this.errorMsg.set('Error al consultar consolidado');
          this.snackBar.open('Error al consultar consolidado: ' + (error?.mensaje || ''), 'Cerrar', {
            duration: 4000,
          });
        },
      });
  }

  limpiar(): void {
    const ahora = new Date();
    this.filtrosForm.reset({
      mes: ahora.getMonth() + 1,
      anio: ahora.getFullYear(),
      estadoParticipe: null,
      tipoAporte: null,
    });

    this.rowsAll.set([]);
    this.rowsPage.set([]);
    this.errorMsg.set('');
    this.buscado.set(false);
    this.pageIndex = 0;

    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.actualizarPagina();
  }

  exportarCsv(): void {
    const data = this.rowsAll();
    if (!data.length) {
      this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 2500 });
      return;
    }

    const fecha = new Date();
    const sello = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}`;
    const filename = `consolidado-participes-${sello}`;

    const headers = [
      'ID SAA',
      'Cedula',
      'Nombre',
      'Estado',
      'Ces. Patronal',
      'Ces. Personal',
      'Ces. Retiro Vol.',
      'Jub. Patronal',
      'Jub. Personal',
      'Jub. Retiro Vol.',
      'Pension Comp.',
      'Rend. Ces. Personal',
      'Rend. Jub. Patronal',
      'Rend. Ces. Patronal',
      'Rend. Jub. Personal',
      'Total General',
    ];

    const dataKeys = [
      'idSaa',
      'cedula',
      'nombre',
      'estadoParticipe',
      'cesantiaPatronal',
      'cesantiaPersonal',
      'cesantiaRetiroVoluntario',
      'jubilacionPatronal',
      'jubilacionPersonal',
      'jubilacionRetiroVoluntario',
      'pensionComplementaria',
      'rendimientoCesantiaPersonal',
      'rendimientoJubilacionPatronal',
      'rendimientoCesantiaPatronal',
      'rendimientoJubilacionPersonal',
      'totalGeneral',
    ];

    this.exportService.exportToCSV(data, filename, headers, dataKeys);
  }

  private actualizarPagina(): void {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.rowsPage.set(this.rowsAll().slice(start, end));
  }

  private buscarEntidadesPorEstado(idEstado: number) {
    const criterios: DatosBusqueda[] = [];

    const criterioEstado = new DatosBusqueda();
    criterioEstado.asignaUnCampoSinTrunc(
      TipoDatos.LONG,
      'idEstado',
      idEstado.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(criterioEstado);

    const criterioOrden = new DatosBusqueda();
    criterioOrden.orderBy('razonSocial');
    criterios.push(criterioOrden);

    return this.entidadService.selectByCriteria(criterios).pipe(
      map((entidades) => (Array.isArray(entidades) ? entidades : []))
    );
  }

  private buscarAportesEntidad(
    entidad: Entidad,
    fechaCorte: string,
    tipoAporteSeleccionado: number | null
  ) {
    if (!entidad.codigo) {
      return of(null);
    }

    const criterios: DatosBusqueda[] = [];

    const criterioEntidad = new DatosBusqueda();
    criterioEntidad.asignaValorConCampoPadre(
      TipoDatos.LONG,
      'entidad',
      'codigo',
      String(entidad.codigo),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(criterioEntidad);

    const criterioTipoActivo = new DatosBusqueda();
    criterioTipoActivo.asignaValorConCampoPadre(
      TipoDatos.LONG,
      'tipoAporte',
      'estado',
      '1',
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(criterioTipoActivo);

    if (tipoAporteSeleccionado) {
      const criterioTipo = new DatosBusqueda();
      criterioTipo.asignaValorConCampoPadre(
        TipoDatos.LONG,
        'tipoAporte',
        'codigo',
        tipoAporteSeleccionado.toString(),
        TipoComandosBusqueda.IGUAL
      );
      criterios.push(criterioTipo);
    }

    return this.aporteService.selectByCriteria(criterios).pipe(
      catchError(() => of([])),
      map((aportes) => {
        const listaAportes = Array.isArray(aportes) ? aportes : [];
        const fechaLimite = this.toTimestamp(`${fechaCorte} 23:59:59`);
        const aportesFiltrados = listaAportes.filter((a) => {
          if (!a.fechaTransaccion) return true;
          const fechaAporte = this.toTimestamp(a.fechaTransaccion);
          if (fechaAporte == null || fechaLimite == null) {
            return true;
          }
          return fechaAporte <= fechaLimite;
        });
        if (tipoAporteSeleccionado && aportesFiltrados.length === 0) {
          return null;
        }
        return this.construirFilaConsolidada(entidad, aportesFiltrados);
      })
    );
  }

  private construirFilaConsolidada(entidad: Entidad, aportes: Aporte[]): BaseInicialParticipes {
    const totales = {
      cesantiaPatronal: 0,
      cesantiaPersonal: 0,
      cesantiaRetiroVoluntario: 0,
      jubilacionPatronal: 0,
      jubilacionPersonal: 0,
      jubilacionRetiroVoluntario: 0,
      pensionComplementaria: 0,
      rendimientoCesantiaPersonal: 0,
      rendimientoJubilacionPatronal: 0,
      rendimientoCesantiaPatronal: 0,
      rendimientoJubilacionPersonal: 0,
    };

    aportes.forEach((aporte) => {
      const tipoNombre = this.normalizarTexto(aporte.tipoAporte?.nombre || '');
      const tipoCodigo = aporte.tipoAporte?.codigo ?? null;
      const valor = this.toSignedNumber(aporte.valor);
      const columna = this.resolverColumnaTipoAporte(tipoCodigo, tipoNombre);

      if (!columna) {
        return;
      }

      totales[columna] += valor;
    });

    const cesantiaPatronal = totales.cesantiaPatronal;
    const cesantiaPersonal = totales.cesantiaPersonal;
    const cesantiaRetiroVoluntario = totales.cesantiaRetiroVoluntario;
    const jubilacionPatronal = totales.jubilacionPatronal;
    const jubilacionPersonal = totales.jubilacionPersonal;
    const jubilacionRetiroVoluntario = totales.jubilacionRetiroVoluntario;
    const pensionComplementaria = totales.pensionComplementaria;
    const rendimientoCesantiaPersonal = totales.rendimientoCesantiaPersonal;
    const rendimientoJubilacionPatronal = totales.rendimientoJubilacionPatronal;
    const rendimientoCesantiaPatronal = totales.rendimientoCesantiaPatronal;
    const rendimientoJubilacionPersonal = totales.rendimientoJubilacionPersonal;

    const totalGeneral =
      cesantiaPatronal +
      cesantiaPersonal +
      cesantiaRetiroVoluntario +
      jubilacionPatronal +
      jubilacionPersonal +
      jubilacionRetiroVoluntario +
      pensionComplementaria +
      rendimientoCesantiaPersonal +
      rendimientoJubilacionPatronal +
      rendimientoCesantiaPatronal +
      rendimientoJubilacionPersonal;

    return {
      numero: 0,
      idSaa: entidad.codigo || 0,
      cedula: entidad.numeroIdentificacion || '',
      nombre: entidad.razonSocial || '',
      estadoParticipe: this.obtenerNombreEstadoPorCodigo(entidad.idEstado),
      cesantiaPatronal,
      cesantiaPersonal,
      cesantiaRetiroVoluntario,
      jubilacionPatronal,
      jubilacionPersonal,
      jubilacionRetiroVoluntario,
      pensionComplementaria,
      rendimientoCesantiaPatronal,
      rendimientoCesantiaPersonal,
      rendimientoJubilacionPatronal,
      rendimientoJubilacionPersonal,
      totalGeneral,
    };
  }

  private resolverColumnaTipoAporte(
    codigoTipo: number | null,
    tipo: string
  ): ColumnaTipoAporte | null {
    if (codigoTipo != null) {
      const columnaPorCodigo = TIPO_APORTE_CODIGO_COLUMNA[codigoTipo];
      if (columnaPorCodigo) {
        return columnaPorCodigo;
      }

      return null;
    }

    return this.inferirColumnaPorNombre(tipo);
  }

  private inferirColumnaPorNombre(tipo: string): ColumnaTipoAporte | null {
    const contiene = (tokens: string[]): boolean => tokens.some((token) => tipo.includes(token));

    if (contiene(['pension', 'pens']) && contiene(['complementaria', 'compl'])) {
      return 'pensionComplementaria';
    }

    if (contiene(['cesantia', 'ces'])) {
      if (contiene(['retiro', 'ret']) && contiene(['voluntario', 'vol'])) {
        return 'cesantiaRetiroVoluntario';
      }
      if (contiene(['patronal', 'patr'])) {
        return 'cesantiaPatronal';
      }
      if (contiene(['personal', 'pers'])) {
        return 'cesantiaPersonal';
      }
    }

    if (contiene(['jubilacion', 'jub'])) {
      if (contiene(['retiro', 'ret']) && contiene(['voluntario', 'vol'])) {
        return 'jubilacionRetiroVoluntario';
      }
      if (contiene(['patronal', 'patr'])) {
        return 'jubilacionPatronal';
      }
      if (contiene(['personal', 'pers'])) {
        return 'jubilacionPersonal';
      }
    }

    return null;
  }

  private obtenerNombreEstadoPorCodigo(idEstado: number | null | undefined): string {
    if (idEstado == null) {
      return '';
    }

    return this.estadosPermitidos().find((estado) => estado.codigo === idEstado)?.nombre || String(idEstado);
  }

  private esEstadoPermitido(estado: EstadoParticipe): boolean {
    const nombre = this.normalizarTexto(estado?.nombre || '');
    return (
      nombre === 'activo' ||
      nombre === 'cesante' ||
      nombre.includes('jubilado voluntario') ||
      nombre.includes('jubilado complementario') ||
      estado.codigo === 3
    );
  }

  private normalizarTexto(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private parseDateFallback(value: string | Date | null | undefined): number | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      const time = value.getTime();
      return Number.isNaN(time) ? null : time;
    }

    const raw = String(value).trim();
    if (!raw) {
      return null;
    }

    const normalized = raw
      .replace('T', ' ')
      .replace(/\.\d{1,6}/, '')
      .replace(/Z$/i, '')
      .replace(/([+-]\d{2}):?(\d{2})$/, '');

    const isoCandidate = normalized.replace(' ', 'T');
    const parsedNative = Date.parse(isoCandidate);
    if (!Number.isNaN(parsedNative)) {
      return parsedNative;
    }

    const ymd = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (ymd) {
      const [, y, m, d, hh = '00', mm = '00', ss = '00'] = ymd;
      return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)).getTime();
    }

    const dmy = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (dmy) {
      const [, d, m, y, hh = '00', mm = '00', ss = '00'] = dmy;
      return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)).getTime();
    }

    return null;
  }

  private obtenerFechaCorte(anio: number, mes: number): string {
    const fecha = new Date(anio, mes, 0);
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private toTimestamp(valor: unknown): number | null {
    if (!valor) {
      return null;
    }

    if (valor instanceof Date) {
      const time = valor.getTime();
      return Number.isNaN(time) ? null : time;
    }

    if (typeof valor === 'number') {
      return Number.isFinite(valor) ? valor : null;
    }

    if (Array.isArray(valor) && valor.length >= 3) {
      const [year, month, day, hour = 0, minute = 0, second = 0, nanoseconds = 0] = valor as number[];
      if (
        !Number.isFinite(year) ||
        !Number.isFinite(month) ||
        !Number.isFinite(day)
      ) {
        return null;
      }
      const millis = Number.isFinite(nanoseconds) ? Math.floor(nanoseconds / 1000000) : 0;
      const fecha = new Date(year, month - 1, day, hour, minute, second, millis);
      const time = fecha.getTime();
      return Number.isNaN(time) ? null : time;
    }

    if (typeof valor !== 'string') {
      return null;
    }

    const texto = valor.trim();
    if (!texto) {
      return null;
    }

    const limpio = texto
      .replace(/\[.*?\]/g, '')
      .replace('T', ' ')
      .replace(/\.\d{1,6}/, '')
      .trim();

    const directo = new Date(limpio).getTime();
    if (!Number.isNaN(directo)) {
      return directo;
    }

    const isoLike = limpio.includes(' ') ? limpio.replace(' ', 'T') : limpio;
    const isoTime = new Date(isoLike).getTime();
    if (!Number.isNaN(isoTime)) {
      return isoTime;
    }

    const match = limpio.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!match) {
      return null;
    }

    const dia = Number(match[1]);
    const mes = Number(match[2]) - 1;
    const anio = Number(match[3]);
    const hora = Number(match[4] ?? '0');
    const minuto = Number(match[5] ?? '0');
    const segundo = Number(match[6] ?? '0');

    const parsed = new Date(anio, mes, dia, hora, minuto, segundo).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }

  private toSignedNumber(valor: unknown): number {
    if (valor == null) {
      return 0;
    }

    if (typeof valor === 'number') {
      return Number.isFinite(valor) ? valor : 0;
    }

    const raw = String(valor).trim();
    if (!raw) {
      return 0;
    }

    const normalized = raw
      .replace(/\$/g, '')
      .replace(/\s+/g, '')
      .replace(/\((.*)\)/, '-$1');

    const hasComma = normalized.includes(',');
    const hasDot = normalized.includes('.');

    let canonical = normalized;
    if (hasComma && hasDot) {
      canonical = normalized.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
      canonical = normalized.replace(',', '.');
    }

    const parsed = Number(canonical);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
