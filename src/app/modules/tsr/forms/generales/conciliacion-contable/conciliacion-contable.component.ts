import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { UsuarioService } from '../../../../../shared/services/usuario.service';
import { Periodo } from '../../../../cnt/model/periodo';
import { PeriodoService } from '../../../../cnt/service/periodo.service';
import { ConciliacionContable, EstadoConciliacionContable } from '../../../model/conciliacion-contable';
import { ControlExtractoBancario } from '../../../model/control-extracto-bancario';
import { CuentaBancaria } from '../../../model/cuenta-bancaria';
import { DetalleAsientoConciliacion } from '../../../model/detalle-asiento-conciliacion';
import { DetalleExtractoBancario } from '../../../model/detalle-extracto-bancario';
import { GrupoConciliacionAsiento } from '../../../model/grupo-conciliacion-asiento';
import { GrupoConciliacionContable } from '../../../model/grupo-conciliacion-contable';
import { GrupoConciliacionExtracto } from '../../../model/grupo-conciliacion-extracto';
import { ResumenConciliacionCuenta } from '../../../model/resumen-conciliacion-cuenta';
import { SugerenciaConciliacionContable } from '../../../model/sugerencia-conciliacion-contable';
import { ConciliacionContableService } from '../../../service/conciliacion-contable.service';
import { ControlExtractoBancarioService } from '../../../service/control-extracto-bancario.service';
import { GrupoConciliacionAsientoService } from '../../../service/grupo-conciliacion-asiento.service';
import { GrupoConciliacionExtractoService } from '../../../service/grupo-conciliacion-extracto.service';

const TOLERANCIA_MONETARIA = 0.01;

@Component({
  selector: 'app-conciliacion-contable',
  standalone: true,
  imports: [MaterialFormModule],
  templateUrl: './conciliacion-contable.component.html',
  styleUrl: './conciliacion-contable.component.scss',
})
export class ConciliacionContableComponent implements OnInit {
  readonly EstadoConciliacionContable = EstadoConciliacionContable;

  cuentaSeleccionada: number | null = null;
  /** Cuenta bancaria elegida en el resumen, para mostrar banco/número en el detalle. */
  cuentaSeleccionadaInfo: CuentaBancaria | null = null;

  periodos: Periodo[] = [];
  periodoSeleccionado: number | null = null;

  resumenCuentas: ResumenConciliacionCuenta[] = [];
  isLoadingResumen = false;

  isLoadingPeriodos = false;
  isLoadingDatos = false;
  isConciliando = false;
  isSugiriendo = false;
  isConfirmandoTodas = false;
  isCerrandoMes = false;
  isReabriendoMes = false;

  /**
   * Registro de control de TSR (ControlExtractoBancario) para el período
   * seleccionado - fuente de verdad de si el período está cerrado para
   * conciliación bancaria (cerrado/usuarioCierre/fechaCierre), independiente
   * de Periodo.estado (que es un concepto propio de CNT).
   */
  controlPeriodoActual: ControlExtractoBancario | null = null;

  cabecera: ConciliacionContable | null = null;
  pendientesExtracto: DetalleExtractoBancario[] = [];
  pendientesAsiento: DetalleAsientoConciliacion[] = [];
  gruposActivos: GrupoConciliacionContable[] = [];
  sugerencias: SugerenciaConciliacionContable[] = [];

  seleccionExtracto = new Set<number>();
  seleccionAsiento = new Set<number>();

  grupoExpandido: number | null = null;
  detalleGrupoExtracto: GrupoConciliacionExtracto[] = [];
  detalleGrupoAsiento: GrupoConciliacionAsiento[] = [];
  isLoadingDetalleGrupo = false;

  constructor(
    private periodoService: PeriodoService,
    private conciliacionContableService: ConciliacionContableService,
    private controlExtractoBancarioService: ControlExtractoBancarioService,
    private grupoConciliacionExtractoService: GrupoConciliacionExtractoService,
    private grupoConciliacionAsientoService: GrupoConciliacionAsientoService,
    private appStateService: AppStateService,
    private usuarioService: UsuarioService,
    private snackBar: MatSnackBar,
    private funcionesDatosService: FuncionesDatosService
  ) {}

  ngOnInit(): void {
    this.cargarPeriodos();
  }

