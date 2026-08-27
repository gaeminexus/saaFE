import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { Empleado } from '../../../../rrh/model/empleado';
import { EmpleadoService } from '../../../../rrh/service/empleado.service';
import { criteriosPorEmpresa } from '../../../../rrh/forms/parametrizacion/utiles-parametrizacion';
import { opcionesAviso } from '../../../../rrh/forms/comunes/avisos';
import { AnticipoTrabajador, SolicitarAnticipoRequest } from '../../../model/anticipo-trabajador';
import { AnticipoTrabajadorService } from '../../../service/anticipo-trabajador.service';

/**
 * "Nuevo anticipo". Mismo combo de búsqueda de empleado que
 * vacaciones-form.component.ts (buscar por identificación + mat-select de
 * activos de la empresa), más el aviso de anticipo vigente que exige la
 * regla de negocio: un empleado no puede tener dos anticipos abiertos.
 */
@Component({
  selector: 'app-anticipo-form-dialog',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './anticipo-form-dialog.component.html',
  styleUrls: ['./anticipo-form-dialog.component.scss'],
})
export class AnticipoFormDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<AnticipoFormDialogComponent, boolean>);
  private empleadoService = inject(EmpleadoService);
  private anticipoService = inject(AnticipoTrabajadorService);
  private appState = inject(AppStateService);
  private snackBar = inject(MatSnackBar);

  formEmpleadoBusqueda = signal<string>('');
  formEmpleado = signal<Empleado | null>(null);
  empleados = signal<Empleado[]>([]);
  cargandoEmpleados = signal<boolean>(false);

  /** Anticipo vivo del empleado elegido, si tiene uno — bloquea el envío. */
  anticipoVigente = signal<AnticipoTrabajador | null>(null);
  consultandoVigente = signal<boolean>(false);

  valor = signal<number>(0);
  numeroCuotas = signal<number>(1);
  /** yyyy-MM del input type="month"; se manda como yyyy-MM-01. */
  mesInicioDescuento = signal<string>('');
  motivo = signal<string>('');
  observacion = signal<string>('');

  guardando = signal<boolean>(false);
  errorMsg = signal<string>('');

  valorCuota = computed(() => {
    const cuotas = this.numeroCuotas();
    if (!cuotas || cuotas < 1) return 0;
    return Math.round((this.valor() / cuotas + Number.EPSILON) * 100) / 100;
  });

  puedeGuardar = computed(() => {
    return !!this.formEmpleado()
      && this.valor() > 0
      && this.numeroCuotas() >= 1
      && this.motivo().trim().length > 0
      && !this.anticipoVigente()
      && !this.guardando();
  });

  ngOnInit(): void {
    this.onBuscarEmpleados();
  }

  compareEmpleado = (a: Empleado | null, b: Empleado | null): boolean =>
    (a?.codigo ?? null) === (b?.codigo ?? null);

  onBuscarEmpleados(): void {
    this.cargandoEmpleados.set(true);
    const criterios = this.buildEmpleadoCriteria(this.formEmpleadoBusqueda().trim());
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

  onEmpleadoChange(empleado: Empleado | null): void {
    this.formEmpleado.set(empleado);
    this.anticipoVigente.set(null);
    if (!empleado?.codigo) return;

    this.consultandoVigente.set(true);
    this.anticipoService.vigente(empleado.codigo).subscribe({
      next: (vigente) => {
        this.anticipoVigente.set(vigente);
        this.consultandoVigente.set(false);
      },
      error: () => {
        this.consultandoVigente.set(false);
      },
    });
  }

  empleadoLabel(value: Empleado | null): string {
    if (!value) return '';
    const nombre = `${value.apellidos ?? ''} ${value.nombres ?? ''}`.replace(/\s+/g, ' ').trim();
    return `${value.identificacion ?? ''} - ${nombre}`.trim();
  }

  guardar(): void {
    const empleado = this.formEmpleado();
    if (!this.puedeGuardar() || !empleado) return;

    const payload: SolicitarAnticipoRequest = {
      idEmpleado: empleado.codigo,
      valor: this.valor(),
      numeroCuotas: this.numeroCuotas(),
      fechaInicioDescuento: this.mesInicioDescuento() ? `${this.mesInicioDescuento()}-01` : undefined,
      motivo: this.motivo().trim(),
      observacion: this.observacion().trim() || undefined,
      idUsuario: this.appState.getIdUsuario(),
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    this.anticipoService.solicitar(payload).subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarExito('Anticipo solicitado correctamente');
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorMsg.set(mensajeDeError(err, 'No se pudo solicitar el anticipo'));
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
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
