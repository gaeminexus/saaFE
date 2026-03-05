import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { EstadoParticipeService } from '../service/estado-participe.service';
import { EstadoPrestamoService } from '../service/estado-prestamo.service';
import { EstadoCesantiaService } from '../service/estado-cesantia.service';
import { EstadoCivilService } from '../service/estado-civil.service';
import { EstadoCuotaPrestamoService } from '../service/estado-cuota-prestamo.service';
import { EstadoParticipe } from '../model/estado-participe';
import { EstadoPrestamo } from '../model/estado-prestamo';
import { EstadoCesantia } from '../model/estado-cesantia';
import { EstadoCivil } from '../model/estado-civil';
import { EstadoCuotaPrestamo } from '../model/estado-cuota-prestamo';

export interface EstadosData {
  estadosParticipe: EstadoParticipe[] | null;
  estadosPrestamo: EstadoPrestamo[] | null;
  estadosCesantia: EstadoCesantia[] | null;
  estadosCivil: EstadoCivil[] | null;
  estadosCuotaPrestamo: EstadoCuotaPrestamo[] | null;
}

@Injectable({
  providedIn: 'root'
})
export class EstadosResolverService implements Resolve<EstadosData> {

  constructor(
    private estadoParticipeService: EstadoParticipeService,
    private estadoPrestamoService: EstadoPrestamoService,
    private estadoCesantiaService: EstadoCesantiaService,
    private estadoCivilService: EstadoCivilService,
    private estadoCuotaPrestamoService: EstadoCuotaPrestamoService,
  ) { }

  resolve(): Observable<EstadosData> {
    return forkJoin({
      estadosParticipe: this.estadoParticipeService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar estados partícipe:', error);
          return of(null);
        })
      ),
      estadosPrestamo: this.estadoPrestamoService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar estados préstamo:', error);
          return of(null);
        })
      ),
      estadosCesantia: this.estadoCesantiaService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar estados cesantía:', error);
          return of(null);
        })
      ),
      estadosCivil: this.estadoCivilService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar estados civil:', error);
          return of(null);
        })
      ),
      estadosCuotaPrestamo: this.estadoCuotaPrestamoService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar estados cuota préstamo:', error);
          return of(null);
        })
      ),
    });
  }
}
