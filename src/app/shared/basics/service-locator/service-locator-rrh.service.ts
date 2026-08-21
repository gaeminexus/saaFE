import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { EntidadesRrh } from '../../../modules/rrh/model/entidades-rrh';
import { criteriosPorEmpresa } from '../../../modules/rrh/forms/parametrizacion/utiles-parametrizacion';
import { CausalTerminacionService } from '../../../modules/rrh/service/causal-terminacion.service';
import { ConceptoNominaService } from '../../../modules/rrh/service/concepto-nomina.service';
import { DetalleFormatoMarcacionService } from '../../../modules/rrh/service/detalle-formato-marcacion.service';
import { DetalleFormatoBancarioService } from '../../../modules/rrh/service/detalle-formato-bancario.service';
import { FormatoArchivoBancarioService } from '../../../modules/rrh/service/formato-archivo-bancario.service';
import { FormatoMarcacionService } from '../../../modules/rrh/service/formato-marcacion.service';
import { TablaImpuestoRentaService } from '../../../modules/rrh/service/tabla-impuesto-renta.service';
import { TopeGastoPersonalService } from '../../../modules/rrh/service/tope-gasto-personal.service';
import { CargaFamiliarService } from '../../../modules/rrh/service/carga-familiar.service';
import { EmpleadoService } from '../../../modules/rrh/service/empleado.service';
import { ConceptoFijoEmpleadoService } from '../../../modules/rrh/service/concepto-fijo-empleado.service';
import { ContratoEmpleadoService } from '../../../modules/rrh/service/contrato-empleado.service';
import { CuentaBancariaEmpleadoService } from '../../../modules/rrh/service/cuenta-bancaria-empleado.service';
import { GastoPersonalProyectadoService } from '../../../modules/rrh/service/gasto-personal-proyectado.service';
import { HistorialService } from '../../../modules/rrh/service/historial.service';
import { DescuentoRecurrenteService } from '../../../modules/rrh/service/descuento-recurrente.service';
import { CuotaDescuentoService } from '../../../modules/rrh/service/cuota-descuento.service';
import { PeriodoNominaService } from '../../../modules/rrh/service/periodo-nomina.service';
import { NovedadNominaService } from '../../../modules/rrh/service/novedad-nomina.service';
import { HoraExtraService } from '../../../modules/rrh/service/hora-extra.service';
import { MarcacionesService } from '../../../modules/rrh/service/marcaciones.service';
import { NovedadIessService } from '../../../modules/rrh/service/novedad-iess.service';
import { CargoService } from '../../../modules/rrh/service/cargo.service';
import { DepartamentoService } from '../../../modules/rrh/service/departamento.service';
import { DepartementoCargoService } from '../../../modules/rrh/service/departemento-cargo.service';
import { TipoContratoEmpleadoService } from '../../../modules/rrh/service/tipo-contrato-empleado.service';
import { TurnoService } from '../../../modules/rrh/service/turno.service';
import { DatosBusqueda } from '../../model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../model/datos-busqueda/tipo-datos-busqueda';
import { AccionesGrid } from '../constantes';

/**
 * Despachador de `table-basic-hijos` para las entidades de Recursos Humanos.
 *
 * `recargarValores(entidad)` no recibe contexto, así que las pantallas acotadas por año o por
 * un maestro dejan aquí el filtro vigente antes de montar la tabla. Sin eso, tras un alta la
 * tabla se recargaría con todos los años o con los detalles de todos los formatos.
 */
@Injectable({
  providedIn: 'root',
})
export class ServiceLocatorRrhService {
  /** Formato de marcación cuyo detalle se está editando. */
  filtroFormatoMarcacion: number | null = null;

  /** Formato del archivo bancario cuyo detalle se está editando. */
  filtroFormatoBancario: number | null = null;

  /** Colaborador cuya ficha se está editando; acota todas las tablas hijas de RHH.MPLD. */
  filtroEmpleado: number | null = null;

  /** Descuento recurrente cuyas cuotas se están consultando. */
  filtroDescuento: number | null = null;

