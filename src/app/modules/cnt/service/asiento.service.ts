import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Asiento, CrearAsiento, EstadoAsiento, FiltrosAsiento } from '../model/asiento';
import { ServiciosCnt } from '../service/ws-cnt';

@Injectable({
  providedIn: 'root',
})
export class AsientoService {
  private baseUrl = ServiciosCnt.RS_ASNT;
  private httpOptions = { headers: { 'Content-Type': 'application/json' } };

  /**
   * IMPORTANTE: Backend requiere POST para búsquedas
   * - GET /asnt → 405 Method Not Allowed
   * - GET /asnt/criteria?params → 405 Method Not Allowed
   * - POST /asnt/criteria (body) → ✅ Correcto
   *
   * Este patrón se usa en otros servicios:
   * @see PeriodoService.selectByCriteria()
   * @see PlanCuentaService.selectByCriteria()
   * @see DetalleMayorAnaliticoService.selectByCriteria()
   */

  constructor(private http: HttpClient) {}

  /**
   * Obtener todos los asientos - usa POST ya que GET retorna 405
   */
  getAll(): Observable<Asiento[]> {
    // Usar selectByCriteria vacío para obtener todos
    return this.selectByCriteria({}).pipe(
      catchError((err) => {
        console.warn('[AsientoService] getAll falló, retornando array vacío:', err);
        return of([]);
      })
    );
  }

  /**
   * Obtener asiento por ID
   */
  getById(id: number): Observable<Asiento> {
    return this.http
      .get<Asiento>(`${this.baseUrl}/${id}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Buscar asientos por criterios - IMPORTANTE: usa POST, no GET
   * Backend requiere POST incluso para búsquedas
   */
  selectByCriteria(filtros: FiltrosAsiento): Observable<Asiento[]> {
    const wsEndpoint = '/criteria';
    const url = `${this.baseUrl}${wsEndpoint}`;

    // Construir objeto de criterios para enviar en el body
    const criteriosBody: any = {};

    if (filtros.fechaDesde) {
      criteriosBody.fechaDesde =
        filtros.fechaDesde instanceof Date
          ? filtros.fechaDesde.toISOString().split('T')[0]
          : filtros.fechaDesde;
    }

    if (filtros.fechaHasta) {
      criteriosBody.fechaHasta =
        filtros.fechaHasta instanceof Date
          ? filtros.fechaHasta.toISOString().split('T')[0]
          : filtros.fechaHasta;
    }

    if (filtros.tipoAsiento) {
      criteriosBody.tipoAsiento = filtros.tipoAsiento;
    }

    if (filtros.estado !== undefined && filtros.estado !== null) {
      criteriosBody.estado = filtros.estado;
    }

    if (filtros.numero) {
      criteriosBody.numero = filtros.numero;
    }

    if (filtros.observaciones) {
      criteriosBody.observaciones = filtros.observaciones;
    }

    if (filtros.periodo) {
      criteriosBody.periodo = filtros.periodo;
    }

    // POST con el body de criterios
    return this.http.post<Asiento[]>(url, criteriosBody, this.httpOptions).pipe(
      catchError((err: HttpErrorResponse) => {
        console.error('[AsientoService] Error en selectByCriteria:', err);
        // Si también falla POST, retornar array vacío en desarrollo
        return of([]);
      })
    );
  }

  /**
   * Crear nuevo asiento
   */
  crearAsiento(datosAsiento: CrearAsiento): Observable<Asiento> {
    return this.http
      .post<Asiento>(this.baseUrl, datosAsiento, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Actualizar asiento existente
   */
  actualizarAsiento(id: number, datosAsiento: CrearAsiento): Observable<Asiento> {
    return this.http
      .put<Asiento>(`${this.baseUrl}/${id}`, datosAsiento, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Eliminar asiento
   */
  eliminarAsiento(id: number): Observable<boolean> {
    return this.http
      .delete<boolean>(`${this.baseUrl}/${id}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Anular asiento
   */
  anularAsiento(id: number, razonAnulacion: string): Observable<boolean> {
    const body = { razonAnulacion };
    return this.http
      .put<boolean>(`${this.baseUrl}/${id}/anular`, body, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Reversar asiento
   */
  reversarAsiento(id: number, razonReverso: string): Observable<boolean> {
    const body = { razonReverso };
    return this.http
      .put<boolean>(`${this.baseUrl}/${id}/reversar`, body, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtener siguiente número de asiento
   */
  getSiguienteNumero(): Observable<number> {
    return this.http
      .get<number>(`${this.baseUrl}/siguiente-numero`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Manejo de errores
   */
  private handleError(error: HttpErrorResponse): Observable<any> {
    console.error('[AsientoService] Error HTTP:', error);
    if (error.status === 200) {
      return of(null);
    }
    return throwError(() => error);
  }

  /**
   * Validar que el asiento esté balanceado
   */
  validarBalance(detalles: any[]): boolean {
    const totalDebe = detalles.reduce((sum, d) => sum + (d.valorDebe || 0), 0);
    const totalHaber = detalles.reduce((sum, d) => sum + (d.valorHaber || 0), 0);
    return Math.abs(totalDebe - totalHaber) < 0.01; // Permitir diferencias mínimas por redondeo
  }

  /**
   * Obtener texto del estado
   */
  getEstadoTexto(estado: EstadoAsiento): string {
    switch (estado) {
      case EstadoAsiento.ACTIVO:
        return 'Activo';
      case EstadoAsiento.ANULADO:
        return 'Anulado';
      case EstadoAsiento.REVERSADO:
        return 'Reversado';
      case EstadoAsiento.INCOMPLETO:
        return 'Incompleto';
      default:
        return 'Desconocido';
    }
  }

  /**
   * Obtener clase CSS para badge de estado
   */
  getEstadoBadgeClass(estado: EstadoAsiento): string {
    switch (estado) {
      case EstadoAsiento.ACTIVO:
        return 'badge-activo';
      case EstadoAsiento.ANULADO:
        return 'badge-anulado';
      case EstadoAsiento.REVERSADO:
        return 'badge-reversado';
      case EstadoAsiento.INCOMPLETO:
        return 'badge-incompleto';
      default:
        return 'badge-default';
    }
  }

  /**
   * Verificar si se puede editar el asiento
   */
  puedeEditar(asiento: Asiento): boolean {
    return asiento.estado === EstadoAsiento.INCOMPLETO;
  }

  /**
   * Verificar si se puede anular el asiento
   */
  puedeAnular(asiento: Asiento): boolean {
    return asiento.estado === EstadoAsiento.ACTIVO;
  }

  /**
   * Verificar si se puede reversar el asiento
   */
  puedeReversar(asiento: Asiento): boolean {
    return asiento.estado === EstadoAsiento.ACTIVO;
  }

  /**
   * Verificar si se puede eliminar el asiento
   */
  puedeEliminar(asiento: Asiento): boolean {
    return asiento.estado === EstadoAsiento.INCOMPLETO;
  }
}
