import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TipoContratoService } from '../service/tipo-contrato.service';
import { TipoParticipeService } from '../service/tipo-participe.service';
import { TipoPrestamoService } from '../service/tipo-prestamo.service';
import { TipoRequisitoPrestamoService } from '../service/tipo-requisito-prestamo.service';
import { TipoCesantiaService } from '../service/tipo-cesantia.service';
import { TipoCalificacionCreditoService } from '../service/tipo-calificacion-credito.service';
import { TipoAporteService } from '../service/tipo-aporte.service';
import { TipoAdjuntoService } from '../service/tipo-adjunto.service';
import { TipoGeneroService } from '../service/tipo-genero.service';
import { TipoIdentificacionService } from '../service/tipo-identificacion.service';
import { TipoViviendaService } from '../service/tipo-vivienda.service';
import { TipoContrato } from '../model/tipo-contrato';
import { TipoParticipe } from '../model/tipo-participe';
import { TipoPrestamo } from '../model/tipo-prestamo';
import { TipoRequisitoPrestamo } from '../model/tipo-requisito-prestamo';
import { TipoCesantia } from '../model/tipo-cesantia';
import { TipoCalificacionCredito } from '../model/tipo-calificacion-credito';
import { TipoAporte } from '../model/tipo-aporte';
import { TipoAdjunto } from '../model/tipo-adjunto';
import { TipoGenero } from '../model/tipo-genero';
import { TipoIdentificacion } from '../model/tipo-identificacion';
import { TipoVivienda } from '../model/tipo-vivienda';

export interface TiposData {
  tiposContrato: TipoContrato[] | null;
  tiposParticipe: TipoParticipe[] | null;
  tiposPrestamo: TipoPrestamo[] | null;
  tiposRequisitoPrestamo: TipoRequisitoPrestamo[] | null;
  tiposCesantia: TipoCesantia[] | null;
  tiposCalificacionCredito: TipoCalificacionCredito[] | null;
  tiposAporte: TipoAporte[] | null;
  tiposAdjunto: TipoAdjunto[] | null;
  tiposGenero: TipoGenero[] | null;
  tiposIdentificacion: TipoIdentificacion[] | null;
  tiposVivienda: TipoVivienda[] | null;
}

@Injectable({
  providedIn: 'root'
})
export class TiposCrdResolverService implements Resolve<TiposData> {

  constructor(
    private tipoContratoService: TipoContratoService,
    private tipoParticipeService: TipoParticipeService,
    private tipoPrestamoService: TipoPrestamoService,
    private tipoRequisitoPrestamoService: TipoRequisitoPrestamoService,
    private tipoCesantiaService: TipoCesantiaService,
    private tipoCalificacionCreditoService: TipoCalificacionCreditoService,
    private tipoAporteService: TipoAporteService,
    private tipoAdjuntoService: TipoAdjuntoService,
    private tipoGeneroService: TipoGeneroService,
    private tipoIdentificacionService: TipoIdentificacionService,
    private tipoViviendaService: TipoViviendaService,
  ) { }

  resolve(): Observable<TiposData> {
    return forkJoin({
      tiposContrato: this.tipoContratoService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar tipos contrato:', error);
          return of(null);
        })
      ),
      tiposParticipe: this.tipoParticipeService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar tipos partícipe:', error);
          return of(null);
        })
      ),
      tiposPrestamo: this.tipoPrestamoService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar tipos préstamo:', error);
          return of(null);
        })
      ),
      tiposRequisitoPrestamo: this.tipoRequisitoPrestamoService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar tipos requisito préstamo:', error);
          return of(null);
        })
      ),
      tiposCesantia: this.tipoCesantiaService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar tipos cesantía:', error);
          return of(null);
        })
      ),
      tiposCalificacionCredito: this.tipoCalificacionCreditoService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar tipos calificación crédito:', error);
          return of(null);
        })
      ),
      tiposAporte: this.tipoAporteService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar tipos aporte:', error);
          return of(null);
        })
      ),
      tiposAdjunto: this.tipoAdjuntoService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar tipos adjunto:', error);
          return of(null);
        })
      ),
      tiposGenero: this.tipoGeneroService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar tipos género:', error);
          return of(null);
        })
      ),
      tiposIdentificacion: this.tipoIdentificacionService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar tipos identificación:', error);
          return of(null);
        })
      ),
      tiposVivienda: this.tipoViviendaService.getAll().pipe(
        catchError(error => {
          console.error('Error al cargar tipos vivienda:', error);
          return of(null);
        })
      ),
    });
  }
}
