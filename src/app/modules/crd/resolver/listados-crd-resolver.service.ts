import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MotivoPrestamoService } from '../service/motivo-prestamo.service';
import { MetodoPagoService } from '../service/metodo-pago.service';
import { NivelEstudioService } from '../service/nivel-estudio.service';
import { ProfesionService } from '../service/profesion.service';
import { ProductoService } from '../service/producto.service';
import { MotivoPrestamo } from '../model/motivo-prestamo';
import { MetodoPago } from '../model/metodo-pago';
import { NivelEstudio } from '../model/nivel-estudio';
import { Profesion } from '../model/profesion';
import { Producto } from '../model/producto';

export interface ListadosData {
  motivosPrestamo: MotivoPrestamo[] | null;
  metodosPago: MetodoPago[] | null;
  nivelesEstudio: NivelEstudio[] | null;
  profesiones: Profesion[] | null;
  productos: Producto[] | null;
}

@Injectable({
  providedIn: 'root'
})
export class ListadosCrdResolverService implements Resolve<ListadosData> {

  constructor(
    private motivoPrestamoService: MotivoPrestamoService,
    private metodoPagoService: MetodoPagoService,
    private nivelEstudioService: NivelEstudioService,
    private profesionService: ProfesionService,
    private productoService: ProductoService,
  ) { }

  resolve(): Observable<ListadosData> {
    return forkJoin({
      motivosPrestamo: this.motivoPrestamoService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar motivos préstamo:', error);
          return of(null);
        })
      ),
      metodosPago: this.metodoPagoService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar métodos pago:', error);
          return of(null);
        })
      ),
      nivelesEstudio: this.nivelEstudioService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar niveles estudio:', error);
          return of(null);
        })
      ),
      profesiones: this.profesionService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar profesiones:', error);
          return of(null);
        })
      ),
      productos: this.productoService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar productos:', error);
          return of(null);
        })
      ),
    });
  }
}

