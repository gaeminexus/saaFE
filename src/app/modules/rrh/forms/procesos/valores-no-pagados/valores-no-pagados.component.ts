import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { InlineAutocompleteComponent } from '../../comunes/inline-autocomplete/inline-autocomplete.component';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { empresaSesionCodigo } from '../../../../../shared/services/empresa-sesion';
import { ExportService } from '../../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { fechaCsv } from '../../../../../shared/utils/fecha-csv.util';
import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { Empleado } from '../../../model/empleado';
import { EmpleadoService } from '../../../service/empleado.service';
import { PeriodoNomina } from '../../../model/periodo-nomina';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import { EstadoPeriodo } from '../../../model/estados-nomina';
import {
  ESTADO_VALOR_NO_PAGADO_LABELS,
  EstadoValorNoPagado,
  ValorNoPagadoListado,
  claseEstadoValorNoPagado,
} from '../../../model/valor-no-pagado';
import { ValorNoPagadoService } from '../../../service/valor-no-pagado.service';
import { criteriosPorEmpresa } from '../../parametrizacion/utiles-parametrizacion';
import { opcionesAviso } from '../../comunes/avisos';
import { RegistrarValorNoPagadoDialogComponent } from './registrar-valor-no-pagado-dialog.component';

/**
 * Valores no pagados (RHH.VNPG) — un anticipo al revés: se retiene un valor del neto de un
 * empleado en un período y se le devuelve completo en el pago del siguiente. Contrato:
 * `saaBE/docs/logica-negocio/rhh/PLAN-VALORES-NO-PAGADOS.md`.
 *
 * **El backend se está escribiendo en paralelo (2026-09-08).** Implementado contra el contrato
 * del plan §9/§10 — si el JSON real no coincide al integrar, se avisa antes de adaptar la
 * pantalla, no al revés.
 */