  cargarPeriodos(): void {
    this.isLoadingPeriodos = true;
    this.periodoService.getAll().subscribe({
      next: (periodos) => {
        this.periodos = (Array.isArray(periodos) ? periodos : []).sort(
          (a, b) => b.anio - a.anio || b.mes - a.mes
        );
        this.isLoadingPeriodos = false;
      },
      error: () => {
        this.snackBar.open('Error al cargar períodos contables', 'Cerrar', { duration: 4000 });
        this.periodos = [];
        this.isLoadingPeriodos = false;
      },
    });
  }

/**
   * Al cambiar de período se vuelve siempre a la vista de resumen (lista de
   * cuentas) - si el usuario tenía una cuenta abierta de un período anterior,
   * seguir viéndola ya no tiene sentido.
   */
  onPeriodoChange(): void {
    this.cuentaSeleccionada = null;
    this.limpiarVistaCuenta();
    this.controlPeriodoActual = null;
    if (this.periodoSeleccionado) {
      this.cargarResumen();
      this.cargarControlPeriodo();
    } else {
      this.resumenCuentas = [];
    }
  }

  /**
   * Trae (o genera si es la primera vez) el registro de control de TSR para
   * el período seleccionado, de donde sale si está cerrado y quién/cuándo lo
   * cerró - ver controlPeriodoActual.
   */
  private cargarControlPeriodo(): void {
    const empresa = this.appStateService.getEmpresa();
    if (!empresa?.codigo || !this.periodoSeleccionado) {
      return;
    }
    this.controlExtractoBancarioService.generarPeriodo(empresa.codigo, this.periodoSeleccionado).subscribe({
      next: (control) => {
        this.controlPeriodoActual = control;
      },
      error: () => {
        this.controlPeriodoActual = null;
      },
    });
  }

  private cargarResumen(): void {
    const empresa = this.appStateService.getEmpresa();
    if (!empresa?.codigo || !this.periodoSeleccionado) {
      return;
    }
    this.isLoadingResumen = true;
    this.conciliacionContableService.resumenPorPeriodo(empresa.codigo, this.periodoSeleccionado).subscribe({
      next: (resumen) => {
        this.resumenCuentas = Array.isArray(resumen) ? resumen : [];
        this.isLoadingResumen = false;
      },
      error: (error) => {
        this.isLoadingResumen = false;
        this.resumenCuentas = [];
        this.snackBar.open(
          `Error al obtener el resumen del período: ${error?.error || error?.message || error}`,
          'Cerrar',
          { duration: 6000 }
        );
      },
    });
  }

  /**
   * Cuentas pendientes primero (lo accionable), verificadas al final -
   * en vez de dejar que el usuario tenga que buscar entre todas.
   */
  get resumenOrdenado(): ResumenConciliacionCuenta[] {
    return [...this.resumenCuentas].sort((a, b) => {
      const prioridadA = this.prioridadEstado(a);
      const prioridadB = this.prioridadEstado(b);
      if (prioridadA !== prioridadB) {
        return prioridadA - prioridadB;
      }
      return (a.cuentaBancaria?.banco?.nombre || '').localeCompare(b.cuentaBancaria?.banco?.nombre || '');
    });
  }

  private prioridadEstado(fila: ResumenConciliacionCuenta): number {
    if (fila.estadoRevision === EstadoConciliacionContable.CON_DIFERENCIAS) {
      return 0;
    }
    if (fila.estadoRevision === EstadoConciliacionContable.VERIFICADO) {
      return 2;
    }
    return 1; // pendiente o nunca abierto
  }

  get totalCuentasVerificadas(): number {
    return this.resumenCuentas.filter((f) => f.estadoRevision === EstadoConciliacionContable.VERIFICADO).length;
  }

  /** El objeto Periodo completo del período elegido (nombre, mes, año, etc.). */
  get periodoActual(): Periodo | null {
    return this.periodos.find((p) => p.codigo === this.periodoSeleccionado) || null;
  }

  get periodoActualCerrado(): boolean {
    return this.controlPeriodoActual?.cerrado === 1;
  }

  get puedeCerrarMes(): boolean {
    return (
      !this.periodoActualCerrado &&
      this.resumenCuentas.length > 0 &&
      this.totalCuentasVerificadas === this.resumenCuentas.length
    );
  }

