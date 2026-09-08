import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { InlineAutocompleteComponent } from '../../comunes/inline-autocomplete/inline-autocomplete.component';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { empresaSesionCodigo } from '../../../../../shared/services/empresa-sesion';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { Empleado } from '../../../model/empleado';
import { EmpleadoService } from '../../../service/empleado.service';
import { PeriodoNomina } from '../../../model/periodo-nomina';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import { EstadoPeriodo } from '../../../model/estados-nomina';
import { RegistrarValorNoPagadoRequest } from '../../../model/valor-no-pagado';
import { ValorNoPagadoService } from '../../../service/valor-no-pagado.service';
import { criteriosPorEmpresa } from '../../parametrizacion/utiles-parametrizacion';
import { opcionesAviso } from '../../comunes/avisos';

/**
 * Registrar un valor no pagado (plan §8/§9): empleado activo, período ABIERTO o CALCULADO, valor
 * > 0, motivo obligatorio.
 *
 * Un solo control de empleado: `InlineAutocomplete` sobre la lista completa de activos de la
 * empresa (una carga al abrir el diálogo), filtrando client-side por nombre, apellido o cédula —
 * no el patrón de "buscar y luego elegir" de `AnticipoFormDialogComponent` (2026-09-08: ese patrón
 * resultó confuso y encima el cuadro de búsqueda sólo filtraba por identificación en el servidor).
 */