  /** Período de nómina vigente; acota novedades y horas extra. */
  filtroPeriodo: number | null = null;

  /** Rango de fechas vigente en las pantallas de asistencia. */
  filtroDesde: string | null = null;
  filtroHasta: string | null = null;

  constructor(
    private conceptoNominaService: ConceptoNominaService,
    private tablaImpuestoRentaService: TablaImpuestoRentaService,
    private topeGastoPersonalService: TopeGastoPersonalService,
    private causalTerminacionService: CausalTerminacionService,
    private formatoMarcacionService: FormatoMarcacionService,
    private detalleFormatoMarcacionService: DetalleFormatoMarcacionService,
    private formatoArchivoBancarioService: FormatoArchivoBancarioService,
    private detalleFormatoBancarioService: DetalleFormatoBancarioService,
    private cargoService: CargoService,
    private departamentoService: DepartamentoService,
    private departamentoCargoService: DepartementoCargoService,
    private tipoContratoEmpleadoService: TipoContratoEmpleadoService,
    private turnoService: TurnoService,
    private empleadoService: EmpleadoService,
    private cargaFamiliarService: CargaFamiliarService,
    private cuentaBancariaService: CuentaBancariaEmpleadoService,
    private gastoPersonalService: GastoPersonalProyectadoService,
    private conceptoFijoService: ConceptoFijoEmpleadoService,
    private novedadIessService: NovedadIessService,
    private contratoEmpleadoService: ContratoEmpleadoService,
    private historialService: HistorialService,
    private descuentoRecurrenteService: DescuentoRecurrenteService,
    private cuotaDescuentoService: CuotaDescuentoService,
    private periodoNominaService: PeriodoNominaService,
    private novedadNominaService: NovedadNominaService,
    private horaExtraService: HoraExtraService,
    private marcacionesService: MarcacionesService,
  ) {}

  /** Entidades de RRHH que este locator atiende. */
  static readonly ENTIDADES = [
    EntidadesRrh.CONCEPTO_NOMINA,
    EntidadesRrh.TABLA_IMPUESTO_RENTA,
    EntidadesRrh.TOPE_GASTO_PERSONAL,
    EntidadesRrh.CAUSAL_TERMINACION,
    EntidadesRrh.FORMATO_MARCACION,
    EntidadesRrh.DETALLE_FORMATO_MARCACION,
    EntidadesRrh.FORMATO_ARCHIVO_BANCARIO,
    EntidadesRrh.DETALLE_FORMATO_BANCARIO,
    EntidadesRrh.CARGO,
    EntidadesRrh.DEPARTAMENTO,
    EntidadesRrh.DEPARTAMENTO_CARGO,
    EntidadesRrh.TIPO_CONTRATO_EMPLEADO,
    EntidadesRrh.TURNO,
    EntidadesRrh.EMPLEADO,
    EntidadesRrh.CARGA_FAMILIAR,
    EntidadesRrh.CUENTA_BANCARIA_EMPLEADO,
    EntidadesRrh.GASTO_PERSONAL_PROYECTADO,
    EntidadesRrh.CONCEPTO_FIJO_EMPLEADO,
    EntidadesRrh.NOVEDAD_IESS,
    EntidadesRrh.CONTRATO_EMPLEADO,
    EntidadesRrh.HISTORIAL_CARGO,
    EntidadesRrh.DESCUENTO_RECURRENTE,
    EntidadesRrh.CUOTA_DESCUENTO,
    EntidadesRrh.PERIODO_NOMINA,
    EntidadesRrh.NOVEDAD_NOMINA,
    EntidadesRrh.HORA_EXTRA,
    EntidadesRrh.MARCACION,
  ];

  ejecutaServicio(entidad: number, value: any, proceso: number): Promise<any> {
    const servicio = this.servicioDe(entidad);
    if (!servicio) return Promise.resolve(undefined);

    switch (proceso) {
      case AccionesGrid.ADD:
        return firstValueFrom(servicio.add(value));
      case AccionesGrid.EDIT:
        return firstValueFrom(servicio.update(value));
      case AccionesGrid.REMOVE:
        return firstValueFrom(servicio.delete(value));
      default:
        return Promise.resolve(undefined);
    }
  }

