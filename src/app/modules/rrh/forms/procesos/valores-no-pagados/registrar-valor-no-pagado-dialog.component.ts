import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { InlineAutocompleteComponent } from '../../comunes/inline-autocomplete/inline-autocomplete.component';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { empresaSesionCodigo } from '../../../../../shared/services/empresa-sesion';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
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
 * Registrar un valor no pagado (plan §8/§9): empleado activo, período ABIERTO (el rol de ese
 * período todavía no se procesó — decisión 3 del usuario), valor > 0, motivo obligatorio.
 *
 * Mismo patrón de búsqueda de empleado que `AnticipoFormDialogComponent` (buscar por
 * identificación + `InlineAutocomplete` de activos de la empresa).
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

  formEmpleadoBusqueda = signal<string>('');
  formEmpleado = signal<Empleado | null>(null);
  empleados = signal<Empleado[]>([]);
  cargandoEmpleados = signal<boolean>(false);

  periodosAbiertos = signal<PeriodoNomina[]>([]);
  formPeriodo = signal<PeriodoNomina | null>(null);
  cargandoPeriodos = signal<boolean>(false);

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
    this.onBuscarEmpleados();
    this.cargarPeriodosAbiertos();
  }

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
  }

  /** Sólo los períodos ABIERTOS (plan §8): antes de eso, el rol ya se procesó y no se puede registrar. */
  private cargarPeriodosAbiertos(): void {
    this.cargandoPeriodos.set(true);
    this.periodoService.selectByCriteria(criteriosPorEmpresa('anio', 'mes')).subscribe({
      next: (data) => {
        const abiertos = (data ?? []).filter((p) => Number(p.estado) === EstadoPeriodo.ABIERTO);
        this.periodosAbiertos.set(abiertos);
        // Default: el abierto actual — el más reciente por (año, mes), ya que ordinariamente sólo
        // hay uno vivo a la vez.
        if (!this.formPeriodo() && abiertos.length > 0) {
          const actual = [...abiertos].sort((a, b) => (b.anio - a.anio) || (b.mes - a.mes))[0];
          this.formPeriodo.set(actual);
        }
        this.cargandoPeriodos.set(false);
      },
      error: (err) => {
        this.mostrarError(mensajeDeError(err, 'No se pudieron cargar los períodos abiertos'));
        this.periodosAbiertos.set([]);
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
