import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosAsoprep } from './ws-asgn';
import { CargaArchivo } from '../../crd/model/carga-archivo';
import { ParticipeXCargaArchivo } from '../../crd/model/participe-x-carga-archivo';

@Injectable({
  providedIn: 'root'
})
export class ServiciosAsoprepService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  /**
   * Almacena datos completos del archivo Petro con archivo físico
   * POST application/x-www-form-urlencoded: Envía archivo + 3 variables JSON
   */
  almacenaDatosArchivoPetro(
    archivo: File,
    cargaArchivo: any,
    detallesCargaArchivos: any[],
    participesXCargaArchivo: any[]
  ): Observable<any | null> {
    const wsEndpoint = '/procesarArchivoPetro';
    const url = `${ServiciosAsoprep.RS_ASGN}${wsEndpoint}`;
    const formData = new FormData();

    // Archivo físico
    formData.append('archivo', archivo);

    // Nombre del archivo
    formData.append('archivoNombre', archivo.name);

    // Variables JSON como strings en FormData
    formData.append('cargaArchivo', JSON.stringify(cargaArchivo));
    formData.append('detallesCargaArchivos', JSON.stringify(detallesCargaArchivos));
    formData.append('participesXCargaArchivo', JSON.stringify(participesXCargaArchivo));

    // Para FormData NO usar httpOptions (el navegador establece Content-Type automáticamente)
    return this.http.post<any>(url, formData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Almacena datos completos del archivo Petro con archivo físico
   * POST application/x-www-form-urlencoded: Envía archivo + 3 variables JSON
   */
  validaDatosArchivoPetro(
    archivo: File,
    cargaArchivo: any,
  ): Observable<CargaArchivo | null> {
    const wsEndpoint = '/validarArchivoPetro';
    const url = `${ServiciosAsoprep.RS_ASGN}${wsEndpoint}`;
    const formData = new FormData();
    // Archivo físico
    formData.append('archivo', archivo);
    // Nombre del archivo
    formData.append('archivoNombre', archivo.name);
    // Variables JSON como strings en FormData
    formData.append('cargaArchivo', JSON.stringify(cargaArchivo));

    // Para FormData NO usar httpOptions (el navegador establece Content-Type automáticamente)
    return this.http.post<CargaArchivo>(url, formData).pipe(
      catchError(this.handleError)
    );
  }

  actualizaCodigoPetroEntidad(codigoPetro: number, idParticipeXCarga: number, idEntidad: number): Observable<ParticipeXCargaArchivo | null> {
      const wsGetById = '/actualizaCodigoPetroEntidad/';
      const url = `${ServiciosAsoprep.RS_ASGN}${wsGetById}${codigoPetro}/${idParticipeXCarga}/${idEntidad}`;
      return this.http.get<ParticipeXCargaArchivo>(url).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }

}
