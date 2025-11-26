import { Injectable } from '@angular/core';
import { Resolve, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, mergeMap, of, EMPTY, catchError, map } from 'rxjs';
import { NaturalezaCuentaService } from '../service/naturaleza-cuenta.service';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

@Injectable({
  providedIn: 'root'
})
export class NaturalezaCuentaResolverService implements Resolve<any>  {

  constructor(
    private router: Router,
    private naturalezaCuentaService: NaturalezaCuentaService,
  ) { }

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> {

    // Obtener empresa desde localStorage
    const idSucursal = parseInt(localStorage.getItem('idSucursal') || '280', 10);

    // Crear criterios de búsqueda para empresa dinámica
    const criterioConsultaArray: Array<DatosBusqueda> = [];

    // Filtro por empresa desde localStorage
    const criterioEmpresa = new DatosBusqueda();
    criterioEmpresa.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'empresa', 'codigo', String(idSucursal), TipoComandosBusqueda.IGUAL);
    criterioConsultaArray.push(criterioEmpresa);

    // Priorizar selectByCriteria con filtro de empresa, con fallback a getAll
    return this.naturalezaCuentaService.selectByCriteria(criterioConsultaArray).pipe(
      catchError(err => {
        console.warn('selectByCriteria con empresa falló, intentando getAll como fallback:', err);
        return this.naturalezaCuentaService.getAll().pipe(
          map(result => {
            // Filtrar por empresa desde localStorage
            const list = Array.isArray(result) ? result : (result as any)?.data ?? [];
            return list.filter((nat: any) => nat?.empresa?.codigo === idSucursal);
          })
        );
      }),
      map(result => {
        // Ordenar por número de mayor a menor (descendente)
        const list = Array.isArray(result) ? result : (result as any)?.data ?? [];
        return list.sort((a: any, b: any) => (b.numero || 0) - (a.numero || 0));
      }),
      mergeMap(result => {
        if (result) {
          return of(result);
        } else { // id not found
          this.router.navigate(['']);
          return EMPTY;
        }
      })
    );
  }

}