  recargarValores(entidad: number): Promise<any> {
    switch (entidad) {
      case EntidadesRrh.CONCEPTO_NOMINA:
        return firstValueFrom(
          this.conceptoNominaService.selectByCriteria(criteriosPorEmpresa('orden')),
        );

      case EntidadesRrh.TABLA_IMPUESTO_RENTA:
        return firstValueFrom(
          this.tablaImpuestoRentaService.selectByCriteria(criteriosPorEmpresa('orden')),
        );

      case EntidadesRrh.TOPE_GASTO_PERSONAL:
        return firstValueFrom(
          this.topeGastoPersonalService.selectByCriteria(criteriosPorEmpresa('numeroCargas')),
        );

      case EntidadesRrh.CAUSAL_TERMINACION:
        return firstValueFrom(
          this.causalTerminacionService.selectByCriteria(criteriosPorEmpresa('nombre')),
        );

      case EntidadesRrh.FORMATO_MARCACION:
        return firstValueFrom(
          this.formatoMarcacionService.selectByCriteria(criteriosPorEmpresa('nombre')),
        );

      case EntidadesRrh.DETALLE_FORMATO_MARCACION:
        return firstValueFrom(
          this.detalleFormatoMarcacionService.selectByCriteria(this.criteriosDelFormato()),
        );

      case EntidadesRrh.FORMATO_ARCHIVO_BANCARIO:
        return firstValueFrom(
          this.formatoArchivoBancarioService.selectByCriteria(criteriosPorEmpresa('nombre')),
        );

      case EntidadesRrh.DETALLE_FORMATO_BANCARIO:
        return firstValueFrom(
          this.detalleFormatoBancarioService.selectByCriteria(this.criteriosDelFormatoBancario()),
        );

      case EntidadesRrh.CARGO:
        return firstValueFrom(this.cargoService.selectByCriteria(this.criteriosSimples('nombre')));

      case EntidadesRrh.DEPARTAMENTO:
        return firstValueFrom(
          this.departamentoService.selectByCriteria(this.criteriosSimples('nombre')),
        );

      case EntidadesRrh.DEPARTAMENTO_CARGO:
        return firstValueFrom(
          this.departamentoCargoService.selectByCriteria(this.criteriosSimples('codigo')),
        );

      case EntidadesRrh.TIPO_CONTRATO_EMPLEADO:
        return firstValueFrom(
          this.tipoContratoEmpleadoService.selectByCriteria(criteriosPorEmpresa('nombre')),
        );

      case EntidadesRrh.TURNO:
        return firstValueFrom(this.turnoService.selectByCriteria(this.criteriosSimples('nombre')));

      case EntidadesRrh.EMPLEADO:
        return firstValueFrom(
          this.empleadoService.selectByCriteria(criteriosPorEmpresa('apellidos')),
        );

      // Tablas hijas de la ficha del colaborador: todas acotadas por RHH.MPLD
      case EntidadesRrh.CARGA_FAMILIAR:
        return firstValueFrom(
          this.cargaFamiliarService.selectByCriteria(this.criteriosDelEmpleado('apellidos')),
        );

      case EntidadesRrh.CUENTA_BANCARIA_EMPLEADO:
        return firstValueFrom(
          this.cuentaBancariaService.selectByCriteria(this.criteriosDelEmpleado('numeroCuenta')),
        );

      case EntidadesRrh.GASTO_PERSONAL_PROYECTADO:
        return firstValueFrom(
          this.gastoPersonalService.selectByCriteria(this.criteriosDelEmpleado('anio')),
        );

      case EntidadesRrh.CONCEPTO_FIJO_EMPLEADO:
        return firstValueFrom(
          this.conceptoFijoService.selectByCriteria(this.criteriosDelEmpleado('fechaInicio')),
        );

      case EntidadesRrh.NOVEDAD_IESS:
        return firstValueFrom(
          this.novedadIessService.selectByCriteria(this.criteriosDelEmpleado('fechaHecho')),
        );

      case EntidadesRrh.CONTRATO_EMPLEADO:
        return firstValueFrom(
          this.contratoEmpleadoService.selectByCriteria(this.criteriosDelEmpleado('fechaInicio')),
        );

      case EntidadesRrh.HISTORIAL_CARGO:
        return firstValueFrom(
          this.historialService.selectByCriteria(this.criteriosDelEmpleado('fechaInicio')),
        );

      case EntidadesRrh.DESCUENTO_RECURRENTE:
        return firstValueFrom(
          this.descuentoRecurrenteService.selectByCriteria(this.criteriosDelEmpleado('fechaInicio')),
        );

      case EntidadesRrh.CUOTA_DESCUENTO:
        return firstValueFrom(
          this.cuotaDescuentoService.selectByCriteria(this.criteriosDelDescuento()),
        );

      case EntidadesRrh.PERIODO_NOMINA:
        return firstValueFrom(
          this.periodoNominaService.selectByCriteria(criteriosPorEmpresa('mes')),
        );

      case EntidadesRrh.NOVEDAD_NOMINA:
        return firstValueFrom(
          this.novedadNominaService.selectByCriteria(this.criteriosDelPeriodo('codigo')),
        );

      case EntidadesRrh.HORA_EXTRA:
        return firstValueFrom(
          this.horaExtraService.selectByCriteria(this.criteriosDelPeriodo('fecha')),
        );

      case EntidadesRrh.MARCACION:
        return firstValueFrom(
          this.marcacionesService.selectByCriteria(this.criteriosDelRango('fechaHora')),
        );

      default:
        return Promise.resolve(undefined);
    }
  }

