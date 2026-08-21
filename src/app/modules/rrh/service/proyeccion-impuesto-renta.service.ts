import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { empresaSesionCodigo } from '../../../shared/services/empresa-sesion';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
import { ProyeccionImpuestoRenta } from '../model/proyeccion-impuesto-renta';
import { ResultadoProyeccionIr } from '../model/resultados-nomina';
import { ServiciosRhh } from './ws-rrh';

/** Proyección del impuesto a la renta (RHH.PYIR), con sus dos endpoints de proceso. */
@Injectable({
  providedIn: 'root',
})
export class ProyeccionImpuestoRentaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  selectByCriteria(datos: DatosBusqueda[]): Observable<ProyeccionImpuestoRenta[] | null> {
    const url = `${ServiciosRhh.RS_PYIR}/selectByCriteria/`;
    return this.http.post<ProyeccionImpuestoRenta[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  /**
   * POST /rest/pyir/proyectar — reproyecta un colaborador desde el mes indicado.
   * El `usuarioRegistro` va en el cuerpo, que ya existe.
   */
  proyectar(idEmpleado: number, anio: number, mesDesde: number): Observable<ResultadoProyeccionIr> {
    const url = `${ServiciosRhh.RS_PYIR}/proyectar`;
    const cuerpo = { idEmpleado, anio, mesDesde, usuarioRegistro: usuarioSesion() };
    return this.http
      .post<ResultadoProyeccionIr>(url, cuerpo, this.httpOptions)
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  /**
   * POST /rest/pyir/proyectarTodos/{anio}?idEmpresa=&usuarioRegistro= — devuelve el número de
   * empleados proyectados. La corrida es por empresa: sin `idEmpresa` alcanzaría a todas.
   */
  proyectarTodos(anio: number): Observable<number> {
    const url = `${ServiciosRhh.RS_PYIR}/proyectarTodos/${anio}`;
    const opciones = {
      ...this.httpOptions,
      params: new HttpParams()
        .set('idEmpresa', String(empresaSesionCodigo() ?? ''))
        .set('usuarioRegistro', usuarioSesion()),
    };

    return this.http
      .post<number>(url, null, opciones)
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  // Manejo de errores HTTP (respetando patrón de of(null) con status 200)
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}
