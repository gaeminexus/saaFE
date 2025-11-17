import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleRubro } from '../model/detalle-rubro';
import { ServiciosShare } from './ws-share';

@Injectable({
  providedIn: 'root'
})
export class DetalleRubroService {

  private detalleRub!: DetalleRubro[];

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<DetalleRubro[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosShare.RS_PDTR}${wsGetById}`;
    return this.http.get<DetalleRubro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getRubros(idRubro: number): Observable<DetalleRubro[] | null> {
    const wsGetById = '/getRubros/' + idRubro;
    const url = `${ServiciosShare.RS_PDTR}${wsGetById}`;
    return this.http.get<DetalleRubro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  setDetalles(detalle: DetalleRubro[]): void {
    this.detalleRub = detalle;
  }

  getDetalles(): DetalleRubro[] {
    return this.detalleRub;
  }

  getDetallesByParent(idPadre: number): any {
    return this.detalleRub.filter(this.filtraRubros(idPadre));
  }

  getDescripcionByParentAndAlterno(idPadre: number, alterno: number): string {
    let result = '';
    this.getDetallesByParent(idPadre).forEach((res: { codigoAlterno: number; descripcion: string; }) => {
      if (alterno === res.codigoAlterno) {
        result = res.descripcion;
      }
    });
    return result;
  }

  getNumeroByParentAndAlterno(idPadre: number, alterno: number): number {
    let result = 0;
    this.getDetallesByParent(idPadre).forEach((res: { codigoAlterno: number; valorNumerico: number; }) => {
      if (alterno === res.codigoAlterno) {
        result = res.valorNumerico;
      }
    });
    return result;
  }

  filtraRubros(idPadre: number): any {
    // tslint:disable-next-line: only-arrow-functions
    return function (element: any): any {
      return (element.rubro.codigoAlterno === idPadre);
    };
  }

  // tslint:disable-next-line: typedef
  private handleError(error: HttpErrorResponse) {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(
        error.error);
    }
  }

}