  cerrarMes(): void {
    const empresa = this.appStateService.getEmpresa();
    if (!empresa?.codigo || !this.periodoSeleccionado || !this.puedeCerrarMes) {
      return;
    }
    if (!confirm('¿Cerrar este mes? Después de cerrado no se podrán cargar nuevos extractos, conciliar ni deshacer conciliaciones para este período.')) {
      return;
    }
    const usuario = this.usuarioService.getUsuarioLog()?.nombre || '';
    this.isCerrandoMes = true;
    this.conciliacionContableService.cerrarMes(empresa.codigo, this.periodoSeleccionado, usuario).subscribe({
      next: () => {
        this.isCerrandoMes = false;
        this.snackBar.open('Mes cerrado correctamente', 'Cerrar', { duration: 4000 });
        this.cargarResumen();
        this.cargarControlPeriodo();
      },
      error: (error) => {
        this.isCerrandoMes = false;
        this.snackBar.open(`Error al cerrar el mes: ${error?.error || error?.message || error}`, 'Cerrar', {
          duration: 8000,
        });
      },
    });
  }

  reabrirMes(): void {
    const empresa = this.appStateService.getEmpresa();
    if (!empresa?.codigo || !this.periodoSeleccionado || !this.periodoActualCerrado) {
      return;
    }
    if (!confirm('¿Reabrir este mes? Se volverán a permitir cambios (cargar extractos, conciliar) para este período.')) {
      return;
    }
    this.isReabriendoMes = true;
    this.conciliacionContableService.reabrirMes(empresa.codigo, this.periodoSeleccionado).subscribe({
      next: () => {
        this.isReabriendoMes = false;
        this.snackBar.open('Mes reabierto correctamente', 'Cerrar', { duration: 4000 });
        this.cargarResumen();
        this.cargarControlPeriodo();
      },
      error: (error) => {
        this.isReabriendoMes = false;
        this.snackBar.open(`Error al reabrir el mes: ${error?.error || error?.message || error}`, 'Cerrar', {
          duration: 6000,
        });
      },
    });
  }

  estadoResumenTexto(fila: ResumenConciliacionCuenta): string {
    if (fila.estadoRevision === EstadoConciliacionContable.VERIFICADO) {
      return 'Verificado';
    }
    if (fila.estadoRevision === EstadoConciliacionContable.CON_DIFERENCIAS) {
      return 'Con diferencias';
    }
    if (!fila.extractoCargado) {
      return 'Extracto no cargado';
    }
    if (fila.totalPendientesExtracto === 0 && fila.totalPendientesAsiento === 0) {
      return 'Sin movimientos';
    }
    return 'Pendiente';
  }

  estadoResumenClase(fila: ResumenConciliacionCuenta): string {
    if (fila.estadoRevision === EstadoConciliacionContable.VERIFICADO) {
      return 'badge-registrado';
    }
    if (fila.estadoRevision === EstadoConciliacionContable.CON_DIFERENCIAS) {
      return 'badge-error';
    }
    if (!fila.extractoCargado) {
      return 'badge-novedad';
    }
    if (fila.totalPendientesExtracto === 0 && fila.totalPendientesAsiento === 0) {
      return 'badge-revertido';
    }
    return 'badge-novedad';
  }

  /** Entra al detalle de conciliación de una cuenta específica. */
  seleccionarCuenta(fila: ResumenConciliacionCuenta): void {
    this.cuentaSeleccionada = fila.cuentaBancaria.codigo;
    this.cuentaSeleccionadaInfo = fila.cuentaBancaria;
    this.limpiarSeleccion();
    this.sugerencias = [];
    this.grupoExpandido = null;
    this.cargarDatos();
  }

  /** Vuelve de la vista de detalle de una cuenta a la lista de resumen del período. */
  volverAlResumen(): void {
    this.cuentaSeleccionada = null;
    this.cuentaSeleccionadaInfo = null;
    this.limpiarVistaCuenta();
    this.cargarResumen();
  }

  private limpiarVistaCuenta(): void {
    this.cabecera = null;
    this.pendientesExtracto = [];
    this.pendientesAsiento = [];
    this.gruposActivos = [];
    this.sugerencias = [];
    this.grupoExpandido = null;
    this.limpiarSeleccion();
  }

  private limpiarSeleccion(): void {
    this.seleccionExtracto.clear();
    this.seleccionAsiento.clear();
  }

