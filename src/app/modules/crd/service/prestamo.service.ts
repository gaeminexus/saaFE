import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Prestamo } from '../model/prestamo';
import { ServiciosCrd } from './ws-crd';

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
    const url = `${ServiciosCrd.RS_PRST}/cargarTablaExcel/${idPrestamo}`;
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

  aprobar(id: number, usuario: string, observacion: string = ''): Observable<Prestamo | null> {
    const url = `${ServiciosCrd.RS_PRST}/aprobar/${id}`;
    return this.http
      .post<Prestamo>(url, { usuario, observacion }, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  rechazar(id: number, usuario: string, observacion: string = ''): Observable<Prestamo | null> {
    const url = `${ServiciosCrd.RS_PRST}/rechazar/${id}`;
    return this.http
      .post<Prestamo>(url, { usuario, observacion }, this.httpOptions)
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
