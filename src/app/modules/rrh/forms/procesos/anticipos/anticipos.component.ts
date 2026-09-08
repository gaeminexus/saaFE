import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { InlineAutocompleteComponent } from '../../comunes/inline-autocomplete/inline-autocomplete.component';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { Empleado } from '../../../model/empleado';
import { EmpleadoService } from '../../../service/empleado.service';
import { criteriosPorEmpresa } from '../../parametrizacion/utiles-parametrizacion';
import { opcionesAviso } from '../../comunes/avisos';
import { empresaSesionCodigo } from '../../../../../shared/services/empresa-sesion';

import { AnticipoTrabajador, ESTADO_ANTICIPO_LABELS, EstadoAnticipo } from '../../../model/anticipo-trabajador';
import { AnticipoTrabajadorService } from '../../../service/anticipo-trabajador.service';
import { AnticipoFormDialogComponent } from './anticipo-form-dialog.component';
import { AprobarAnticipoDialogComponent } from './aprobar-anticipo-dialog.component';
import { DevolucionesAnticipoDialogComponent } from './devoluciones-anticipo-dialog.component';
import { RegistrarDevolucionDialogComponent } from './registrar-devolucion-dialog.component';

/** Anticipos a trabajadores: solicitar, aprobar (paga en el acto) y anular. */
@Component({
  selector: 'app-anticipos',
  standalone: true,
  imports: [CommonModule, MaterialFormModule, InlineAutocompleteComponent],
  templateUrl: './anticipos.component.html',
  styleUrls: ['./anticipos.component.scss'],
})
export class AnticiposComponent implements OnInit {
  private anticipoService = inject(AnticipoTrabajadorService);
  private empleadoService = inject(EmpleadoService);
  private appState = inject(AppStateService);
  private funcionesDatosS = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly EstadoAnticipo = EstadoAnticipo;
  readonly estadoOptions = Object.entries(ESTADO_ANTICIPO_LABELS).map(([codigo, texto]) => ({
    codigo: Number(codigo),
    texto,
  }));

  filtroEmpleado = signal<Empleado | null>(null);
  filtroEstado = signal<number | null>(null);
  empleados = signal<Empleado[]>([]);
  cargandoEmpleados = signal<boolean>(false);

  rows = signal<AnticipoTrabajador[]>([]);
  loading = signal<boolean>(false);
  procesando = signal<number | null>(null);

  columnas = ['empleado', 'fecha', 'valor', 'cuotas', 'valorCuota', 'saldo', 'estado', 'acciones'];

  totalValor = computed(() => this.rows().reduce((s, r) => s + (Number(r.valor) || 0), 0));

  ngOnInit(): void {
    this.cargarEmpleados();
    this.buscar();
  }

  /** Piloto fase 2 (InlineAutocomplete): Estado bindea el código escalar, no el objeto. */
  estadoOptionLabel = (e: { codigo: number; texto: string }): string => e.texto;
  estadoOptionValor = (e: { codigo: number; texto: string }): number => e.codigo;

