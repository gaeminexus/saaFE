import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppStateService } from '../../../../../shared/services/app-state.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { Periodo } from '../../../../cnt/model/periodo';
import { PeriodoService } from '../../../../cnt/service/periodo.service';
import { CuentaBancaria } from '../../../model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../service/cuenta-bancaria.service';
import {
  CerrarConciliacionRequest,
  PartidaDeclarada,
  PrepararCierreResponse,
  TIPO_TRANSITO_LABELS,
  TipoTransito,
  coeficienteTransito,
} from '../../../model/conciliacion-cierre';
import { ConciliacionCierreService } from '../../../service/conciliacion-cierre.service';

/** Tolerancia de la ecuación clásica — la misma que usa el cierre de caja chica y conciliarGrupo. */
const TOLERANCIA_DIFERENCIA = 0.01;

/**
 * Fila unificada para la tabla de pendientes. El backend las devuelve en dos
 * arrays separados (`pendientesAsiento`/`pendientesExtracto`, con distintos
 * campos de id cada uno) — se combinan acá solo para pintar una tabla, pero
 * el payload de cierre sigue mandando cada una por su campo real
 * (`idMovimientoBanco` o `idDetalleExtracto`, nunca ambos).
 */
interface FilaPendiente {
  key: string;
  origen: 'LIBROS' | 'EXTRACTO';
  idMovimientoBanco: number | null;
  idDetalleExtracto: number | null;
  fecha: unknown;
  descripcion: string;
  valor: number;
  esArrastrada: boolean;
  tipoSugerido: number | null;
  /** false cuando la línea de libros no tiene MovimientoBanco asociado — no se puede declarar (§10.2 en saaBE). */
  declarable: boolean;
}

/** Estado de clasificación de una fila pendiente, editable por el usuario. */
interface EstadoFila {
  declarada: boolean;
  tipo: number;
  observacion: string;
}

/**
 * Cierre de conciliación con partidas en tránsito. Ver
 * docs/logica-negocio/tsr/DISENO-CONCILIACION-PARTIDAS-EN-TRANSITO.md en
 * saaBE — la ecuación clásica reemplaza la exigencia de "cero pendientes":
 * el mes cierra si (saldoLibros − t1 + t2 + t3 − t4) cuadra con
 * saldoExtracto dentro de la tolerancia (ver `coeficienteTransito` en el
 * modelo para el razonamiento completo, con ejemplo numérico).
 */