  // ─── helpers privados ──────────────────────────────────────────────────────

  /** Servicios con el juego CRUD homogéneo; las diferencias de carga van en recargarValores. */
  private servicioDe(entidad: number): any {
    const mapa: Record<number, any> = {
      [EntidadesRrh.CONCEPTO_NOMINA]: this.conceptoNominaService,
      [EntidadesRrh.TABLA_IMPUESTO_RENTA]: this.tablaImpuestoRentaService,
      [EntidadesRrh.TOPE_GASTO_PERSONAL]: this.topeGastoPersonalService,
      [EntidadesRrh.CAUSAL_TERMINACION]: this.causalTerminacionService,
      [EntidadesRrh.FORMATO_MARCACION]: this.formatoMarcacionService,
      [EntidadesRrh.DETALLE_FORMATO_MARCACION]: this.detalleFormatoMarcacionService,
      [EntidadesRrh.FORMATO_ARCHIVO_BANCARIO]: this.formatoArchivoBancarioService,
      [EntidadesRrh.DETALLE_FORMATO_BANCARIO]: this.detalleFormatoBancarioService,
      [EntidadesRrh.CARGO]: this.cargoService,
      [EntidadesRrh.DEPARTAMENTO]: this.departamentoService,
      [EntidadesRrh.DEPARTAMENTO_CARGO]: this.departamentoCargoService,
      [EntidadesRrh.TIPO_CONTRATO_EMPLEADO]: this.tipoContratoEmpleadoService,
      [EntidadesRrh.TURNO]: this.turnoService,
      [EntidadesRrh.EMPLEADO]: this.empleadoService,
      [EntidadesRrh.CARGA_FAMILIAR]: this.cargaFamiliarService,
      [EntidadesRrh.CUENTA_BANCARIA_EMPLEADO]: this.cuentaBancariaService,
      [EntidadesRrh.GASTO_PERSONAL_PROYECTADO]: this.gastoPersonalService,
      [EntidadesRrh.CONCEPTO_FIJO_EMPLEADO]: this.conceptoFijoService,
      [EntidadesRrh.NOVEDAD_IESS]: this.novedadIessService,
      [EntidadesRrh.CONTRATO_EMPLEADO]: this.contratoEmpleadoService,
      [EntidadesRrh.HISTORIAL_CARGO]: this.historialService,
      [EntidadesRrh.DESCUENTO_RECURRENTE]: this.descuentoRecurrenteService,
      [EntidadesRrh.CUOTA_DESCUENTO]: this.cuotaDescuentoService,
      [EntidadesRrh.PERIODO_NOMINA]: this.periodoNominaService,
      [EntidadesRrh.NOVEDAD_NOMINA]: this.novedadNominaService,
      [EntidadesRrh.HORA_EXTRA]: this.horaExtraService,
      [EntidadesRrh.MARCACION]: this.marcacionesService,
    };
    return mapa[entidad];
  }

