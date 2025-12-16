import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CrearPeriodo, EstadoPeriodo, FiltrosPeriodo, Periodo } from '../model/periodo';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root',
})
export class PeriodoService {
  // Obtener empresa desde localStorage
  private get EMPRESA_CODIGO(): number {
    return parseInt(localStorage.getItem('idSucursal') || '280', 10);
  }

  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los períodos
   */
  getAll(): Observable<Periodo[]> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosCnt.RS_PRDO}${wsGetAll}`;
    console.log(
      `🔍 [PeriodoService.getAll] Cargando períodos para empresa ${this.EMPRESA_CODIGO}...`
    );

    return this.http.get<Periodo[]>(url).pipe(
      map((items: Periodo[]) => {
        const filtrados = (items || []).filter((p) => p?.empresa?.codigo === this.EMPRESA_CODIGO);
        console.log(
          `✅ Períodos filtrados para empresa ${this.EMPRESA_CODIGO}: ${filtrados.length}`
        );
        return filtrados;
      }),
      catchError(this.handleErrorWithEmpty<Periodo>())
    );
  }

  verificaPeriodoAbierto(idEmpresa: number, fecha: Date): Observable<Periodo | null> {
    const wsGetById = '/verificaPeriodoAbierto/';
    const url = `${ServiciosCnt.RS_NTRL}${wsGetById}${idEmpresa}/${fecha.toISOString()}`;
    return this.http.get<Periodo>(url).pipe(catchError(this.handleErrorWithNull));
  }

  /**
   * Obtiene un período por ID
   */
  getById(codigo: number): Observable<Periodo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_PRDO}${wsGetById}${codigo}`;

    return this.http.get<Periodo>(url).pipe(catchError(this.handleErrorWithNull));
  }

  /**
   * Obtiene períodos por año
   */
  getByAnio(anio: number): Observable<Periodo[]> {
    const wsGetByAnio = '/getByAnio/';
    const url = `${ServiciosCnt.RS_PRDO}${wsGetByAnio}${anio}`;

    return this.http.get<Periodo[]>(url).pipe(catchError(this.handleErrorWithEmpty<Periodo>()));
  }

  /**
   * Obtiene el período actual (activo)
   */
  getPeriodoActual(): Observable<Periodo | null> {
    const wsGetActual = '/getActual';
    const url = `${ServiciosCnt.RS_PRDO}${wsGetActual}`;

    return this.http.get<Periodo>(url).pipe(catchError(this.handleErrorWithNull));
  }

  /**
   * Busca períodos por criterios
   */
  selectByCriteria(filtros: FiltrosPeriodo): Observable<Periodo[]> {
    const wsSelectByCriteria = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_PRDO}${wsSelectByCriteria}`;

    return this.http
      .post<Periodo[]>(url, filtros, this.httpOptions)
      .pipe(catchError(this.handleErrorWithEmpty<Periodo>()));
  }

  /**
   * Crea un nuevo período
   */
  crearPeriodo(datosPeriodo: CrearPeriodo): Observable<Periodo | null> {
    // Construir objeto con empresa
    const periodoBackend: any = {
      empresa: {
        codigo: this.EMPRESA_CODIGO,
      },
      mes: datosPeriodo.mes,
      anio: datosPeriodo.anio,
      nombre: datosPeriodo.nombre || `${this.getNombreMes(datosPeriodo.mes)} ${datosPeriodo.anio}`,
      estado: EstadoPeriodo.ABIERTO,
      // Calcular fechas
      primerDia: new Date(datosPeriodo.anio, datosPeriodo.mes - 1, 1),
      ultimoDia: new Date(datosPeriodo.anio, datosPeriodo.mes, 0),
      periodoCierre: 0,
    };

    return this.http
      .post<Periodo>(ServiciosCnt.RS_PRDO, periodoBackend, this.httpOptions)
      .pipe(catchError(this.handleErrorWithNull));
  }

  /**
   * Actualiza un período existente
   * PUT: update record
   */
  update(datosPeriodo: Periodo): Observable<Periodo | null> {
    const periodoBackend: any = {
      codigo: datosPeriodo.codigo,
      empresa: {
        codigo: datosPeriodo.empresa?.codigo || this.EMPRESA_CODIGO,
      },
      mes: datosPeriodo.mes,
      anio: datosPeriodo.anio,
      nombre: datosPeriodo.nombre || `${this.getNombreMes(datosPeriodo.mes)} ${datosPeriodo.anio}`,
      estado: datosPeriodo.estado,
      primerDia: datosPeriodo.primerDia || new Date(datosPeriodo.anio, datosPeriodo.mes - 1, 1),
      ultimoDia: datosPeriodo.ultimoDia || new Date(datosPeriodo.anio, datosPeriodo.mes, 0),
      periodoCierre:
        typeof datosPeriodo.periodoCierre === 'boolean'
          ? datosPeriodo.periodoCierre
            ? 1
            : 0
          : datosPeriodo.periodoCierre || 0,
    };

    return this.http
      .put<Periodo>(ServiciosCnt.RS_PRDO, periodoBackend, this.httpOptions)
      .pipe(catchError(this.handleErrorWithNull));
  }

  /**
   * Mayoriza un período
   */
  mayorizar(codigoPeriodo: number): Observable<boolean> {
    const wsMayorizar = '/mayorizar/';
    const url = `${ServiciosCnt.RS_PRDO}${wsMayorizar}${codigoPeriodo}`;

    return this.http.post<boolean>(url, {}, this.httpOptions).pipe(catchError(() => of(false)));
  }

  /**
   * Desmayoriza un período
   */
  desmayorizar(codigoPeriodo: number): Observable<boolean> {
    const wsDesmayorizar = '/desmayorizar/';
    const url = `${ServiciosCnt.RS_PRDO}${wsDesmayorizar}${codigoPeriodo}`;

    return this.http.post<boolean>(url, {}, this.httpOptions).pipe(catchError(() => of(false)));
  }

  /**
   * Elimina un período (solo si está abierto y sin movimientos)
   * DELETE: delete record
   */
  delete(codigo: number): Observable<string | null> {
    const wsDelete = '/' + codigo;
    const url = `${ServiciosCnt.RS_PRDO}${wsDelete}`;

    return this.http.delete<string>(url, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error eliminando período:', error);
        return throwError(() => error.error || error);
      })
    );
  }

  /**
   * Obtiene años disponibles
   */
  getAniosDisponibles(): Observable<number[]> {
    const wsGetAnios = '/getAnios';
    const url = `${ServiciosCnt.RS_PRDO}${wsGetAnios}`;

    return this.http.get<number[]>(url).pipe(catchError(() => of([])));
  }

  /**
   * Valida si se puede crear un período
   */
  validarCreacionPeriodo(
    mes: number,
    anio: number
  ): Observable<{ valido: boolean; mensaje?: string }> {
    // Verificar que el mes sea válido
    if (mes < 1 || mes > 12) {
      return of({
        valido: false,
        mensaje: 'El mes debe estar entre 1 y 12',
      });
    }

    // Verificar que el año sea razonable
    const anioActual = new Date().getFullYear();
    if (anio < 2000 || anio > 2100) {
      return of({
        valido: false,
        mensaje: 'El año debe estar entre 2000 y 2100',
      });
    }

    return of({ valido: true });
  }

  /**
   * Obtiene el nombre del mes
   */
  getNombreMes(mes: number): string {
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    return meses[mes - 1] || `Mes ${mes}`;
  }

  /**
   * Obtiene el texto del estado del período
   */
  getEstadoTexto(estado: EstadoPeriodo): string {
    switch (estado) {
      case EstadoPeriodo.ABIERTO:
        return 'Abierto';
      case EstadoPeriodo.MAYORIZADO:
        return 'Mayorizado';
      case EstadoPeriodo.DESMAYORIZADO:
        return 'Desmayorizado';
      default:
        return 'Desconocido';
    }
  }

  /**
   * Obtiene la clase CSS para el badge del estado
   */
  getEstadoBadgeClass(estado: EstadoPeriodo): string {
    switch (estado) {
      case EstadoPeriodo.ABIERTO:
        return 'badge-activo';
      case EstadoPeriodo.MAYORIZADO:
        return 'badge-mayorizado';
      case EstadoPeriodo.DESMAYORIZADO:
        return 'badge-desmayorizado';
      default:
        return 'badge-inactivo';
    }
  }

  // tslint:disable-next-line: typedef
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('❌ Error en petición HTTP:', error);
    return throwError(() => error.error || error);
  }

  private handleErrorWithNull(error: HttpErrorResponse): Observable<null> {
    console.error('❌ Error en petición HTTP:', error);
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error || error);
  }

  private handleErrorWithEmpty<T>(): (error: HttpErrorResponse) => Observable<T[]> {
    return (error: HttpErrorResponse) => {
      console.error('❌ Error en petición HTTP, devolviendo array vacío:', error);
      return of([] as T[]);
    };
  }
}