  cargarDatos(): void {
    if (!this.cuentaSeleccionada || !this.periodoSeleccionado) {
      return;
    }
    this.isLoadingDatos = true;
    this.conciliacionContableService.cabecera(this.cuentaSeleccionada, this.periodoSeleccionado).subscribe({
      next: (cabecera) => {
        this.cabecera = cabecera;
        this.cargarPendientesYGrupos();
      },
      error: (error) => {
        this.isLoadingDatos = false;
        this.snackBar.open(`Error al obtener la conciliación: ${error?.error || error?.message || error}`, 'Cerrar', {
          duration: 6000,
        });
      },
    });
  }

  private cargarPendientesYGrupos(): void {
    if (!this.cuentaSeleccionada || !this.periodoSeleccionado) {
      return;
    }
    const idCuenta = this.cuentaSeleccionada;
    const idPeriodo = this.periodoSeleccionado;

    this.conciliacionContableService.pendientesExtracto(idCuenta, idPeriodo).subscribe({
      next: (lista) => (this.pendientesExtracto = Array.isArray(lista) ? lista : []),
      error: () => (this.pendientesExtracto = []),
    });
    this.conciliacionContableService.pendientesAsiento(idCuenta, idPeriodo).subscribe({
      next: (lista) => (this.pendientesAsiento = Array.isArray(lista) ? lista : []),
      error: () => (this.pendientesAsiento = []),
    });
    if (this.cabecera) {
      this.conciliacionContableService.grupos(this.cabecera.codigo).subscribe({
        next: (grupos) => {
          this.gruposActivos = Array.isArray(grupos) ? grupos : [];
          this.isLoadingDatos = false;
        },
        error: () => {
          this.gruposActivos = [];
          this.isLoadingDatos = false;
        },
      });
    } else {
      this.isLoadingDatos = false;
    }
  }

  valorNetoExtracto(fila: DetalleExtractoBancario): number {
    return (fila.credito || 0) - (fila.debito || 0);
  }

  valorNetoAsiento(fila: DetalleAsientoConciliacion): number {
    return (fila.valorDebe || 0) - (fila.valorHaber || 0);
  }

  toggleExtracto(codigo: number): void {
    if (this.periodoActualCerrado) {
      return;
    }
    if (this.seleccionExtracto.has(codigo)) {
      this.seleccionExtracto.delete(codigo);
    } else {
      this.seleccionExtracto.add(codigo);
    }
  }

  toggleAsiento(codigo: number): void {
    if (this.periodoActualCerrado) {
      return;
    }
    if (this.seleccionAsiento.has(codigo)) {
      this.seleccionAsiento.delete(codigo);
    } else {
      this.seleccionAsiento.add(codigo);
    }
  }

  get sumaSeleccionExtracto(): number {
    return this.pendientesExtracto
      .filter((f) => this.seleccionExtracto.has(f.codigo))
      .reduce((acc, f) => acc + this.valorNetoExtracto(f), 0);
  }

  get sumaSeleccionAsiento(): number {
    return this.pendientesAsiento
      .filter((f) => this.seleccionAsiento.has(f.codigo))
      .reduce((acc, f) => acc + this.valorNetoAsiento(f), 0);
  }

  get diferenciaSeleccion(): number {
    return this.sumaSeleccionExtracto - this.sumaSeleccionAsiento;
  }

  get puedeConciliar(): boolean {
    return (
      !this.periodoActualCerrado &&
      this.seleccionExtracto.size > 0 &&
      this.seleccionAsiento.size > 0 &&
      Math.abs(this.diferenciaSeleccion) <= TOLERANCIA_MONETARIA
    );
  }

  conciliarSeleccionados(): void {
    if (!this.cuentaSeleccionada || !this.periodoSeleccionado || !this.puedeConciliar) {
      return;
    }
    const usuario = this.usuarioService.getUsuarioLog()?.nombre || '';
    this.isConciliando = true;
    this.conciliacionContableService
      .conciliar(
        this.cuentaSeleccionada,
        this.periodoSeleccionado,
        Array.from(this.seleccionExtracto),
        Array.from(this.seleccionAsiento),
        usuario
      )
      .subscribe({
        next: () => {
          this.isConciliando = false;
          this.snackBar.open('Grupo conciliado correctamente', 'Cerrar', { duration: 4000 });
          this.limpiarSeleccion();
          this.cargarDatos();
        },
        error: (error) => {
          this.isConciliando = false;
          this.snackBar.open(`Error al conciliar: ${error?.error || error?.message || error}`, 'Cerrar', {
            duration: 6000,
          });
        },
      });
  }

