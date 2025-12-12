import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DetallePlantilla, TipoMovimiento } from '../model/detalle-plantilla-general';
import { EstadoPlantilla, Plantilla } from '../model/plantilla-general';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root',
})
export class PlantillaService {
  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las plantillas usando el endpoint del backend
   */
  getAll(): Observable<Plantilla[]> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosCnt.RS_PLNS}${wsGetAll}`;
    return this.http.get<Plantilla[]>(url).pipe(catchError(this.handleError));
  }

  /**
   * Obtiene una plantilla por ID
   */
  getById(codigo: number): Observable<Plantilla | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_PLNS}${wsGetById}${codigo}`;
    return this.http.get<Plantilla>(url).pipe(catchError(this.handleError));
  }

  /**
   * Obtiene detalles de una plantilla
   */
  getDetallesByPlantillaCodigo(plantillaCodigo: number): Observable<DetallePlantilla[]> {
    const wsGetDetalles = '/getByParent/';
    const url = `${ServiciosCnt.RS_DTPL}${wsGetDetalles}${plantillaCodigo}`;
    return this.http.get<DetallePlantilla[]>(url).pipe(catchError(this.handleError));
  }

  /**
   * Crea una nueva plantilla
   */
  add(plantilla: Plantilla): Observable<Plantilla | null> {
    return this.http
      .post<Plantilla>(ServiciosCnt.RS_PLNS, plantilla, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Actualiza una plantilla existente
   */
  update(plantilla: Plantilla): Observable<Plantilla | null> {
    return this.http
      .put<Plantilla>(ServiciosCnt.RS_PLNS, plantilla, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Elimina una plantilla
   */
  delete(codigo: number): Observable<boolean> {
    const wsDelete = '/' + codigo;
    const url = `${ServiciosCnt.RS_PLNS}${wsDelete}`;
    return this.http.delete<Plantilla>(url, this.httpOptions).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * Busca plantillas por criterios
   */
  selectByCriteria(criterios: any): Observable<Plantilla[] | null> {
    const wsSelectByCriteria = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_PLNS}${wsSelectByCriteria}`;

    const empresaCodigo = parseInt(localStorage.getItem('idSucursal') || '280', 10);
    const criteriosConEmpresa = { ...criterios, empresa: { codigo: empresaCodigo } };

    return this.http
      .post<Plantilla[]>(url, criteriosConEmpresa, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Obtiene plantilla completa con detalles
   */
  getPlantillaCompleta(
    codigo: number
  ): Observable<{ plantilla: Plantilla; detalles: DetallePlantilla[] } | null> {
    // En el backend real, esto sería un endpoint especializado
    return new Observable((observer) => {
      this.getById(codigo).subscribe((plantilla) => {
        if (plantilla) {
          this.getDetallesByPlantillaCodigo(codigo).subscribe((detalles) => {
            observer.next({ plantilla, detalles });
            observer.complete();
          });
        } else {
          observer.next(null);
          observer.complete();
        }
      });
    });
  }

  /**
   * Cambia el estado de una plantilla
   */
  cambiarEstado(codigo: number, estado: EstadoPlantilla): Observable<boolean> {
    // Buscar la plantilla actual
    return this.getById(codigo).pipe(
      map((plantilla) => {
        if (plantilla) {
          plantilla.estado = estado;
          if (estado === EstadoPlantilla.INACTIVO) {
            plantilla.fechaInactivo = new Date();
          }
          this.update(plantilla).subscribe();
          return true;
        }
        return false;
      }),
      catchError(() => of(false))
    );
  }

  /**
   * Manejo de errores HTTP
   */
  private handleError(error: HttpErrorResponse): Observable<any> {
    console.error('Error en PlantillaService:', error);
    if (error.status === 0) {
      console.error('Error de conexión con el servidor');
    }
    return throwError(() => error);
  }

  /**
   * Obtiene el texto del estado
   */
  getEstadoText(estado: EstadoPlantilla): string {
    switch (estado) {
      case EstadoPlantilla.ACTIVO:
        return 'Activo';
      case EstadoPlantilla.INACTIVO:
        return 'Inactivo';
      default:
        return 'Desconocido';
    }
  }

  /**
   * Obtiene el texto del tipo de movimiento
   */
  getMovimientoText(movimiento: TipoMovimiento): string {
    switch (movimiento) {
      case TipoMovimiento.DEBE:
        return 'Debe';
      case TipoMovimiento.HABER:
        return 'Haber';
      default:
        return 'Desconocido';
    }
  }
}