  /**
   * Carga todos los empleados de la empresa en una sola llamada al abrir la pantalla (mismo
   * patrón que `ColaboradoresComponent`), para que `InlineAutocomplete` filtre client-side por
   * nombre, apellido o cédula vía `[buscarPor]`. Antes había un cuadro de "Buscar" separado que
   * sólo filtraba por identificación en el servidor y, si no encontraba nada, dejaba el combo sin
   * opciones para filtrar (2026-09-08, mismo defecto reportado en "valores no pagados").
   *
   * Sigue restringiendo a activos (`isEmpleadoActivo`), igual que antes de este arreglo — es el
   * único filtro de consulta de RRHH que lo hace en vez de ofrecer también inactivos; no lo
   * cambié porque no sé si es una decisión de negocio deliberada (reportado al árbitro).
   */
  cargarEmpleados(): void {
    this.cargandoEmpleados.set(true);
    const criterios = criteriosPorEmpresa('apellidos');
    this.empleadoService.selectByCriteria(criterios).subscribe({
      next: (rows: Empleado[] | null) => {
        const activos = this.extractRows(rows).filter((e) => this.isEmpleadoActivo(e.estado));
        this.empleados.set(activos);
        this.cargandoEmpleados.set(false);
      },
      error: (err) => {
        this.mostrarError(mensajeDeError(err, 'Error al buscar empleados'));
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
    this.anticipoService.listar({
      idEmpresa,
      idEmpleado: this.filtroEmpleado()?.codigo ?? undefined,
      estado: this.filtroEstado() ?? undefined,
    }).subscribe({
      next: (data) => {
        this.rows.set(Array.isArray(data) ? data : []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.rows.set([]);
        this.mostrarError(mensajeDeError(err, 'No se pudieron cargar los anticipos'));
      },
    });
  }

  limpiarFiltros(): void {
    this.filtroEmpleado.set(null);
    this.filtroEstado.set(null);
    this.buscar();
  }

  nuevoAnticipo(): void {
    this.dialog.open(AnticipoFormDialogComponent, { width: '640px', maxWidth: '98vw' })
      .afterClosed().subscribe((creado: boolean) => {
        if (creado) this.buscar();
      });
  }

  puedeAprobar(row: AnticipoTrabajador): boolean {
    return Number(row.estado) === EstadoAnticipo.SOLICITADO;
  }

  puedeAnular(row: AnticipoTrabajador): boolean {
    return Number(row.estado) === EstadoAnticipo.SOLICITADO || Number(row.estado) === EstadoAnticipo.APROBADO;
  }

  /** Sólo sobre un anticipo ya pagado: antes de eso no hay plata que devolver. */
  puedeRegistrarDevolucion(row: AnticipoTrabajador): boolean {
    const estado = Number(row.estado);
    return estado === EstadoAnticipo.PAGADO || estado === EstadoAnticipo.EN_DESCUENTO;
  }

  /** También sobre uno ya CANCELADO: pudo llegar ahí justo por una devolución total. */
  puedeVerDevoluciones(row: AnticipoTrabajador): boolean {
    const estado = Number(row.estado);
    return estado === EstadoAnticipo.PAGADO || estado === EstadoAnticipo.EN_DESCUENTO || estado === EstadoAnticipo.CANCELADO;
  }

  registrarDevolucion(row: AnticipoTrabajador): void {
    this.dialog
      .open(RegistrarDevolucionDialogComponent, { width: '640px', maxWidth: '98vw', data: { anticipo: row } })
      .afterClosed()
      .subscribe((resultado) => {
        if (!resultado) return;
        this.buscar();
      });
  }

  verDevoluciones(row: AnticipoTrabajador): void {
    this.dialog
      .open(DevolucionesAnticipoDialogComponent, { width: '820px', maxWidth: '98vw', data: { anticipo: row } })
      .afterClosed()
      .subscribe((huboCambios: boolean) => {
        if (huboCambios) this.buscar();
      });
  }

  aprobar(row: AnticipoTrabajador): void {
    if (!this.puedeAprobar(row)) return;

    this.dialog.open(AprobarAnticipoDialogComponent, {
      width: '520px',
      data: { anticipo: row },
    }).afterClosed().subscribe((resultado) => {
      if (!resultado) return;
      if (resultado.numeroCheque != null) {
        this.snackBar.open(
          `Se giró el cheque N° ${resultado.numeroCheque} para el anticipo.`,
          'Cerrar',
          { ...opcionesAviso(false, ''), duration: 12000 },
        );
      }
      this.buscar();
    });
  }

  anular(row: AnticipoTrabajador): void {
    if (!this.puedeAnular(row)) return;

    const data: MotivoDialogData = {
      titulo: `Anular anticipo N° ${row.codigo}`,
      advertencia: `Se anulará el anticipo de ${this.empleadoLabel(row.empleado)} por ${Number(row.valor).toFixed(2)}.`,
      textoConfirmar: 'Sí, anular',
    };

    this.dialog.open(MotivoDialogComponent, { width: '480px', data }).afterClosed().subscribe((motivo: string | null) => {
      if (!motivo) return;

      this.procesando.set(row.codigo);
      this.anticipoService.anular(row.codigo, { motivo, idUsuario: this.appState.getIdUsuario() }).subscribe({
        next: () => {
          this.procesando.set(null);
          this.mostrarExito('Anticipo anulado');
          this.buscar();
        },
        error: (err) => {
          this.procesando.set(null);
          this.mostrarError(mensajeDeError(err, 'No se pudo anular el anticipo'));
        },
      });
    });
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

  estadoLabel(estado: number): string {
    return ESTADO_ANTICIPO_LABELS[Number(estado)] || `Estado ${estado}`;
  }

  estadoClase(estado: number): string {
    const e = Number(estado);
    if (e === EstadoAnticipo.SOLICITADO) return 'estado-solicitado';
    if (e === EstadoAnticipo.APROBADO) return 'estado-aprobado';
    if (e === EstadoAnticipo.PAGADO) return 'estado-pagado';
    if (e === EstadoAnticipo.EN_DESCUENTO) return 'estado-en-descuento';
    if (e === EstadoAnticipo.CANCELADO || e === EstadoAnticipo.ANULADO) return 'estado-apagado';
    return '';
  }

  fechaDisplay(fecha: unknown): string {
    return this.funcionesDatosS.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA) || '—';
  }

  private isEmpleadoActivo(value?: string | number | null): boolean {
    if (value === null || value === undefined) return false;
    const normalized = value.toString().toUpperCase();
    return normalized === '1' || normalized === 'A' || normalized.startsWith('ACT');
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