@Component({
  selector: 'app-registrar-valor-no-pagado-dialog',
  standalone: true,
  imports: [CommonModule, MaterialFormModule, InlineAutocompleteComponent],
  templateUrl: './registrar-valor-no-pagado-dialog.component.html',
  styleUrls: ['./registrar-valor-no-pagado-dialog.component.scss'],
})
export class RegistrarValorNoPagadoDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<RegistrarValorNoPagadoDialogComponent, boolean>);
  private empleadoService = inject(EmpleadoService);
  private periodoService = inject(PeriodoNominaService);
  private valorNoPagadoService = inject(ValorNoPagadoService);
  private appState = inject(AppStateService);
  private snackBar = inject(MatSnackBar);

  formEmpleado = signal<Empleado | null>(null);
  empleados = signal<Empleado[]>([]);
  cargandoEmpleados = signal<boolean>(false);

  /** Ofrece ABIERTO y CALCULADO (decisión 2026-09-08): un CALCULADO todavía admite el registro porque el motor regenera los renglones al recalcular. */
  periodosDisponibles = signal<PeriodoNomina[]>([]);
  formPeriodo = signal<PeriodoNomina | null>(null);
  cargandoPeriodos = signal<boolean>(false);

  periodoEsCalculado = computed(() => Number(this.formPeriodo()?.estado) === EstadoPeriodo.CALCULADO);

  valor = signal<number>(0);
  motivo = signal<string>('');

  guardando = signal<boolean>(false);
  errorMsg = signal<string>('');

  puedeGuardar = computed(() => {
    return !!this.formEmpleado()
      && !!this.formPeriodo()
      && this.valor() > 0
      && this.motivo().trim().length > 0
      && !this.guardando();
  });

  ngOnInit(): void {
    this.cargarEmpleados();
    this.cargarPeriodos();
  }

  /**
   * Carga en una sola llamada todos los empleados activos de la empresa (mismo patrón que
   * `ColaboradoresComponent`: `selectByCriteria(criteriosPorEmpresa('apellidos'))` sin buscar
   * primero) para que `InlineAutocomplete` filtre client-side por nombre, apellido o cédula vía
   * `[buscarPor]` — antes había un cuadro de "Buscar" separado que sólo filtraba por
   * identificación en el servidor y, si no encontraba nada, dejaba `empleados` vacío y con eso el
   * combo de abajo sin opciones para filtrar (2026-09-08, corregido a pedido del árbitro).
   */
  private cargarEmpleados(): void {
    this.cargandoEmpleados.set(true);
    this.empleadoService.selectByCriteria(criteriosPorEmpresa('apellidos')).subscribe({
      next: (rows: Empleado[] | null) => {
        const activos = this.extractRows(rows).filter((e) => this.isEmpleadoActivo(e.estado));
        this.empleados.set(activos);
        this.cargandoEmpleados.set(false);
      },
      error: (err) => {
        this.mostrarError(mensajeDeError(err, 'Error al cargar los empleados'));
        this.cargandoEmpleados.set(false);
      },
    });
  }

  onEmpleadoChange(empleado: Empleado | null): void {
    this.formEmpleado.set(empleado);
  }

  /**
   * ABIERTO y CALCULADO (2026-09-08): un CALCULADO todavía no distribuyó pagos, así que también
   * admite el registro — el motor regenera los renglones informativos del rol al recalcular. De
   * ahí en adelante (APROBADO en más) el rol ya está cerrado y no se puede registrar.
   */
  private cargarPeriodos(): void {
    this.cargandoPeriodos.set(true);
    this.periodoService.selectByCriteria(criteriosPorEmpresa('anio', 'mes')).subscribe({
      next: (data) => {
        const disponibles = (data ?? []).filter((p) => {
          const estado = Number(p.estado);
          return estado === EstadoPeriodo.ABIERTO || estado === EstadoPeriodo.CALCULADO;
        });
        this.periodosDisponibles.set(disponibles);
        // Default: el más reciente por (año, mes) entre los disponibles.
        if (!this.formPeriodo() && disponibles.length > 0) {
          const actual = [...disponibles].sort((a, b) => (b.anio - a.anio) || (b.mes - a.mes))[0];
          this.formPeriodo.set(actual);
        }
        this.cargandoPeriodos.set(false);
      },
      error: (err) => {
        this.mostrarError(mensajeDeError(err, 'No se pudieron cargar los períodos'));
        this.periodosDisponibles.set([]);
        this.cargandoPeriodos.set(false);
      },
    });
  }

  empleadoLabel(value: Empleado | null): string {
    if (!value) return '';
    const nombre = `${value.apellidos ?? ''} ${value.nombres ?? ''}`.replace(/\s+/g, ' ').trim();
    return `${value.identificacion ?? ''} - ${nombre}`.trim();
  }

  readonly buscarPorEmpleado = (e: Empleado): string[] => [
    e.identificacion != null ? String(e.identificacion) : '',
    e.apellidos ?? '',
    e.nombres ?? '',
  ];

  periodoLabel(periodo: PeriodoNomina | null): string {
    return periodo ? `${periodo.mes}/${periodo.anio}` : '';
  }

  readonly valorPeriodo = (p: PeriodoNomina): number => p.codigo;
  readonly buscarPorPeriodo = (p: PeriodoNomina): string[] => [String(p.mes), String(p.anio)];

  guardar(): void {
    const empleado = this.formEmpleado();
    const periodo = this.formPeriodo();
    const idEmpresa = empresaSesionCodigo() ?? this.appState.getEmpresa()?.codigo;
    if (!this.puedeGuardar() || !empleado || !periodo || !idEmpresa) {
      if (!idEmpresa) this.errorMsg.set('No se pudo determinar la empresa de la sesión.');
      return;
    }

    const payload: RegistrarValorNoPagadoRequest = {
      idEmpresa,
      idEmpleado: empleado.codigo,
      idPeriodo: periodo.codigo,
      valor: this.valor(),
      motivo: this.motivo().trim(),
      usuario: this.appState.getUsuario()?.nombre ?? sessionStorage.getItem('userName') ?? '',
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    this.valorNoPagadoService.registrar(payload).subscribe({
      next: (resultado) => {
        this.guardando.set(false);
        // La validación dura (contra el neto real) la hace el motor al procesar el rol — al
        // registrar, si X supera el salario base del contrato, el backend avisa sin bloquear
        // (plan §8). Se muestra igual aunque el registro haya salido bien.
        if (resultado?.advertencia) {
          this.mostrarError(resultado.advertencia);
        } else {
          this.mostrarExito(resultado?.mensaje || 'Valor no pagado registrado correctamente');
        }
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.guardando.set(false);
        // El backend rechaza acá, entre otros casos: período ya procesado, ya existe un registro
        // vivo para ese (empleado, período), o el aviso blando de X > salario base (plan §8) — se
        // muestra su mensaje real, nunca uno genérico (plan §9).
        this.errorMsg.set(mensajeDeError(err, 'No se pudo registrar el valor no pagado'));
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
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
