import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Empresa } from '../../../shared/model/empresa';
import { Jerarquia } from '../../../shared/model/jerarquia';
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

  // Jerarquía mock
  private mockJerarquia: Jerarquia = {
    codigo: 1,
    nombre: 'Matriz',
    nivel: 1,
    codigoPadre: 0,
    descripcion: 'Jerarquía principal',
    ultimoNivel: 1,
    rubroTipoEstructuraP: 1,
    rubroTipoEstructuraH: 1,
    codigoAlterno: 1,
    rubroNivelCaracteristicaP: 1,
    rubroNivelCaracteristicaH: 1,
  };

  // Empresa mock
  private mockEmpresa: Empresa = {
    codigo: 280,
    jerarquia: this.mockJerarquia,
    nombre: 'GAEMI NEXUS',
    nivel: 1,
    codigoPadre: 0,
    ingresado: 1,
  };

  // Datos mock para períodos
  private mockPeriodos: Periodo[] = [
    {
      codigo: 1,
      empresa: this.mockEmpresa,
      mes: 1,
      anio: 2024,
      nombre: 'Enero 2024',
      estado: EstadoPeriodo.MAYORIZADO,
      primerDia: new Date('2024-01-01'),
      ultimoDia: new Date('2024-01-31'),
      idMayorizacion: 1001,
      periodoCierre: 0,
    },
    {
      codigo: 2,
      empresa: this.mockEmpresa,
      mes: 2,
      anio: 2024,
      nombre: 'Febrero 2024',
      estado: EstadoPeriodo.MAYORIZADO,
      primerDia: new Date('2024-02-01'),
      ultimoDia: new Date('2024-02-29'),
      idMayorizacion: 1002,
      periodoCierre: 0,
    },
    {
      codigo: 3,
      empresa: this.mockEmpresa,
      mes: 3,
      anio: 2024,
      nombre: 'Marzo 2024',
      estado: EstadoPeriodo.MAYORIZADO,
      primerDia: new Date('2024-03-01'),
      ultimoDia: new Date('2024-03-31'),
      idMayorizacion: 1003,
      periodoCierre: 0,
    },
    {
      codigo: 4,
      empresa: this.mockEmpresa,
      mes: 4,
      anio: 2024,
      nombre: 'Abril 2024',
      estado: EstadoPeriodo.ABIERTO,
      primerDia: new Date('2024-04-01'),
      ultimoDia: new Date('2024-04-30'),
      periodoCierre: 0,
    },
    {
      codigo: 5,
      empresa: this.mockEmpresa,
      mes: 5,
      anio: 2024,
      nombre: 'Mayo 2024',
      estado: EstadoPeriodo.ABIERTO,
      primerDia: new Date('2024-05-01'),
      ultimoDia: new Date('2024-05-31'),
      periodoCierre: 0,
    },
  ];

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
      catchError(() => {
        console.log(
          `[PeriodoService] Usando datos mock para períodos de empresa ${this.EMPRESA_CODIGO}`
        );
        const filtrados = this.mockPeriodos.filter(
          (p) => p?.empresa?.codigo === this.EMPRESA_CODIGO
        );
        return of(filtrados);
      })
    );
  }

  verificaPeriodoAbierto(idEmpresa: number, fecha: Date): Observable<Periodo | null> {
    const wsGetById = '/verificaPeriodoAbierto/';
    const url = `${ServiciosCnt.RS_NTRL}${wsGetById}${idEmpresa}/${fecha.toISOString()}`;
    return this.http.get<Periodo>(url).pipe(catchError(this.handleError));
  }

  /**
   * Obtiene un período por ID
   */
  getById(codigo: number): Observable<Periodo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_PRDO}${wsGetById}${codigo}`;

    return this.http.get<Periodo>(url).pipe(
      catchError(() => {
        console.log('[PeriodoService] Usando datos mock para período');
        const item = this.mockPeriodos.find((p) => p.codigo === codigo);
        return of(item || null);
      })
    );
  }

  /**
   * Obtiene períodos por año
   */
  getByAnio(anio: number): Observable<Periodo[]> {
    const wsGetByAnio = '/getByAnio/';
    const url = `${ServiciosCnt.RS_PRDO}${wsGetByAnio}${anio}`;

    return this.http.get<Periodo[]>(url).pipe(
      catchError(() => {
        console.log('[PeriodoService] Usando filtro por año en datos mock');
        const periodosAnio = this.mockPeriodos.filter((p) => p.anio === anio);
        return of(periodosAnio);
      })
    );
  }

  /**
   * Obtiene el período actual (activo)
   */
  getPeriodoActual(): Observable<Periodo | null> {
    const wsGetActual = '/getActual';
    const url = `${ServiciosCnt.RS_PRDO}${wsGetActual}`;

    return this.http.get<Periodo>(url).pipe(
      catchError(() => {
        console.log('[PeriodoService] Usando período actual mock');
        // Devuelve el primer período abierto
        const periodoActual = this.mockPeriodos.find((p) => p.estado === EstadoPeriodo.ABIERTO);
        return of(periodoActual || null);
      })
    );
  }

  /**
   * Busca períodos por criterios
   */
  selectByCriteria(filtros: FiltrosPeriodo): Observable<Periodo[]> {
    const wsSelectByCriteria = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_PRDO}${wsSelectByCriteria}`;

    return this.http.post<Periodo[]>(url, filtros, this.httpOptions).pipe(
      catchError(() => {
        console.log('[PeriodoService] Usando filtros mock');
        let filtered = [...this.mockPeriodos];

        if (filtros.anio) {
          filtered = filtered.filter((p) => p.anio === filtros.anio);
        }

        if (filtros.mes) {
          filtered = filtered.filter((p) => p.mes === filtros.mes);
        }

        if (filtros.estado !== undefined) {
          filtered = filtered.filter((p) => p.estado === filtros.estado);
        }

        if (filtros.nombre) {
          filtered = filtered.filter((p) =>
            p.nombre.toLowerCase().includes(filtros.nombre!.toLowerCase())
          );
        }

        return of(filtered);
      })
    );
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

    return this.http.post<Periodo>(ServiciosCnt.RS_PRDO, periodoBackend, this.httpOptions).pipe(
      catchError(() => {
        // Simular creación en mock
        const nuevoCodigo = Math.max(...this.mockPeriodos.map((p) => p.codigo)) + 1;

        const nuevoPeriodo: Periodo = {
          codigo: nuevoCodigo,
          empresa: {
            codigo: this.EMPRESA_CODIGO,
            jerarquia: this.mockJerarquia,
            nombre: 'GAEMI NEXUS',
            nivel: 1,
            codigoPadre: 0,
            ingresado: 1,
          },
          mes: datosPeriodo.mes,
          anio: datosPeriodo.anio,
          nombre: periodoBackend.nombre,
          estado: EstadoPeriodo.ABIERTO,
          primerDia: periodoBackend.primerDia,
          ultimoDia: periodoBackend.ultimoDia,
          periodoCierre: 0,
        };

        this.mockPeriodos.push(nuevoPeriodo);
        console.log('✅ Período creado (mock):', nuevoPeriodo);
        return of(nuevoPeriodo);
      })
    );
  }

  /**
   * Mayoriza un período
   */
  mayorizar(codigoPeriodo: number): Observable<boolean> {
    const wsMayorizar = '/mayorizar/';
    const url = `${ServiciosCnt.RS_PRDO}${wsMayorizar}${codigoPeriodo}`;

    return this.http.post<boolean>(url, {}, this.httpOptions).pipe(
      catchError(() => {
        // Simular mayorización en mock
        const periodo = this.mockPeriodos.find((p) => p.codigo === codigoPeriodo);
        if (periodo && periodo.estado === EstadoPeriodo.ABIERTO) {
          periodo.estado = EstadoPeriodo.MAYORIZADO;
          periodo.idMayorizacion = Date.now(); // ID temporal
          return of(true);
        }
        return of(false);
      })
    );
  }

  /**
   * Desmayoriza un período
   */
  desmayorizar(codigoPeriodo: number): Observable<boolean> {
    const wsDesmayorizar = '/desmayorizar/';
    const url = `${ServiciosCnt.RS_PRDO}${wsDesmayorizar}${codigoPeriodo}`;

    return this.http.post<boolean>(url, {}, this.httpOptions).pipe(
      catchError(() => {
        // Simular desmayorización en mock
        const periodo = this.mockPeriodos.find((p) => p.codigo === codigoPeriodo);
        if (periodo && periodo.estado === EstadoPeriodo.MAYORIZADO) {
          periodo.estado = EstadoPeriodo.DESMAYORIZADO;
          periodo.idDesmayorizacion = Date.now(); // ID temporal
          return of(true);
        }
        return of(false);
      })
    );
  }

  /**
   * Elimina un período (solo si está abierto y sin movimientos)
   */
  delete(codigo: number): Observable<string | null> {
    const wsDelete = '/' + codigo;
    const url = `${ServiciosCnt.RS_PRDO}${wsDelete}`;
    return this.http.delete<string>(url, this.httpOptions).pipe(
          catchError(this.handleError)
        );
  }

  /**
   * Obtiene años disponibles
   */
  getAniosDisponibles(): Observable<number[]> {
    const wsGetAnios = '/getAnios';
    const url = `${ServiciosCnt.RS_PRDO}${wsGetAnios}`;

    return this.http.get<number[]>(url).pipe(
      catchError(() => {
        // Obtener años únicos de los períodos mock
        const anios = [...new Set(this.mockPeriodos.map((p) => p.anio))].sort((a, b) => b - a);
        return of(anios);
      })
    );
  }

  /**
   * Valida si se puede crear un período
   */
  validarCreacionPeriodo(
    mes: number,
    anio: number
  ): Observable<{ valido: boolean; mensaje?: string }> {
    // Verificar si ya existe el período
    const existe = this.mockPeriodos.some((p) => p.mes === mes && p.anio === anio);

    if (existe) {
      return of({
        valido: false,
        mensaje: `Ya existe un período para ${this.getNombreMes(mes)} ${anio}`,
      });
    }

    // Verificar que el mes sea válido
    if (mes < 1 || mes > 12) {
      return of({
        valido: false,
        mensaje: 'El mes debe estar entre 1 y 12',
      });
    }

    // Verificar que el año sea razonable
    const anioActual = new Date().getFullYear();
    if (anio < 2020 || anio > anioActual + 5) {
      return of({
        valido: false,
        mensaje: `El año debe estar entre 2020 y ${anioActual + 5}`,
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
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