@Component({
  selector: 'app-valores-no-pagados',
  standalone: true,
  imports: [CommonModule, MaterialFormModule, InlineAutocompleteComponent],
  templateUrl: './valores-no-pagados.component.html',
  styleUrls: ['./valores-no-pagados.component.scss'],
})
export class ValoresNoPagadosComponent implements OnInit {
  private valorNoPagadoService = inject(ValorNoPagadoService);
  private empleadoService = inject(EmpleadoService);
  private periodoService = inject(PeriodoNominaService);
  private appState = inject(AppStateService);
  private funcionesDatosS = inject(FuncionesDatosService);
  private exportService = inject(ExportService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly EstadoValorNoPagado = EstadoValorNoPagado;
  readonly estadoOptions = Object.entries(ESTADO_VALOR_NO_PAGADO_LABELS).map(([codigo, texto]) => ({
    codigo: Number(codigo),
    texto,
  }));

  // ── Filtros — todos al servidor (plan §9: nunca traer todo y filtrar en el navegador) ──
  periodos = signal<PeriodoNomina[]>([]);
  filtroPeriodo = signal<PeriodoNomina | null>(null);

  filtroEmpleado = signal<Empleado | null>(null);
  empleados = signal<Empleado[]>([]);
  cargandoEmpleados = signal<boolean>(false);

  filtroEstado = signal<number | null>(null);

  rows = signal<ValorNoPagadoListado[]>([]);
  loading = signal<boolean>(false);
  anulando = signal<number | null>(null);

  columnas = ['empleado', 'periodo', 'valor', 'motivo', 'estado', 'trazabilidad', 'acciones'];

  totalValor = computed(() => this.rows().reduce((s, r) => s + (Number(r.valor) || 0), 0));

  ngOnInit(): void {
    this.cargarEmpleados();
    this.cargarPeriodos();
  }

  /** Cuáles períodos ofrece el combo de filtro (todos, no sólo abiertos) y cuál queda seleccionado por defecto. */
  private cargarPeriodos(): void {
    this.periodoService.selectByCriteria(criteriosPorEmpresa('anio', 'mes')).subscribe({
      next: (data) => {
        const periodos = data ?? [];
        this.periodos.set(periodos);

        // Default: el período Abierto actual (plan §9) — el más reciente por (año, mes) entre los
        // Abiertos, ya que ordinariamente sólo hay uno vivo a la vez.
        const abiertos = periodos.filter((p) => Number(p.estado) === EstadoPeriodo.ABIERTO);
        if (abiertos.length > 0) {
          const actual = [...abiertos].sort((a, b) => (b.anio - a.anio) || (b.mes - a.mes))[0];
          this.filtroPeriodo.set(actual);
        }
        this.buscar();
      },
      error: (err) => {
        this.periodos.set([]);
        this.mostrarError(mensajeDeError(err, 'No se pudieron cargar los períodos'));
        this.buscar();
      },
    });
  }

  /**
   * Carga en una sola llamada todos los empleados de la empresa (mismo patrón que
   * `ColaboradoresComponent`) para que el filtro `InlineAutocomplete` filtre client-side por
   * nombre, apellido o cédula. Antes había un cuadro de "Buscar" separado que sólo filtraba por
   * identificación en el servidor y dejaba el combo sin opciones si no encontraba nada — mismo
   * defecto que en `RegistrarValorNoPagadoDialogComponent`, corregido igual (2026-09-08).
   */
  private cargarEmpleados(): void {
    this.cargandoEmpleados.set(true);
    this.empleadoService.selectByCriteria(criteriosPorEmpresa('apellidos')).subscribe({
      next: (rows: Empleado[] | null) => {
        this.empleados.set(this.extractRows(rows));
        this.cargandoEmpleados.set(false);
      },
      error: (err) => {
        this.mostrarError(mensajeDeError(err, 'Error al cargar los empleados'));
        this.cargandoEmpleados.set(false);
      },
    });
  }

  onFiltroEmpleadoChange(empleado: Empleado | null): void {
    this.filtroEmpleado.set(empleado);
    this.buscar();
  }

  buscar(): void {
    const idEmpresa = empresaSesionCodigo() ?? this.appState.getEmpresa()?.codigo;
    if (!idEmpresa) {
      this.rows.set([]);
      return;
    }

    this.loading.set(true);
    this.valorNoPagadoService.listar({
      idEmpresa,
      idPeriodo: this.filtroPeriodo()?.codigo ?? undefined,
      idEmpleado: this.filtroEmpleado()?.codigo ?? undefined,
      estado: this.filtroEstado() != null ? [this.filtroEstado()!] : undefined,
    }).subscribe({
      next: (data) => {
        this.rows.set(Array.isArray(data) ? data : []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.rows.set([]);
        this.mostrarError(mensajeDeError(err, 'No se pudieron cargar los valores no pagados'));
      },
    });
  }

  limpiarFiltros(): void {
    this.filtroEmpleado.set(null);
    this.filtroEstado.set(null);
    const abiertos = this.periodos().filter((p) => Number(p.estado) === EstadoPeriodo.ABIERTO);
    const actual = abiertos.length > 0
      ? [...abiertos].sort((a, b) => (b.anio - a.anio) || (b.mes - a.mes))[0]
      : null;
    this.filtroPeriodo.set(actual);
    this.buscar();
  }

  registrar(): void {
    this.dialog.open(RegistrarValorNoPagadoDialogComponent, { width: '640px', maxWidth: '98vw' })
      .afterClosed().subscribe((creado: boolean) => {
        if (creado) this.buscar();
      });
  }

  /**
   * Sólo se puede anular desde REGISTRADO (plan §8): un RETENIDO ya afectó una orden de pago, y
   * la vía ahí es revertir la orden, no este botón — igual que las cuatro pantallas de cheques,
   * no se ofrece una acción que el backend siempre va a rechazar.
   */
  puedeAnular(row: ValorNoPagadoListado): boolean {
    return Number(row.estado) === EstadoValorNoPagado.REGISTRADO;
  }

  anular(row: ValorNoPagadoListado): void {
    if (!this.puedeAnular(row)) return;

    const data: MotivoDialogData = {
      titulo: `Anular valor no pagado N° ${row.codigo}`,
      advertencia: `Se anulará el registro de ${this.empleadoLabel(row.empleado)} por ${Number(row.valor).toFixed(2)} en el período ${this.periodoLabel(row.periodoNomina)}. El empleado cobrará su neto completo en este período.`,
      textoConfirmar: 'Sí, anular',
    };

    this.dialog.open(MotivoDialogComponent, { width: '520px', data }).afterClosed().subscribe((motivo: string | null) => {
      if (!motivo) return;

      this.anulando.set(row.codigo);
      const usuario = this.appState.getUsuario()?.nombre ?? sessionStorage.getItem('userName') ?? '';
      this.valorNoPagadoService.anular(row.codigo, { motivo, usuario }).subscribe({
        next: () => {
          this.anulando.set(null);
          this.mostrarExito('Valor no pagado anulado correctamente');
          this.buscar();
        },
        error: (err) => {
          this.anulando.set(null);
          this.mostrarError(mensajeDeError(err, 'No se pudo anular el valor no pagado'));
        },
      });
    });
  }

  /** Exporta lo que se está viendo — ya filtrado en el servidor (GET /vnpg/listar). */
  exportarCSV(): void {
    const rows = this.rows();
    if (!rows.length) {
      this.mostrarError('No hay registros para exportar');
      return;
    }

    const plano = rows.map((r) => ({
      codigo: r.codigo,
      empleado: this.empleadoLabel(r.empleado),
      periodo: this.periodoLabel(r.periodoNomina),
      valor: Number(r.valor || 0),
      motivo: r.motivo || '',
      estado: this.estadoLabel(r.estado),
      periodoRecuperacion: r.periodoRecuperacion ? this.periodoLabel(r.periodoRecuperacion) : '',
      ordenRetencion: r.ordenRetencion?.numero || (r.ordenRetencion?.codigo ?? ''),
      ordenPago: r.ordenPago?.numero || (r.ordenPago?.codigo ?? ''),
      liquidacion: r.liquidacion?.numero || (r.liquidacion?.codigo ?? ''),
      fechaRegistro: fechaCsv(this.funcionesDatosS.convertirFechaDesdeBackend(r.fechaRegistro)),
      usuarioRegistro: r.usuarioRegistro || '',
    }));

    const headers = [
      'Código', 'Empleado', 'Período', 'Valor', 'Motivo', 'Estado', 'Período de recuperación',
      'Orden que retuvo', 'Orden que devolvió', 'Finiquito', 'Fecha de registro', 'Usuario',
    ];
    const keys = [
      'codigo', 'empleado', 'periodo', 'valor', 'motivo', 'estado', 'periodoRecuperacion',
      'ordenRetencion', 'ordenPago', 'liquidacion', 'fechaRegistro', 'usuarioRegistro',
    ];
    this.exportService.exportToCSV(plano, `valores_no_pagados_${fechaCsv(new Date())}`, headers, keys);
  }

  empleadoLabel(value: Empleado | null | undefined): string {
    if (!value) return '';
    const nombre = `${value.apellidos ?? ''} ${value.nombres ?? ''}`.replace(/\s+/g, ' ').trim();
    return `${value.identificacion ?? ''} - ${nombre}`.trim();
  }

  readonly buscarPorEmpleado = (e: Empleado): string[] => [
    e.identificacion != null ? String(e.identificacion) : '',
    e.apellidos ?? '',
    e.nombres ?? '',
  ];

  periodoLabel(periodo: PeriodoNomina | null | undefined): string {
    return periodo ? `${periodo.mes}/${periodo.anio}` : '—';
  }

  readonly buscarPorPeriodo = (p: PeriodoNomina): string[] => [String(p.mes), String(p.anio)];

  readonly estadoOptionLabel = (e: { codigo: number; texto: string }): string => e.texto;
  readonly estadoOptionValor = (e: { codigo: number; texto: string }): number => e.codigo;

  estadoLabel(estado: number): string {
    return ESTADO_VALOR_NO_PAGADO_LABELS[Number(estado)] || `Estado ${estado}`;
  }

  estadoClase(estado: number): string {
    return claseEstadoValorNoPagado(estado);
  }

  fechaDisplay(fecha: unknown): string {
    return this.funcionesDatosS.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA) || '—';
  }

  private extractRows<T>(rows: T[] | null): T[] {
    if (Array.isArray(rows)) return rows;
    if (!rows) return [];
    const wrapped = rows as unknown as { data?: T[]; rows?: T[]; contenido?: T[] };
    if (Array.isArray(wrapped.data)) return wrapped.data;
    if (Array.isArray(wrapped.rows)) return wrapped.rows;
    if (Array.isArray(wrapped.contenido)) return wrapped.contenido;
    return [];
  }

  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', opcionesAviso(false, mensaje));
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', opcionesAviso(true, mensaje));
  }
}
