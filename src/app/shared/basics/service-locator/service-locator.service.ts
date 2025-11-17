import { Injectable } from '@angular/core';
import { NaturalezaCuentaService } from '../../../modules/cnt/service/naturaleza-cuenta.service';
import { AccionesGrid } from '../constantes';
import { EntidadesContabilidad } from '../../../modules/cnt/model/entidades-cnt';
import { NaturalezaCuenta } from '../../../modules/cnt/model/naturaleza-cuenta';

@Injectable({
  providedIn: 'root'
})
export class ServiceLocatorService {

  reg: any;

  constructor(
    public naturalezaCuentaService: NaturalezaCuentaService,
  ) { }

  ejecutaServicio(entidad: number, value: any, proceso: number): Promise<any> {
    switch (entidad) {
      case EntidadesContabilidad.NATURALEZA_CUENTA: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as NaturalezaCuenta;
            this.reg.estado = 1;
            return this.naturalezaCuentaService.add(this.reg as NaturalezaCuenta).toPromise();
          }
          case AccionesGrid.EDIT: {
            this.reg = value as NaturalezaCuenta;
            return this.naturalezaCuentaService.update(this.reg as NaturalezaCuenta).toPromise();
          }
          case AccionesGrid.REMOVE: {
            return this.naturalezaCuentaService.delete(value).toPromise();
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

  recargarValores(entidad: number): Promise<any>{
    switch (entidad) {
      case EntidadesContabilidad.NATURALEZA_CUENTA: {
        return new Promise((resolve, reject) => {
            this.naturalezaCuentaService.getAll().subscribe(result => {
              // this.naturalezaCuentaService.reload(result);
              resolve(result);
            });
        });
      }
      default: {
        console.log('NO SE ENCONTRO EL SERVICIO');
        return Promise.resolve(undefined);
      }
    }
  }

}
