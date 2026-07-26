import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ExtractoBancario } from '../model/extracto-bancario';
import { ResumenImportacionExtracto } from '../model/resumen-importacion-extracto';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root',
})
export class ExtractoBancarioService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de ExtractoBancario.
   */
  getAll(): Observable<ExtractoBancario[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_EXBC}${wsGetAll}`;
    return this.http.get<ExtractoBancario[]>(url).pipe(catchError(this.handleError));
  }

  /**
   * Recupera un registro de ExtractoBancario por su ID.
   */
  getById(id: number): Observable<ExtractoBancario | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_EXBC}${wsGetById}${id}`;
    return this.http.get<ExtractoBancario>(url).pipe(catchError(this.handleError));
  }

  /**
   * Selecciona registros de ExtractoBancario según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<ExtractoBancario[] | null> {
    const wsCriteria = '/selectByCriteria';
    const url = `${ServiciosTsr.RS_EXBC}${wsCriteria}`;
    return this.http
      .post<ExtractoBancario[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Elimina un registro de ExtractoBancario por su ID.
   */
  delete(ids: number[]): Observable<any> {
    return this.http
      .delete<any>(ServiciosTsr.RS_EXBC, { ...this.httpOptions, body: ids })
      .pipe(catchError(this.handleError));
  }

  /**
   * Previsualiza la importacion de un archivo de estado de cuenta bancario,
   * sin persistir nada. El backend selecciona el parser automaticamente
   * segun el banco de la cuenta bancaria indicada.
   */
  validarImportacion(archivo: File, idCuentaBancaria: number): Observable<ResumenImportacionExtracto | null> {
    const url = `${ServiciosTsr.RS_EXBC}/importar/validar/${idCuentaBancaria}`;
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('archivoNombre', archivo.name);
    // Para FormData NO usar httpOptions (el navegador establece Content-Type automáticamente)
    return this.http
      .post<ResumenImportacionExtracto>(url, formData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Reparsea el mismo archivo y guarda el lote completo (ExtractoBancario +
   * DetalleExtractoBancario). Rechaza el archivo si su hash ya fue cargado.
   */
  confirmarImportacion(
    archivo: File,
    idCuentaBancaria: number,
    idEmpresa: number,
    usuarioCreacion: string
  ): Observable<ExtractoBancario | null> {
    const url = `${ServiciosTsr.RS_EXBC}/importar/confirmar/${idCuentaBancaria}`;
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('archivoNombre', archivo.name);
    formData.append('idEmpresa', String(idEmpresa));
    formData.append('usuarioCreacion', usuarioCreacion || '');
    return this.http
      .post<ExtractoBancario>(url, formData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Manejo centralizado de errores HTTP.
   */
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error);
    }
  }
}
