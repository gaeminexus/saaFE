import { HttpClient, HttpParams, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Prestamo } from '../model/prestamo';
import { ResumenSolicitudes } from '../forms/prestamo/prestamo-dash/solicitudes-resumen/solicitudes-resumen.component';
import { EvaluacionOtorgamiento, SolicitudEvaluacionOtorgamiento, TablaGeneradaConEvaluacion } from '../model/evaluacion-otorgamiento';
import { EstadoAprobacionPrestamo, ResultadoAprobacionPrestamo } from '../model/nivel-aprobacion';
import { PrestamoSustituible, TipoOperacionPrestamo } from '../model/prestamo-sustituible';
import { SaldoPrestamoResumen } from '../model/saldo-prestamo-resumen';
import { ServiciosCrd } from './ws-crd';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';

@Injectable({
  providedIn: 'root',
})
export class PrestamoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Prestamo[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_PRST}${wsGetById}`;
    return this.http.get<Prestamo[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<Prestamo | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_PRST}${wsGetById}${id}`;
    return this.http.get<Prestamo>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<Prestamo | null> {
    return this.http
      .post<Prestamo>(ServiciosCrd.RS_PRST, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<Prestamo | null> {
    return this.http
      .put<Prestamo>(ServiciosCrd.RS_PRST, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<Prestamo[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_PRST}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  /**
   * Devuelve 200 con `[]` cuando la entidad no tiene préstamos — a diferencia de
   * `selectByCriteria`, "sin préstamos" no depende de interpretar un error.
   */
  porEntidad(idEntidad: number): Observable<Prestamo[] | null> {
    const url = `${ServiciosCrd.RS_PRST}/porEntidad/${idEntidad}`;
    return this.http.get<Prestamo[]>(url).pipe(catchError(this.handleError));
  }

  /**
   * Préstamo por su número de operación en ASOPREP (`idAsoprep`). ⚠️ NO es el mismo campo que
   * `Aporte.idAsoprep` (ese dice de qué carga Petro salió el aporte) — mismo nombre, significado
   * distinto.
   *
   * `404` es el resultado normal de una búsqueda por un número que no existe (el operador tipeó
   * mal), no un error — se resuelve a `null`, igual que "no encontrado". Cualquier otro código sí
   * es un error real y se propaga.
   */
  porIdAsoprep(idAsoprep: number): Observable<Prestamo | null> {
    const url = `${ServiciosCrd.RS_PRST}/porIdAsoprep/${idAsoprep}`;
    return this.http.get<Prestamo>(url).pipe(
      catchError((error: HttpErrorResponse) => (error.status === 404 ? of(null) : throwError(() => error)))
    );
  }

  delete(datos: any): Observable<Prestamo | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCrd.RS_PRST}${wsGetById}`;
    return this.http.delete<Prestamo>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  cargarTablaExcel(idPrestamo: number, archivo: File): Observable<Prestamo | null> {
    const formData = new FormData();
    formData.append('fileData', archivo, archivo.name);
    // U-2: el backend exige el usuario de sesión (docs/crd/API-USUARIO-OBLIGATORIO-U2.md §1).
    const url = `${ServiciosCrd.RS_PRST}/cargarTablaExcel/${idPrestamo}?usuario=${encodeURIComponent(usuarioSesion())}`;
    // Sin Content-Type para que el browser lo establezca automáticamente con boundary
    return this.http.post<Prestamo>(url, formData).pipe(catchError(this.handleError));
  }

  generarTablaAmortizacion(
    id: number,
    tieneCuotaCero: boolean = false,
    regenerar: boolean = false,
  ): Observable<Prestamo | null> {
    const cuotaCero = tieneCuotaCero ? 1 : 0;
    const url = `${ServiciosCrd.RS_PRST}/generarTablaAmortizacion/${id}/${cuotaCero}?regenerar=${regenerar}`;

    return this.http.post<Prestamo>(url, null, this.httpOptions).pipe(catchError(this.handleError));
  }

  /** Igual que `generarTablaAmortizacion` pero con `conEvaluacion=true`: responde `{prestamo, evaluacion}`. La evaluación es solo un aviso. */
  generarTablaAmortizacionConEvaluacion(
    id: number,
    tieneCuotaCero: boolean = false,
    regenerar: boolean = false,
  ): Observable<TablaGeneradaConEvaluacion<Prestamo> | null> {
    const cuotaCero = tieneCuotaCero ? 1 : 0;
    const url = `${ServiciosCrd.RS_PRST}/generarTablaAmortizacion/${id}/${cuotaCero}?regenerar=${regenerar}&conEvaluacion=true`;
    return this.http
      .post<TablaGeneradaConEvaluacion<Prestamo>>(url, null, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** `GET prst/evaluarOtorgamiento/{id}`: capacidad de pago y cupo de un préstamo guardado. Solo lectura. */
  evaluarOtorgamiento(id: number): Observable<EvaluacionOtorgamiento | null> {
    return this.http
      .get<EvaluacionOtorgamiento>(`${ServiciosCrd.RS_PRST}/evaluarOtorgamiento/${id}`)
      .pipe(catchError(this.handleError));
  }

  /** `POST prst/evaluarOtorgamiento`: la misma evaluación para un crédito que todavía no existe (simuladores). */
  evaluarOtorgamientoSimulado(solicitud: SolicitudEvaluacionOtorgamiento): Observable<EvaluacionOtorgamiento | null> {
    return this.http
      .post<EvaluacionOtorgamiento>(`${ServiciosCrd.RS_PRST}/evaluarOtorgamiento`, solicitud, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** Contrato: docs/crd/API-CICLO-OTORGAMIENTO.md §3. `idEmpresa` e `idUsuario` (código numérico, no el login) son obligatorios. */
  aprobar(
    id: number,
    usuario: string,
    observacion: string,
    idEmpresa: number,
    idUsuario: number
  ): Observable<Prestamo | null> {
    const url = `${ServiciosCrd.RS_PRST}/aprobar/${id}`;
    return this.http
      .post<Prestamo>(url, { usuario, observacion, idEmpresa, idUsuario }, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** Igual que `aprobar` pero con `conDetalle=true`: con niveles de aprobación la respuesta dice si la aprobación quedó completa. */
  aprobarConDetalle(
    id: number,
    usuario: string,
    observacion: string,
    idEmpresa: number,
    idUsuario: number
  ): Observable<ResultadoAprobacionPrestamo<Prestamo> | null> {
    const url = `${ServiciosCrd.RS_PRST}/aprobar/${id}?conDetalle=true`;
    return this.http
      .post<ResultadoAprobacionPrestamo<Prestamo>>(url, { usuario, observacion, idEmpresa, idUsuario }, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** `GET prst/estadoAprobacion/{id}?idUsuario=`: niveles, quién aprobó, nivel pendiente y si este usuario puede aprobarlo. */
  estadoAprobacion(id: number, idUsuario: number | null): Observable<EstadoAprobacionPrestamo | null> {
    const consulta = idUsuario != null ? `?idUsuario=${idUsuario}` : '';
    return this.http
      .get<EstadoAprobacionPrestamo>(`${ServiciosCrd.RS_PRST}/estadoAprobacion/${id}${consulta}`)
      .pipe(catchError(this.handleError));
  }

  /** `GET prst/sustituibles/{idEntidad}?tipo=` (docs/crd/API-REESTRUCTURACION-NOVACION.md §2): préstamos del partícipe que se pueden reestructurar o novar, con su VS. */
  /** `GET prst/resumenSolicitudes` (sección «Solicitudes» del dashboard): sin fechas = mes en curso. 400 fecha mal formada, 422 hasta < desde. */
  resumenSolicitudes(filtros: { desde?: string; hasta?: string; idProducto?: number | null; idFilial?: number | null }): Observable<ResumenSolicitudes> {
    let params = new HttpParams();
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros.idProducto != null) params = params.set('idProducto', filtros.idProducto);
    if (filtros.idFilial != null) params = params.set('idFilial', filtros.idFilial);
    return this.http.get<ResumenSolicitudes>(`${ServiciosCrd.RS_PRST}/resumenSolicitudes`, { params });
  }

  sustituibles(idEntidad: number, tipo: Exclude<TipoOperacionPrestamo, 'NUEVO'>): Observable<PrestamoSustituible[] | null> {
    const url = `${ServiciosCrd.RS_PRST}/sustituibles/${idEntidad}?tipo=${tipo}`;
    return this.http.get<PrestamoSustituible[]>(url).pipe(catchError(this.handleError));
  }

  /** `GET prst/{id}/puedeAnular` (docs/crd/API-CICLO-OTORGAMIENTO.md §7.1). `motivo` explica el `false`. */
  puedeAnular(id: number): Observable<{ puede: boolean; motivo: string | null } | null> {
    const url = `${ServiciosCrd.RS_PRST}/${id}/puedeAnular`;
    return this.http.get<{ puede: boolean; motivo: string | null }>(url).pipe(catchError(this.handleError));
  }

  /** `POST prst/anular/{id}` (§7.2). `motivo` obligatorio; `idUsuario` es el código numérico, no el login. */
  anular(id: number, usuario: string, motivo: string, idEmpresa: number, idUsuario: number): Observable<Prestamo | null> {
    const url = `${ServiciosCrd.RS_PRST}/anular/${id}`;
    return this.http
      .post<Prestamo>(url, { usuario, motivo, idEmpresa, idUsuario }, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  rechazar(id: number, usuario: string, observacion: string = ''): Observable<Prestamo | null> {
    const url = `${ServiciosCrd.RS_PRST}/rechazar/${id}`;
    return this.http
      .post<Prestamo>(url, { usuario, observacion }, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Saldos vigentes (capital, total, cuotas en mora) de hasta 500 préstamos en una sola llamada,
   * calculados en el servidor desde las cuotas pendientes. Un código que no existe simplemente
   * no aparece en la respuesta — no es un error.
   */
  saldos(codigos: number[]): Observable<SaldoPrestamoResumen[] | null> {
    return this.http
      .post<SaldoPrestamoResumen[]>(`${ServiciosCrd.RS_PRST}/saldos`, codigos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