  /** Todas las tablas hijas de la ficha cuelgan de `empleado.codigo`. */
  private criteriosDelEmpleado(campoOrden: string): DatosBusqueda[] {
    const orden = new DatosBusqueda();
    orden.orderBy(campoOrden);

    if (this.filtroEmpleado === null) return [orden];

    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empleado',
      'codigo',
      this.filtroEmpleado.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    return [db, orden];
  }

  /**
   * `CRGO`, `DPRT`, `DPTC` y `TRNO` no tienen columna `PJRQCDGO` —el script 05 solo la añade a
   * `MPLD`, `PRDN`, `TPCE` y `CTLG`—, así que no hay por dónde filtrarlas por empresa: se
   * ordenan y nada más.
   */
  private criteriosSimples(campoOrden: string): DatosBusqueda[] {
    const orden = new DatosBusqueda();
    orden.orderBy(campoOrden);
    return [orden];
  }

  /** Las pantallas de asistencia se acotan por colaborador y rango de fechas. */
  /**
   * `MRCCFCHR` es un `LocalDateTime`, no un `LocalDate`: hay que enviar `DATE_TIME`, porque con
   * `DATE` el DAO enlaza un `LocalDate` y la consulta revienta por tipo de argumento. El rango de
   * la pantalla llega como `yyyy-MM-dd`, así que se completa con la hora que espera el formateador
   * del backend (`yyyy-MM-dd HH:mm`) abriendo y cerrando el día.
   */
  private criteriosDelRango(campoFecha: string): DatosBusqueda[] {
    const criterios = this.criteriosDelEmpleado(campoFecha);

    if (this.filtroDesde) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.DATE_TIME,
        campoFecha,
        `${this.filtroDesde} 00:00`,
        TipoComandosBusqueda.MAYOR_IGUAL,
      );
      criterios.unshift(db);
    }
    if (this.filtroHasta) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.DATE_TIME,
        campoFecha,
        `${this.filtroHasta} 23:59`,
        TipoComandosBusqueda.MENOR_IGUAL,
      );
      criterios.unshift(db);
    }

    return criterios;
  }

  /** Novedades y horas extra cuelgan del período de nómina. */
  private criteriosDelPeriodo(campoOrden: string): DatosBusqueda[] {
    const orden = new DatosBusqueda();
    orden.orderBy(campoOrden);
    if (this.filtroPeriodo === null) return [orden];

    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'periodoNomina',
      'codigo',
      this.filtroPeriodo.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    return [db, orden];
  }

  private criteriosDelDescuento(): DatosBusqueda[] {
    const orden = new DatosBusqueda();
    orden.orderBy('numeroCuota');
    if (this.filtroDescuento === null) return [orden];

    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'descuentoRecurrente',
      'codigo',
      this.filtroDescuento.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    return [db, orden];
  }

  private criteriosDelFormato(): DatosBusqueda[] {
    const orden = new DatosBusqueda();
    orden.orderBy('orden');
    if (this.filtroFormatoMarcacion === null) return [orden];

    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'formato',
      'codigo',
      this.filtroFormatoMarcacion.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    return [db, orden];
  }
  /** Gemelo de criteriosDelFormato para RHH.DFMB. */
  private criteriosDelFormatoBancario(): DatosBusqueda[] {
    const orden = new DatosBusqueda();
    orden.orderBy("orden");
    if (this.filtroFormatoBancario === null) return [orden];

    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      "formato",
      "codigo",
      this.filtroFormatoBancario.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    return [db, orden];
  }
}
