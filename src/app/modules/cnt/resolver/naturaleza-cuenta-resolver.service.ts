import { Injectable } from '@angular/core';
import { Resolve, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, mergeMap, of, EMPTY } from 'rxjs';
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

    return this.naturalezaCuentaService.getAll().pipe(
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
