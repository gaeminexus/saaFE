import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable } from 'rxjs';
import { CargaArchivo } from '../model/carga-archivo';
import { CargaArchivoService } from '../service/carga-archivo.service';

@Injectable({
  providedIn: 'root'
})
export class ConsultaCargaArchivoResolverService implements Resolve<CargaArchivo[] | null> {

  constructor(private cargaArchivoService: CargaArchivoService) {}

  resolve(): Observable<CargaArchivo[] | null> {
    return this.cargaArchivoService.getAll();
  }
}
