import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { ComprobanteViewerComponent } from '../../../dialog/cobros/comprobante-viewer.component';
import {
  CLASE_ESTADO_COBRO,
  EstadoCobro,
  ICONO_ESTADO_COBRO,
  NOMBRE_TIPO_OPERACION_COBRO,
  TipoOperacionCobro,
  nombreEstadoCobro,
  nombreTipoOperacionCobro,
} from '../../../model/cobros/catalogos-cobro';
import { EtapaSeguimientoCobro, FilaSeguimientoCobro } from '../../../model/cobros/seguimiento-cobro';
import { CobroCreditoService } from '../../../service/cobro-credito.service';

/**
 * Seguimiento mensual de cobros personales (docs/crd/API-SEGUIMIENTO-COBROS.md).
 *
 * Pantalla de SOLO LECTURA — nadie aprueba, procesa, anula ni reversa desde acá; esas acciones
 * viven en `proceso-credito`/`consulta-cobros`. El circuito completo YA vive en `CRD.CBCR`: lo
 * único que faltaba era poder verlo por rango de fechas (el DAO solo tenía
 * `selectByEstado`/`selectByEntidad`/`selectByReferencia`) y una vista que muestre, cobro por
 * cobro, dónde se cortó el circuito — por eso la línea de tiempo por fila es el centro de la
 * pantalla, no la grilla.
 *
 * Filtra por `fechaCobro` (fecha del depósito, `CBCRFCHA`), no por fecha de registro: un depósito
 * de fin de mes registrado el día 2 del mes siguiente pertenece igual al mes del depósito (§2 del
 * contrato).
 *
 * Nunca trae carga Petro: no es un `CobroCredito`, vive en `CRAR` con otro ciclo
 * (docs/crd/API-COBRO-PETRO-DOS-PASOS.md).
 */
@Component({
  selector: 'app-seguimiento-cobros',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, ComprobanteViewerComponent],
  templateUrl: './seguimiento-cobros.component.html',
  styleUrl: './seguimiento-cobros.component.scss',
})
export class SeguimientoCobrosComponent implements AfterViewInit, AfterViewChecked {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private cobros = inject(CobroCreditoService);
  private funcionesDatos = inject(FuncionesDatosService);

  readonly EstadoCobro = EstadoCobro;
  readonly nombreEstadoCobro = nombreEstadoCobro;
  readonly nombreTipoOperacionCobro = nombreTipoOperacionCobro;
  readonly claseEstadoCobro = CLASE_ESTADO_COBRO;
  readonly iconoEstadoCobro = ICONO_ESTADO_COBRO;
  readonly tiposOperacion = Object.keys(NOMBRE_TIPO_OPERACION_COBRO) as TipoOperacionCobro[];
  /** Orden fijo para las tarjetas de resumen — el mismo del ciclo de vida del cobro. */
  readonly estadosResumen = [
    EstadoCobro.REGISTRADO,
    EstadoCobro.APROBADO,
    EstadoCobro.PROCESADO,
    EstadoCobro.RECHAZADO,
    EstadoCobro.ANULADO,
  ];

  readonly displayedColumns = ['estado', 'participe', 'tipoOperacion', 'valor', 'fechaCobro', 'referencia', 'respaldo'];

  /** Primer día del mes en vista. Por defecto, el mes actual — verlo no debe costar un clic. */
  mes = signal(this.primerDiaMes(new Date()));

  cargando = signal(false);
  errorCarga = signal<string | null>(null);
  filas = signal<FilaSeguimientoCobro[]>([]);

  filtroTexto = signal('');
  filtroTipo = signal<TipoOperacionCobro | null>(null);
  filtroEstado = signal<number | null>(null);

  filaExpandida = signal<number | null>(null);

  dataSource = new MatTableDataSource<FilaSeguimientoCobro>([]);

