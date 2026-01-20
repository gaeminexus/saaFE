import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CargaArchivo } from '../model/carga-archivo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class CargaArchivoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<CargaArchivo[] | null> {
    const ws = '/getAll';
    const url = `${ServiciosCrd.RS_CRAR}${ws}`;
    return this.http.get<CargaArchivo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<CargaArchivo | null> {
    const ws = '/getId/';
    const url = `${ServiciosCrd.RS_CRAR}${ws}${id}`;
    return this.http.get<CargaArchivo>(url).pipe(
      catchError(this.handleError)
    );
  }

  melyTest(idEntidad: number): Observable<string | null> {
    const ws = '/melyTest/';
    const url = `${ServiciosCrd.RS_CRAR}${ws}${idEntidad}`;
    return this.http.get<string>(url).pipe(
      catchError(this.handleError)
    );
  }

  getByAnio(anio: string): Observable<CargaArchivo | null> {
    const ws = '/getByAnio/';
    const url = `${ServiciosCrd.RS_CRAR}${ws}${anio}`;
    return this.http.get<CargaArchivo>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<CargaArchivo | null> {
    return this.http.post<CargaArchivo>(ServiciosCrd.RS_CRAR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<CargaArchivo | null> {
    return this.http.put<CargaArchivo>(ServiciosCrd.RS_CRAR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<CargaArchivo[] | null> {
    const ws = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_CRAR}${ws}`;
    return this.http.post<CargaArchivo[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: any): Observable<CargaArchivo | null> {
    const ws = '/' + id;
    const url = `${ServiciosCrd.RS_CRAR}${ws}`;
    return this.http.delete<CargaArchivo>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Sube el archivo físico al servidor después de guardar en BD
   * El backend guarda el archivo y actualiza la ruta en la BD
   */
  subirArchivoFisico(archivo: File, codigoCarga: number, anio: number, mes: number, filial: number): Observable<any> {
    const ws = '/subirArchivo';
    const url = `${ServiciosCrd.RS_CRAR}${ws}`;

    const formData = new FormData();
    formData.append('archivo', archivo, archivo.name);
    formData.append('codigoCarga', codigoCarga.toString());
    formData.append('anio', anio.toString());
    formData.append('mes', mes.toString());
    formData.append('filial', filial.toString());

    return this.http.post<any>(url, formData).pipe(
      catchError((error) => throwError(() => error.error || error))
    );
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
