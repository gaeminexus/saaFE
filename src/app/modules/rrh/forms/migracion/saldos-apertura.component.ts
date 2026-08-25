import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { ExportService } from '../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { RubrosRrh } from '../../model/rubros-rrh';
import { SaldoApertura } from '../../model/saldo-apertura';
import { SaldoAperturaService } from '../../service/saldo-apertura.service';
import { criteriosPorEmpresa } from '../parametrizacion/utiles-parametrizacion';
import { mensajeDeError } from '../comunes/mensajes';
import { opcionesAviso } from '../comunes/avisos';

/**
 * Asistente de migración de saldos de apertura (RHH.SLAP).
 *
 * Cuatro pasos: cargar el archivo, revisar lo cargado, validar y aplicar. La reversión queda
 * disponible después, porque `SLAP` guarda en qué tabla y con qué id se materializó cada fila.
 *
 * Mientras el corte no se aplica, nada de lo cargado afecta a acumulados, vacaciones ni
 * descuentos: `SLAP` es una tabla puente, no el destino.
 */
@Component({
  selector: 'app-saldos-apertura',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatStepperModule,
    MatTableModule,
  ],
  templateUrl: './saldos-apertura.component.html',
  styleUrls: ['./saldos-apertura.component.scss'],
})
export class SaldosAperturaComponent {
  columnas = ['identificacion', 'empleado', 'tipoSaldoLabel', 'valor', 'dias', 'aplicadoLabel'];

  fechaCorte = signal<string>('');
  archivo = signal<File | null>(null);
  saldos = signal<SaldoApertura[]>([]);
  inconsistencias = signal<string[] | null>(null);
  ocupado = signal<boolean>(false);

  aplicados = computed(() => this.saldos().filter((s) => s.aplicado === 'S').length);
  pendientes = computed(() => this.saldos().length - this.aplicados());
  corteAplicado = computed(() => this.saldos().length > 0 && this.pendientes() === 0);
  puedeValidar = computed(() => this.saldos().length > 0);
  puedeAplicar = computed(
    () => this.inconsistencias() !== null && this.inconsistencias()!.length === 0 && this.pendientes() > 0,
  );

  filas = computed(() =>
    this.saldos().map((saldo) => ({
      ...saldo,
      empleadoLabel: this.etiquetaEmpleado(saldo),
      tipoSaldoLabel:
        this.detalleRubroService.getDescripcionByParentAndAlterno(
          RubrosRrh.TIPO_SALDO_APERTURA,
          saldo.tipoSaldo,
        ) || '—',
      aplicadoLabel: saldo.aplicado === 'S' ? 'Aplicado' : 'Pendiente',
    })),
  );

  constructor(
    private saldoService: SaldoAperturaService,
    private detalleRubroService: DetalleRubroService,
    private exportService: ExportService,
    private funcionesDatosS: FuncionesDatosService,
    private snackBar: MatSnackBar,
  ) {}

  onArchivoSeleccionado(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.archivo.set(input.files && input.files.length > 0 ? input.files[0] : null);
  }

  cargar(): void {
    const archivo = this.archivo();
    const fechaCorte = this.fechaCorte();

    if (!archivo || !fechaCorte) {
      this.avisar('Seleccione la fecha de corte y el archivo antes de cargar', true);
      return;
    }

    this.ocupado.set(true);
    this.saldoService.cargar(archivo, fechaCorte).subscribe({
      next: (cargados) => {
        this.ocupado.set(false);
        this.avisar(`${cargados} saldo(s) cargados. Revise el detalle antes de validar.`);
        this.inconsistencias.set(null);
        this.consultarCargados();
      },
      error: (err) => {
        this.ocupado.set(false);
        this.avisar(mensajeDeError(err, 'No se pudo cargar el archivo'), true);
      },
    });
  }

  consultarCargados(): void {
    const fechaCorte = this.fechaCorte();
    if (!fechaCorte) {
      this.avisar('Indique la fecha de corte', true);
      return;
    }

    this.ocupado.set(true);
    this.saldoService.selectByCriteria(this.criteriosDelCorte(fechaCorte)).subscribe({
      next: (data) => {
        this.ocupado.set(false);
        this.saldos.set(data ?? []);
      },
      error: (err) => {
        this.ocupado.set(false);
        this.saldos.set([]);
        this.avisar(mensajeDeError(err, 'No se pudieron leer los saldos cargados'), true);
      },
    });
  }

  validar(): void {
    this.ocupado.set(true);
    this.saldoService.validar(this.fechaCorte()).subscribe({
      next: (problemas) => {
        this.ocupado.set(false);
        this.inconsistencias.set(problemas ?? []);
        if ((problemas ?? []).length === 0) {
          this.avisar('El corte no tiene inconsistencias: puede aplicarlo.');
        }
      },
      error: (err) => {
        this.ocupado.set(false);
        this.inconsistencias.set(null);
        this.avisar(mensajeDeError(err, 'No se pudo validar el corte'), true);
      },
    });
  }

  aplicar(): void {
    this.ocupado.set(true);
    this.saldoService.aplicar(this.fechaCorte()).subscribe({
      next: (aplicados) => {
        this.ocupado.set(false);
        this.avisar(`${aplicados} saldo(s) aplicados al corte.`);
        this.consultarCargados();
      },
      error: (err) => {
        this.ocupado.set(false);
        this.avisar(mensajeDeError(err, 'No se pudo aplicar el corte'), true);
      },
    });
  }

  revertir(): void {
    this.ocupado.set(true);
    this.saldoService.revertir(this.fechaCorte()).subscribe({
      next: (revertidos) => {
        this.ocupado.set(false);
        this.avisar(`${revertidos} saldo(s) revertidos.`);
        this.inconsistencias.set(null);
        this.consultarCargados();
      },
      error: (err) => {
        this.ocupado.set(false);
        this.avisar(mensajeDeError(err, 'No se pudo revertir el corte'), true);
      },
    });
  }

  exportarCsv(): void {
    this.exportService.exportToCSV(
      this.filas(),
      'saldos-apertura',
      ['Identificación', 'Colaborador', 'Tipo de saldo', 'Valor', 'Días', 'Estado'],
      ['identificacion', 'empleadoLabel', 'tipoSaldoLabel', 'valor', 'dias', 'aplicadoLabel'],
    );
  }

  private criteriosDelCorte(fechaCorte: string): DatosBusqueda[] {
    const criterios = criteriosPorEmpresa('identificacion');

    const db = new DatosBusqueda();
    db.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.DATE,
      'fechaCorte',
      fechaCorte,
      TipoComandosBusqueda.IGUAL,
    );

    return [db, ...criterios];
  }

  /**
   * Nombre del colaborador, **cuando ya se conoce**.
   *
   * `SLAP.empleado` viene nulo del importador —el archivo trae la identificación y el enlace lo
   * resuelve `aplicar`—, así que antes de aplicar **todas** las filas están sin enlazar. Marcarlas
   * en rojo por eso convertía la columna en una alarma que suena siempre: con cien filas iguales,
   * la identificación que de verdad no casa desaparece entre las demás.
   *
   * Quien sabe si una identificación corresponde a alguien es `validar`, y lo dice en su lista de
   * inconsistencias. Aquí solo se muestra el nombre si el backend ya lo resolvió.
   */
  private etiquetaEmpleado(saldo: SaldoApertura): string {
    const empleado = saldo.empleado as any;
    if (!empleado?.apellidos && !empleado?.nombres) return '—';
    return `${empleado.apellidos ?? ''} ${empleado.nombres ?? ''}`.trim();
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      ...opcionesAviso(esError, mensaje),
    });
  }
}