  nombreMes = computed(() => {
    const capital = this.mes().toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });
    return capital.charAt(0).toUpperCase() + capital.slice(1);
  });

  filasFiltradas = computed(() => {
    const estado = this.filtroEstado();
    const tipo = this.filtroTipo();
    const texto = this.filtroTexto().trim().toLowerCase();
    return this.filas().filter((f) => {
      if (estado != null && Number(f.estado) !== estado) return false;
      if (tipo != null && f.tipoOperacion !== tipo) return false;
      if (!texto) return true;
      return (
        (f.participe ?? '').toLowerCase().includes(texto) ||
        (f.identificacion ?? '').toLowerCase().includes(texto) ||
        (f.referencia ?? '').toLowerCase().includes(texto)
      );
    });
  });

  /** Total, suma y conteo por estado — sobre TODO el mes cargado, no sobre el filtro (para que las tarjetas no se muevan al clicarlas). */
  resumen = computed(() => {
    const filas = this.filas();
    const conteoPorEstado = new Map<number, number>();
    let suma = 0;
    for (const f of filas) {
      suma += f.valor ?? 0;
      conteoPorEstado.set(Number(f.estado), (conteoPorEstado.get(Number(f.estado)) ?? 0) + 1);
    }
    return { total: filas.length, suma, conteoPorEstado };
  });

  constructor() {
    // El dataSource de MatTable no es un signal: hay que empujarle los datos filtrados a mano
    // cada vez que el filtro (o la carga del mes) cambia.
    effect(() => {
      this.dataSource.data = this.filasFiltradas();
    });
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.conectarPaginadorYOrden();
  }

  ngAfterViewChecked(): void {
    this.conectarPaginadorYOrden();
  }

  /**
   * Idempotente y llamado también desde `ngAfterViewChecked`: la tabla vive detrás de un `@if`
   * que arranca en falso (`cargando` empieza en `true`), así que en `ngAfterViewInit` el
   * `@ViewChild` todavía resuelve `undefined` — sin este reintento el paginador nunca se
   * engancha y la tabla muestra solo las primeras filas del mes, sin ningún indicio (defecto ya
   * corregido en siete pantallas de `cnt`, §9 del REGISTRO-RESERVAS-EQUIPOS.md).
   */
  private conectarPaginadorYOrden(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort && this.dataSource.sort !== this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  // ================= carga =================

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.filaExpandida.set(null);

    const { desde, hasta } = this.rangoMes();
    this.cobros.seguimiento(desde, hasta).subscribe((resp) => {
      this.cargando.set(false);
      // `null` = la consulta falló; `[]` = el mes no tuvo cobros. Son mensajes distintos.
      if (resp === null) {
        this.errorCarga.set('No se pudo cargar el seguimiento de este mes. Intente de nuevo.');
        this.filas.set([]);
        return;
      }
      this.filas.set(resp);
    });
  }

  mesAnterior(): void {
    const m = this.mes();
    this.mes.set(new Date(m.getFullYear(), m.getMonth() - 1, 1));
    this.cargar();
  }

  mesSiguiente(): void {
    const m = this.mes();
    this.mes.set(new Date(m.getFullYear(), m.getMonth() + 1, 1));
    this.cargar();
  }

  irAMesActual(): void {
    this.mes.set(this.primerDiaMes(new Date()));
    this.cargar();
  }

  private rangoMes(): { desde: string; hasta: string } {
    const m = this.mes();
    const desde = new Date(m.getFullYear(), m.getMonth(), 1);
    const hasta = new Date(m.getFullYear(), m.getMonth() + 1, 0);
    return { desde: this.formatearFechaLocal(desde), hasta: this.formatearFechaLocal(hasta) };
  }

  private primerDiaMes(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  private formatearFechaLocal(d: Date): string {
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  // ================= tarjetas / filtros =================

  /** Las tarjetas de resumen son clicables: filtran la tabla por ese estado. Clic de nuevo = quitar el filtro. */
  alternarFiltroEstado(estado: number): void {
    this.filtroEstado.set(this.filtroEstado() === estado ? null : estado);
  }

  limpiarFiltros(): void {
    this.filtroTexto.set('');
    this.filtroTipo.set(null);
    this.filtroEstado.set(null);
  }

  // ================= detalle / línea de tiempo =================

  alternarExpansion(fila: FilaSeguimientoCobro): void {
    this.filaExpandida.set(this.filaExpandida() === fila.idCobro ? null : fila.idCobro);
  }

  /**
   * Ingresado → Aprobado → Procesado. Una etapa que no ocurrió se devuelve con `ocurrio: false` y
   * fecha/usuario/duración en `null` — la pantalla la pinta vacía, nunca la omite: la gracia es
   * ver dónde se cortó el circuito.
   */
  etapas(fila: FilaSeguimientoCobro): EtapaSeguimientoCobro[] {
    return [
      {
        nombre: 'Ingresado',
        icono: 'add_circle',
        usuario: fila.usuarioRegistro,
        fecha: fila.fechaRegistro,
        duracionHoras: null,
        ocurrio: fila.fechaRegistro != null,
      },
      {
        nombre: 'Aprobado',
        icono: 'check_circle',
        usuario: fila.usuarioAprobacion,
        fecha: fila.fechaAprobacion,
        duracionHoras: fila.horasHastaAprobacion,
        ocurrio: fila.fechaAprobacion != null,
      },
      {
        nombre: 'Procesado',
        icono: 'task_alt',
        usuario: fila.usuarioProceso,
        fecha: fila.fechaProceso,
        duracionHoras: fila.horasHastaProceso,
        ocurrio: fila.fechaProceso != null,
      },
    ];
  }

  // ================= exportar =================

  /** Exporta lo que está FILTRADO (texto + tipo + estado), no todo el mes cargado. */
  exportarCsv(): void {
    const filas = this.filasFiltradas();
    const encabezados = [
      'Cobro', 'Estado', 'Tipo', 'Partícipe', 'Identificación', 'Valor', 'Fecha cobro', 'Referencia',
      'Usuario ingreso', 'Fecha ingreso',
      'Usuario aprobación', 'Fecha aprobación', 'Horas hasta aprobación',
      'Usuario proceso', 'Fecha proceso', 'Horas hasta proceso',
      'Motivo rechazo', 'Motivo anulación', 'Motivo reverso', 'N.° reversos', 'Tiene respaldo',
    ];
    const filasCsv = filas.map((f) => [
      f.idCobro,
      f.nombreEstado,
      this.nombreTipoOperacionCobro(f.tipoOperacion),
      f.participe,
      f.identificacion,
      (f.valor ?? 0).toFixed(2),
      this.formatFecha(f.fechaCobro),
      f.referencia,
      f.usuarioRegistro ?? '',
      this.formatFechaHora(f.fechaRegistro),
      f.usuarioAprobacion ?? '',
      this.formatFechaHora(f.fechaAprobacion),
      f.horasHastaAprobacion ?? '',
      f.usuarioProceso ?? '',
      this.formatFechaHora(f.fechaProceso),
      f.horasHastaProceso ?? '',
      f.motivoRechazo ?? '',
      f.motivoAnulacion ?? '',
      f.motivoReverso ?? '',
      f.numeroReversos ?? 0,
      f.tieneRespaldo ? 'Sí' : 'No',
    ]);

    const escapar = (v: unknown): string => {
      const s = String(v ?? '');
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const contenido = [encabezados, ...filasCsv].map((fila) => fila.map(escapar).join(';')).join('\r\n');
    // BOM al inicio: para que Excel reconozca UTF-8 (tildes, ñ) sin preguntar el juego de caracteres.
    const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `seguimiento-cobros-${this.formatearFechaLocal(this.mes())}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  // ================= formateo =================

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatFecha(fecha: unknown): string {
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA) || '—';
  }

  formatFechaHora(fecha: unknown): string {
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.FECHA_HORA) || '—';
  }

  /** `null` = etapa pendiente (se ve vacía, no como "0"). Nunca confundir con un valor instantáneo real. */
  formatDuracion(horas: number | null | undefined): string {
    if (horas == null) return '—';
    if (horas < 1) return `${Math.max(0, Math.round(horas * 60))} min`;
    const dias = Math.floor(horas / 24);
    const restoHoras = Math.round(horas - dias * 24);
    if (dias > 0) return restoHoras > 0 ? `${dias} d ${restoHoras} h` : `${dias} d`;
    return `${Math.round(horas)} h`;
  }
}
