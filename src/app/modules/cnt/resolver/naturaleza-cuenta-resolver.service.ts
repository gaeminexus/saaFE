import { Injectable } from '@angular/core';
import { Resolve, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, mergeMap, of, EMPTY, catchError } from 'rxjs';
import { NaturalezaCuentaService } from '../service/naturaleza-cuenta.service';

@Injectable({
  providedIn: 'root'
})
export class NaturalezaCuentaResolverService implements Resolve<any>  {

  constructor(
    private router: Router,
    private naturalezaCuentaService: NaturalezaCuentaService,
  ) { }

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> {

    // Priorizar selectByCriteria con fallback a getAll
    return this.naturalezaCuentaService.selectByCriteria({}).pipe(
      catchError(err => {
        console.warn('selectByCriteria falló, intentando getAll como fallback:', err);
        return this.naturalezaCuentaService.getAll();
      }),
      mergeMap(result => {
        if (result) {
          // console.log(certificados.length);
          return of(result);
        } else { // id not found
          this.router.navigate(['']);
          return EMPTY;
        }
      })
    );
  }

}
