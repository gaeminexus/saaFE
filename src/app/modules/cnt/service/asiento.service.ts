import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { Asiento, CrearAsiento, EstadoAsiento } from '../model/asiento';
import { ServiciosCnt } from '../service/ws-cnt';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';

/** Filtros de `GET /asnt/excel`; fechas ya en `yyyy-MM-dd`. */
export interface FiltrosExcelAsientos {
  idEmpresa: number | string;
  desde: string;
  hasta: string;
  idTipo?: number | null;
  estado?: number | null;
  categoria?: 'general' | 'sistema' | null;
}

export interface ArchivoExcelAsientos {
  blob: Blob;
  nombreArchivo: string;
}

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
   * Excel de asientos por tipo y rango de fechas: `GET /asnt/excel` (docs/cnt/API-EXCEL-ASIENTOS.md).
   * `desde`/`hasta` van como `yyyy-MM-dd`. Los errores (400/500) llegan como texto plano dentro de un
   * `Blob` por el `responseType`; se leen con `.text()` y se relanzan como `Error` con el mensaje del BE.
   */
  descargarExcel(filtros: FiltrosExcelAsientos): Observable<ArchivoExcelAsientos> {
    let params = new HttpParams()
      .set('idEmpresa', String(filtros.idEmpresa))
      .set('desde', filtros.desde)
      .set('hasta', filtros.hasta);
    if (filtros.idTipo != null) params = params.set('idTipo', String(filtros.idTipo));
    if (filtros.estado != null) params = params.set('estado', String(filtros.estado));
    if (filtros.categoria) params = params.set('categoria', filtros.categoria);

    return this.http.get(`${ServiciosCnt.RS_ASNT}/excel`, { params, responseType: 'blob', observe: 'response' }).pipe(
      map((resp) => {
        const disposition = resp.headers.get('Content-Disposition') ?? '';
        const m = /filename="?([^";]+)"?/.exec(disposition);
        return {
          blob: resp.body ?? new Blob(),
          nombreArchivo: m ? m[1].trim() : `asientos_${filtros.desde}_${filtros.hasta}.xlsx`,
        };
      }),
      catchError((e: HttpErrorResponse) => {
        const cuerpo = e.error;
        const generico = e.status === 0
          ? 'No se pudo contactar al servidor. Verifique su conexión e intente nuevamente.'
          : `Error inesperado del servidor (HTTP ${e.status}).`;
        const aMensaje = (texto: string): string => {
          const t = (texto ?? '').trim();
          if (!t || t.startsWith('<')) return generico;
          try {
            const obj = JSON.parse(t);
            if (obj && typeof obj.mensaje === 'string' && obj.mensaje.trim()) return obj.mensaje;
          } catch {
            // Texto plano (contrato: 400/500 son texto plano): se muestra tal cual.
          }
          return t;
        };
        if (cuerpo instanceof Blob) {
          return from(cuerpo.text()).pipe(switchMap((t) => throwError(() => new Error(aMensaje(t)))));
        }
        const texto = typeof cuerpo === 'string' ? cuerpo : typeof cuerpo?.mensaje === 'string' ? cuerpo.mensaje : '';
        return throwError(() => new Error(aMensaje(texto)));
      })
    );
  }

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
    // U-2 §6: es un GET que GRABA; el reverso queda a nombre del usuario de sesión.
    const url = `${this.baseUrl}${wsGetById}/${idAsiento}?usuario=${encodeURIComponent(usuarioSesion())}`;
    return this.http
      .get<Asiento>(url)
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtener asiento por ID
   */
  generaCopia(idAsiento: number): Observable<Asiento> {
    const wsGetById = '/generaCopia';
    // U-2 §6: es un GET que GRABA; la copia queda a nombre del usuario de sesión.
    const url = `${this.baseUrl}${wsGetById}/${idAsiento}?usuario=${encodeURIComponent(usuarioSesion())}`;
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
    // U-2 §6: el asiento manual lleva siempre el usuario de sesión en `nombreUsuario`.
    return this.http
      .post<Asiento>(this.baseUrl, { ...datosAsiento, nombreUsuario: usuarioSesion() }, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Actualizar asiento existente
   * IMPORTANTE: El backend espera PUT /asnt con el código en el body, no en la URL
   */
  actualizarAsiento(id: number, datosAsiento: any): Observable<Asiento> {
    // Asegurar que el código esté en el body
    // U-2 §6: se conserva el usuario del asiento si es uno real; si viene vacío o es un relleno
    // ('sistema'/'SYSTEM'), el asiento pasa a nombre del usuario de sesión.
    const previo = String(datosAsiento?.nombreUsuario ?? '').trim();
    const esRelleno = !previo || ['SISTEMA', 'SYSTEM'].includes(previo.toUpperCase());
    const asientoConCodigo = {
      ...datosAsiento,
      codigo: id,
      nombreUsuario: esRelleno ? usuarioSesion() : previo,
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
   * C17 — `POST /asnt/anular/{id}?usuario&motivo&fechaReverso` (saaBE CIERRES-BLOQUEANTES.md §3-§4).
   * Período del asiento CERRADO: no se anula; se genera un reverso en `fechaReverso` (yyyy-MM-dd, tiene que
   * caer en un período abierto) o, sin fecha, en el primer período abierto posterior. El original queda
   * REVERSADO y enlazado con el reverso por `idReversion` (en los dos sentidos). Devuelve el original.
   * Motivo obligatorio. Los errores (`PERIODO_CERRADO`...) se propagan con el mensaje del backend.
   */
  anularConReverso(id: number, usuario: string, motivo: string, fechaReverso?: string | null): Observable<Asiento> {
    let params = new HttpParams().set('usuario', usuario).set('motivo', motivo);
    if (fechaReverso) params = params.set('fechaReverso', fechaReverso);
    return this.http
      .post<Asiento>(`${this.baseUrl}/anular/${id}`, null, { params })
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
