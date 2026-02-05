import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Asiento, CrearAsiento, EstadoAsiento } from '../model/asiento';
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
  getAll(): Observable<Asiento[] | null> {
    const wsGetById = '/getAll';
    const url = `${this.baseUrl}/${wsGetById}`;
    return this.http.get<Asiento[]>(url).pipe(catchError(this.handleError));
  }

  /**
   * Obtener asiento por ID
   */
  getById(id: number): Observable<Asiento> {
    const wsGetById = '/getId/';
        const url = `${ServiciosCnt.RS_ASNT}${wsGetById}${id}`;
        return this.http.get<Asiento>(url).pipe(
          catchError(this.handleError)
        );
  }

  /**
   * Obtener asiento por ID
   */
  generaReversion(idAsiento: number): Observable<Asiento> {
    const wsGetById = '/generaReversion';
    const url = `${this.baseUrl}${wsGetById}/${idAsiento}`;
    return this.http
      .get<Asiento>(url)
      .pipe(catchError(this.handleError));
  }


  selectByCriteria(datos: any): Observable<Asiento[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_ASNT}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
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
   * IMPORTANTE: El backend espera PUT /asnt con el código en el body, no en la URL
   */
  actualizarAsiento(id: number, datosAsiento: any): Observable<Asiento> {
    // Asegurar que el código esté en el body
    const asientoConCodigo = {
      ...datosAsiento,
      codigo: id,
    };

    return this.http
      .put<Asiento>(this.baseUrl, asientoConCodigo, this.httpOptions)
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
