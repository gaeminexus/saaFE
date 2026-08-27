import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { Empleado } from '../../../model/empleado';
import { EmpleadoService } from '../../../service/empleado.service';
import { criteriosPorEmpresa } from '../../parametrizacion/utiles-parametrizacion';
import { opcionesAviso } from '../../comunes/avisos';
import { empresaSesionCodigo } from '../../../../../shared/services/empresa-sesion';

import { AnticipoTrabajador, ESTADO_ANTICIPO_LABELS, EstadoAnticipo } from '../../../model/anticipo-trabajador';
import { AnticipoTrabajadorService } from '../../../service/anticipo-trabajador.service';
import { AnticipoFormDialogComponent } from './anticipo-form-dialog.component';
import { AprobarAnticipoDialogComponent } from './aprobar-anticipo-dialog.component';

/** Anticipos a trabajadores: solicitar, aprobar (paga en el acto) y anular. */
@Component({
  selector: 'app-anticipos',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
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

  filtroEmpleadoBusqueda = signal<string>('');
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
    this.onBuscarEmpleados();
    this.buscar();
  }

  compareEmpleado = (a: Empleado | null, b: Empleado | null): boolean =>
    (a?.codigo ?? null) === (b?.codigo ?? null);

  onBuscarEmpleados(): void {
    this.cargandoEmpleados.set(true);
    const criterios = this.buildEmpleadoCriteria(this.filtroEmpleadoBusqueda().trim());
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
    this.filtroEmpleadoBusqueda.set('');
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

  private buildEmpleadoCriteria(busqueda: string): DatosBusqueda[] {
    const criterios: DatosBusqueda[] = criteriosPorEmpresa();
    const texto = busqueda.replace(/\s+/g, ' ').trim().toUpperCase();
    if (texto) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(TipoDatosBusqueda.STRING, 'identificacion', texto, TipoComandosBusqueda.LIKE);
      criterios.push(db);
    }
    const order = new DatosBusqueda();
    order.orderBy('apellidos');
    order.setTipoOrden(DatosBusqueda.ORDER_ASC);
    criterios.push(order);
    return criterios;
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
