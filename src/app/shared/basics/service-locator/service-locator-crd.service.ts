import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccionesGrid } from '../constantes';
import { EntidadesCrd } from '../../../modules/crd/model/entidades-crd';
import { EstadoParticipeService } from '../../../modules/crd/service/estado-participe.service';
import { EstadoPrestamoService } from '../../../modules/crd/service/estado-prestamo.service';
import { EstadoCesantiaService } from '../../../modules/crd/service/estado-cesantia.service';
import { EstadoCivilService } from '../../../modules/crd/service/estado-civil.service';
import { EstadoParticipe } from '../../../modules/crd/model/estado-participe';
import { EstadoPrestamo } from '../../../modules/crd/model/estado-prestamo';
import { EstadoCesantia } from '../../../modules/crd/model/estado-cesantia';
import { EstadoCivil } from '../../../modules/crd/model/estado-civil';

@Injectable({
  providedIn: 'root'
})
export class ServiceLocatorCrdService {

  reg: any;

  constructor(
    public estadoParticipeService: EstadoParticipeService,
    public estadoPrestamoService: EstadoPrestamoService,
    public estadoCesantiaService: EstadoCesantiaService,
    public estadoCivilService: EstadoCivilService,
  ) { }

  ejecutaServicio(entidad: number, value: any, proceso: number): Promise<any> {
    switch (entidad) {
      case EntidadesCrd.ESTADO_PARTICIPE: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as EstadoParticipe;
            this.reg.idEstado = 1;
            return firstValueFrom(this.estadoParticipeService.add(this.reg as EstadoParticipe));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as EstadoParticipe;
            return firstValueFrom(this.estadoParticipeService.update(this.reg as EstadoParticipe));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.estadoParticipeService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.ESTADO_PRESTAMO: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as EstadoPrestamo;
            this.reg.idEstado = 1;
            return firstValueFrom(this.estadoPrestamoService.add(this.reg as EstadoPrestamo));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as EstadoPrestamo;
            return firstValueFrom(this.estadoPrestamoService.update(this.reg as EstadoPrestamo));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.estadoPrestamoService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.ESTADO_CESANTIA: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as EstadoCesantia;
            this.reg.idEstado = 1;
            return firstValueFrom(this.estadoCesantiaService.add(this.reg as EstadoCesantia));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as EstadoCesantia;
            return firstValueFrom(this.estadoCesantiaService.update(this.reg as EstadoCesantia));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.estadoCesantiaService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      case EntidadesCrd.ESTADO_CIVIL: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as EstadoCivil;
            this.reg.idEstado = 1;
            return firstValueFrom(this.estadoCivilService.add(this.reg as EstadoCivil));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as EstadoCivil;
            return firstValueFrom(this.estadoCivilService.update(this.reg as EstadoCivil));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.estadoCivilService.delete(value));
          }
          default:
            return Promise.resolve(undefined);
        }
      }
      default: {
        console.log('NO SE ENCONTRO EL SERVICIO');
        return Promise.resolve(undefined);
      }
    }
  }

  recargarValores(entidad: number): Promise<any> {
    switch (entidad) {
      case EntidadesCrd.ESTADO_PARTICIPE: {
        return firstValueFrom(this.estadoParticipeService.getAll());
      }
      case EntidadesCrd.ESTADO_PRESTAMO: {
        return firstValueFrom(this.estadoPrestamoService.getAll());
      }
      case EntidadesCrd.ESTADO_CESANTIA: {
        return firstValueFrom(this.estadoCesantiaService.getAll());
      }
      case EntidadesCrd.ESTADO_CIVIL: {
        return firstValueFrom(this.estadoCivilService.getAll());
      }
      default: {
        console.log('NO SE ENCONTRO EL SERVICIO');
        return Promise.resolve(undefined);
      }
    }
  }

}