  sugerirCoincidencias(): void {
    if (!this.cuentaSeleccionada || !this.periodoSeleccionado || this.periodoActualCerrado) {
      return;
    }
    this.isSugiriendo = true;
    this.conciliacionContableService.sugerencias(this.cuentaSeleccionada, this.periodoSeleccionado).subscribe({
      next: (sugerencias) => {
        this.isSugiriendo = false;
        this.sugerencias = Array.isArray(sugerencias) ? sugerencias : [];
        if (this.sugerencias.length === 0) {
          this.snackBar.open('No se encontraron coincidencias automáticas', 'Cerrar', { duration: 4000 });
        }
      },
      error: (error) => {
        this.isSugiriendo = false;
        this.snackBar.open(`Error al sugerir coincidencias: ${error?.error || error?.message || error}`, 'Cerrar', {
          duration: 6000,
        });
      },
    });
  }

  confirmarSugerencia(sugerencia: SugerenciaConciliacionContable): void {
    if (!this.cuentaSeleccionada || !this.periodoSeleccionado || this.periodoActualCerrado) {
      return;
    }
    const usuario = this.usuarioService.getUsuarioLog()?.nombre || '';
    this.conciliacionContableService
      .conciliar(
        this.cuentaSeleccionada,
        this.periodoSeleccionado,
        sugerencia.idsDetalleExtracto,
        sugerencia.idsDetalleAsiento,
        usuario
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Coincidencia confirmada', 'Cerrar', { duration: 3000 });
          this.sugerencias = this.sugerencias.filter((s) => s !== sugerencia);
          this.cargarDatos();
        },
        error: (error) => {
          this.snackBar.open(`Error al confirmar: ${error?.error || error?.message || error}`, 'Cerrar', {
            duration: 6000,
          });
        },
      });
  }

  descartarSugerencia(sugerencia: SugerenciaConciliacionContable): void {
    this.sugerencias = this.sugerencias.filter((s) => s !== sugerencia);
  }

  /**
   * Confirma todas las sugerencias vigentes de una sola vez, una por una en
   * secuencia (no en paralelo) para poder atribuir con claridad cual
   * sugerencia especifica fallo si el servidor rechaza alguna (ej. una fila
   * que dejo de calificar entre que se sugirio y que se confirma).
   */
  confirmarTodasLasSugerencias(): void {
    if (
      !this.cuentaSeleccionada ||
      !this.periodoSeleccionado ||
      this.sugerencias.length === 0 ||
      this.periodoActualCerrado
    ) {
      return;
    }
    this.isConfirmandoTodas = true;
    const usuario = this.usuarioService.getUsuarioLog()?.nombre || '';
    const pendientes = [...this.sugerencias];
    let exitosas = 0;
    const fallidas: string[] = [];

    const procesarSiguiente = (indice: number): void => {
      if (indice >= pendientes.length) {
        this.isConfirmandoTodas = false;
        this.sugerencias = [];
        this.cargarDatos();
        const resumen =
          fallidas.length === 0
            ? `${exitosas} coincidencia(s) confirmada(s)`
            : `${exitosas} confirmada(s), ${fallidas.length} fallaron: ${fallidas.join('; ')}`;
        this.snackBar.open(resumen, 'Cerrar', { duration: 8000 });
        return;
      }
      const sugerencia = pendientes[indice];
      this.conciliacionContableService
        .conciliar(
          this.cuentaSeleccionada as number,
          this.periodoSeleccionado as number,
          sugerencia.idsDetalleExtracto,
          sugerencia.idsDetalleAsiento,
          usuario
        )
        .subscribe({
          next: () => {
            exitosas++;
            procesarSiguiente(indice + 1);
          },
          error: (error) => {
            fallidas.push(sugerencia.descripcionResumen || `#${indice + 1}`);
            console.error('Error al confirmar sugerencia', error);
            procesarSiguiente(indice + 1);
          },
        });
    };
    procesarSiguiente(0);
  }

  /**
   * Lineas reales de DetalleExtractoBancario de una sugerencia, para mostrar
   * fecha/descripcion/valor legibles en vez de solo un conteo - se buscan en
   * la lista de pendientes ya cargada, sin llamada adicional al backend.
   */
  lineasExtractoDeSugerencia(sugerencia: SugerenciaConciliacionContable): DetalleExtractoBancario[] {
    return this.pendientesExtracto.filter((f) => sugerencia.idsDetalleExtracto.includes(f.codigo));
  }

  /**
   * Lineas reales de DetalleAsiento de una sugerencia (con numero de asiento).
   */
  lineasAsientoDeSugerencia(sugerencia: SugerenciaConciliacionContable): DetalleAsientoConciliacion[] {
    return this.pendientesAsiento.filter((f) => sugerencia.idsDetalleAsiento.includes(f.codigo));
  }

  toggleExpandirGrupo(grupo: GrupoConciliacionContable): void {
    if (this.grupoExpandido === grupo.codigo) {
      this.grupoExpandido = null;
      return;
    }
    this.grupoExpandido = grupo.codigo;
    this.isLoadingDetalleGrupo = true;
    this.detalleGrupoExtracto = [];
    this.detalleGrupoAsiento = [];

    // Ver docs/transversal/guia-selectByCriteria.md: busqueda por campo padre (JOIN),
    // no una consulta REST a medida - mismo mecanismo estandar que usan
    // todas las tablas del sistema.
    const criteriosGrupo = (): DatosBusqueda[] => {
      const db = new DatosBusqueda();
      db.asignaValorConCampoPadre(TipoDatos.LONG, 'grupo', 'codigo', grupo.codigo.toString(), TipoComandosBusqueda.IGUAL);
      return [db];
    };

    this.grupoConciliacionExtractoService.selectByCriteria(criteriosGrupo()).subscribe({
      next: (lista) => (this.detalleGrupoExtracto = Array.isArray(lista) ? lista : []),
      error: (error) => {
        this.detalleGrupoExtracto = [];
        this.snackBar.open(
          `Error al obtener detalle de extracto del grupo: ${error?.error || error?.message || error}`,
          'Cerrar',
          { duration: 6000 }
        );
      },
    });
    this.grupoConciliacionAsientoService.selectByCriteria(criteriosGrupo()).subscribe({
      next: (lista) => {
        this.detalleGrupoAsiento = Array.isArray(lista) ? lista : [];
        this.isLoadingDetalleGrupo = false;
      },
      error: (error) => {
        this.detalleGrupoAsiento = [];
        this.isLoadingDetalleGrupo = false;
        this.snackBar.open(
          `Error al obtener detalle de asiento del grupo: ${error?.error || error?.message || error}`,
          'Cerrar',
          { duration: 6000 }
        );
      },
    });
  }

  deshacerGrupo(grupo: GrupoConciliacionContable): void {
    if (this.periodoActualCerrado) {
      return;
    }
    const usuario = this.usuarioService.getUsuarioLog()?.nombre || '';
    this.conciliacionContableService.deshacer(grupo.codigo, usuario).subscribe({
      next: () => {
        this.snackBar.open('Conciliación deshecha', 'Cerrar', { duration: 4000 });
        if (this.grupoExpandido === grupo.codigo) {
          this.grupoExpandido = null;
        }
        this.cargarDatos();
      },
      error: (error) => {
        this.snackBar.open(`Error al deshacer: ${error?.error || error?.message || error}`, 'Cerrar', {
          duration: 6000,
        });
      },
    });
  }

  verificarCuenta(): void {
    if (!this.cabecera || this.periodoActualCerrado) {
      return;
    }
    const usuario = this.usuarioService.getUsuarioLog()?.nombre || '';
    this.conciliacionContableService.verificar(this.cabecera.codigo, usuario).subscribe({
      next: () => {
        this.snackBar.open('Cuenta/período verificado', 'Cerrar', { duration: 4000 });
        this.cargarDatos();
      },
      error: (error) => {
        this.snackBar.open(`Error al verificar: ${error?.error || error?.message || error}`, 'Cerrar', {
          duration: 6000,
        });
      },
    });
  }

  formatearSoloFecha(fecha: any): string {
    return this.funcionesDatosService.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA);
  }
}