@Component({
  selector: 'app-conciliacion-cierre',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatSnackBarModule,
  ],
  templateUrl: './conciliacion-cierre.component.html',
  styleUrls: ['./conciliacion-cierre.component.scss'],
})
export class ConciliacionCierreComponent implements OnInit {
  private cierreS = inject(ConciliacionCierreService);
  private cuentaS = inject(CuentaBancariaService);
  private periodoS = inject(PeriodoService);
  private appState = inject(AppStateService);
  private funcionesDatosS = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);

  readonly TipoTransito = TipoTransito;
  readonly tipoTransitoOptions = Object.entries(TIPO_TRANSITO_LABELS).map(([codigo, texto]) => ({
    codigo: Number(codigo),
    texto,
  }));

  cuentas = signal<CuentaBancaria[]>([]);
  periodos = signal<Periodo[]>([]);
  cargandoCatalogos = signal(false);

  cuentaSeleccionada = signal<CuentaBancaria | null>(null);
  periodoSeleccionado = signal<Periodo | null>(null);

  preparando = signal(false);
  preparado = signal<PrepararCierreResponse | null>(null);
  filas = signal<FilaPendiente[]>([]);
  /** Estado editable de cada fila, por key — no vive dentro de `preparado` para que la ecuación en vivo sea siempre un computed() sobre signals. */
  estadoFilas = signal<Record<string, EstadoFila>>({});

  /**
   * Saldo del extracto: arranca en `saldoExtractoSugerido` cuando el backend
   * lo trae. Puede venir `null` (sin filas de extracto en el período de qué
   * tomarlo) — en ese caso NO se asume 0: queda `null` hasta que el usuario
   * lo escriba a mano, y la ecuación no se muestra mientras tanto.
   */
  saldoExtracto = signal<number | null>(null);

  cerrando = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  columnasConciliados = ['idGrupo', 'fecha', 'valorAsiento', 'valorExtracto', 'usuario'];
  columnasPendientes = ['declarar', 'origen', 'fecha', 'descripcion', 'valor', 'tipo', 'observacion'];

  /** Suma con coeficiente de las filas actualmente declaradas — ver coeficienteTransito() en el modelo. */
  sumaDeclaradas = computed(() => {
    const filas = this.filas();
    const estados = this.estadoFilas();
    let suma = 0;
    for (const f of filas) {
      const estado = estados[f.key];
      if (!estado?.declarada) continue;
      suma += coeficienteTransito(estado.tipo) * Number(f.valor || 0);
    }
    return suma;
  });

  /**
   * saldoLibros − t1 + t2 + t3 − t4 (declaradas) − saldoExtracto. `null`
   * mientras no haya `preparado()` O el usuario todavía no ingresó el saldo
   * del extracto — no se muestra una diferencia calculada contra un 0
   * inventado.
   */
  diferenciaViva = computed(() => {
    const prep = this.preparado();
    const saldoExtracto = this.saldoExtracto();
    if (!prep || saldoExtracto == null) return null;
    return prep.saldoLibros + this.sumaDeclaradas() - saldoExtracto;
  });

  cuadra = computed(() => {
    const d = this.diferenciaViva();
    return d != null && Math.abs(d) <= TOLERANCIA_DIFERENCIA;
  });

  /** Ningún pendiente declarable puede quedar sin declarar — igual que exige `verificar()` en el backend (§10.2). */
  todoDeclarado = computed(() => {
    const estados = this.estadoFilas();
    return this.filas().every((f) => !f.declarable || estados[f.key]?.declarada);
  });

  puedeCerrar = computed(() => !!this.preparado() && this.cuadra() && this.todoDeclarado() && !this.cerrando());

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  private cargarCatalogos(): void {
    const idEmpresa = this.appState.getEmpresa()?.codigo;
    if (!idEmpresa) {
      this.cuentas.set([]);
      this.periodos.set([]);
      this.errorMsg.set('No se pudo determinar la empresa de la sesión');
      return;
    }

    this.cargandoCatalogos.set(true);

    this.cuentaS.getAll().subscribe({
      next: (data) => this.cuentas.set(Array.isArray(data) ? (data as CuentaBancaria[]).filter((c) => Number(c.estado) === 1) : []),
      error: () => this.cuentas.set([]),
    });

    this.periodoS.getAll().subscribe({
      next: (data) => {
        const todos = Array.isArray(data) ? data : [];
        this.periodos.set(todos.filter((p) => p.empresa?.codigo === idEmpresa));
        this.cargandoCatalogos.set(false);
      },
      error: () => {
        this.periodos.set([]);
        this.cargandoCatalogos.set(false);
      },
    });
  }

  puedePreparar(): boolean {
    return !!this.cuentaSeleccionada() && !!this.periodoSeleccionado() && !this.preparando();
  }

  prepararCierre(): void {
    const cuenta = this.cuentaSeleccionada();
    const periodo = this.periodoSeleccionado();
    if (!cuenta || !periodo) return;

    this.preparando.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');
    this.preparado.set(null);
    this.filas.set([]);
    this.estadoFilas.set({});

    this.cierreS.preparar(cuenta.codigo, periodo.codigo).subscribe({
      next: (resp) => {
        this.preparando.set(false);
        this.preparado.set(resp);
        this.saldoExtracto.set(resp.saldoExtractoSugerido);

        const filasAsiento: FilaPendiente[] = (resp.pendientesAsiento ?? []).map((p) => ({
          key: `asiento-${p.idDetalleAsiento}`,
          origen: 'LIBROS',
          idMovimientoBanco: p.idMovimientoBanco,
          idDetalleExtracto: null,
          fecha: p.fecha,
          descripcion: p.descripcion,
          valor: p.valor,
          esArrastrada: p.esArrastrada,
          tipoSugerido: p.tipoSugerido,
          declarable: p.idMovimientoBanco != null,
        }));
        const filasExtracto: FilaPendiente[] = (resp.pendientesExtracto ?? []).map((p) => ({
          key: `extracto-${p.idDetalleExtracto}`,
          origen: 'EXTRACTO',
          idMovimientoBanco: null,
          idDetalleExtracto: p.idDetalleExtracto,
          fecha: p.fecha,
          descripcion: p.descripcion,
          valor: p.valor,
          esArrastrada: p.esArrastrada,
          tipoSugerido: p.tipoSugerido,
          declarable: true,
        }));
        const todasLasFilas = [...filasAsiento, ...filasExtracto];
        this.filas.set(todasLasFilas);

        const estados: Record<string, EstadoFila> = {};
        for (const f of todasLasFilas) {
          estados[f.key] = {
            // Proponer marcada con el tipo sugerido: el usuario no debería clasificar a mano.
            declarada: f.declarable && f.tipoSugerido != null,
            tipo: f.tipoSugerido ?? TipoTransito.DEPOSITO_EN_TRANSITO,
            observacion: '',
          };
        }
        this.estadoFilas.set(estados);
      },
      error: (err) => {
        this.preparando.set(false);
        this.errorMsg.set(mensajeDeError(err, 'No se pudo preparar el cierre'));
      },
    });
  }

  toggleDeclarada(key: string, valor: boolean): void {
    this.estadoFilas.update((estados) => ({
      ...estados,
      [key]: { ...estados[key], declarada: valor },
    }));
  }

  cambiarTipo(key: string, tipo: number): void {
    this.estadoFilas.update((estados) => ({
      ...estados,
      [key]: { ...estados[key], tipo },
    }));
  }

  cambiarObservacion(key: string, observacion: string): void {
    this.estadoFilas.update((estados) => ({
      ...estados,
      [key]: { ...estados[key], observacion },
    }));
  }

  estadoDe(key: string): EstadoFila | undefined {
    return this.estadoFilas()[key];
  }

  cerrarConciliacion(): void {
    const cuenta = this.cuentaSeleccionada();
    const periodo = this.periodoSeleccionado();
    const prep = this.preparado();
    const saldoExtracto = this.saldoExtracto();
    // `puedeCerrar()` ya exige `cuadra()`, que a su vez exige `saldoExtracto != null` —
    // esta comprobación es solo para que TypeScript sepa que no es null al construir el payload.
    if (!cuenta || !periodo || !prep || saldoExtracto == null || !this.puedeCerrar()) return;

    const estados = this.estadoFilas();
    const partidas: PartidaDeclarada[] = this.filas()
      .filter((f) => estados[f.key]?.declarada)
      .map((f) => ({
        idMovimientoBanco: f.origen === 'LIBROS' ? f.idMovimientoBanco : undefined,
        idDetalleExtracto: f.origen === 'EXTRACTO' ? f.idDetalleExtracto : undefined,
        tipo: estados[f.key].tipo,
        observacion: estados[f.key].observacion.trim() || undefined,
      }));

    const payload: CerrarConciliacionRequest = {
      idCuentaBancaria: cuenta.codigo,
      idPeriodo: periodo.codigo,
      partidas,
      saldoExtracto,
      usuario: usuarioSesion(),
    };

    this.cerrando.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    this.cierreS.cerrar(payload).subscribe({
      next: (resp) => {
        this.cerrando.set(false);
        this.successMsg.set(`Conciliación cerrada correctamente (cierre N° ${resp.idCierre}).`);
        this.snackBar.open('✓ Conciliación cerrada correctamente', 'Cerrar', {
          duration: 4000,
          panelClass: ['snackbar-success'],
        });
        this.preparado.set(null);
        this.filas.set([]);
        this.estadoFilas.set({});
      },
      error: (err) => {
        this.cerrando.set(false);
        this.errorMsg.set(mensajeDeError(err, 'No se pudo cerrar la conciliación'));
      },
    });
  }

  tipoLabel(tipo: number | null | undefined): string {
    if (tipo == null) return '—';
    return TIPO_TRANSITO_LABELS[tipo] || `Tipo ${tipo}`;
  }

  origenLabel(origen: string): string {
    return origen === 'EXTRACTO' ? 'Extracto' : 'Libros';
  }

  fechaDisplay(fecha: unknown): string {
    return this.funcionesDatosS.formatoFecha(fecha as any, FuncionesDatosService.SOLO_FECHA) || '—';
  }

  /**
   * Días desde `fecha` hasta hoy. Para una fila arrastrada, `fecha` YA es la
   * fecha original del movimiento (`fechaTransaccion`/`asiento.fechaAsiento`)
   * — el backend no agregó un campo aparte, según §10.1 en saaBE.
   */
  diasArrastrada(f: FilaPendiente): number {
    if (!f.esArrastrada) return 0;
    const fecha = this.funcionesDatosS.convertirFechaDesdeBackend(f.fecha as any);
    if (!fecha) return 0;
    const ms = Date.now() - fecha.getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  }

  /** Umbral visual: mismo criterio de 60 días del aviso de antigüedad (§8 del diseño). */
  esArrastradaAntigua(f: FilaPendiente): boolean {
    return f.esArrastrada && this.diasArrastrada(f) >= 60;
  }

  get faltaParaCuadrar(): string {
    const d = this.diferenciaViva();
    if (d == null) return '';
    return Math.abs(d).toFixed(2);
  }
}
