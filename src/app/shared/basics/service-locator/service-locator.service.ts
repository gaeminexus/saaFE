import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NaturalezaCuentaService } from '../../../modules/cnt/service/naturaleza-cuenta.service';
import { AccionesGrid } from '../constantes';
import { EntidadesContabilidad } from '../../../modules/cnt/model/entidades-cnt';
import { NaturalezaCuenta } from '../../../modules/cnt/model/naturaleza-cuenta';
import { ServiceLocatorCrdService } from './service-locator-crd.service';
import { EntidadesCrd } from '../../../modules/crd/model/entidades-crd';

@Injectable({
  providedIn: 'root'
})
export class ServiceLocatorService {

  reg: any;

  constructor(
    public naturalezaCuentaService: NaturalezaCuentaService,
    private serviceLocatorCrd: ServiceLocatorCrdService,
  ) { }

  ejecutaServicio(entidad: number, value: any, proceso: number): Promise<any> {
    // Delegar a ServiceLocatorCrdService si es una entidad de CRD
    if (this.isEntidadCrd(entidad)) {
      return this.serviceLocatorCrd.ejecutaServicio(entidad, value, proceso);
    }

    // Manejar entidades de Contabilidad
    switch (entidad) {
      case EntidadesContabilidad.NATURALEZA_CUENTA: {
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as NaturalezaCuenta;
            this.reg.estado = 1;
            return firstValueFrom(this.naturalezaCuentaService.add(this.reg as NaturalezaCuenta));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as NaturalezaCuenta;
            return firstValueFrom(this.naturalezaCuentaService.update(this.reg as NaturalezaCuenta));
          }
          case AccionesGrid.REMOVE: {
            return firstValueFrom(this.naturalezaCuentaService.delete(value));
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
    // Delegar a ServiceLocatorCrdService si es una entidad de CRD
    if (this.isEntidadCrd(entidad)) {
      return this.serviceLocatorCrd.recargarValores(entidad);
    }

    // Manejar entidades de Contabilidad
    switch (entidad) {
      case EntidadesContabilidad.NATURALEZA_CUENTA: {
        return firstValueFrom(this.naturalezaCuentaService.getAll());
      }
      default: {
        console.log('NO SE ENCONTRO EL SERVICIO');
        return Promise.resolve(undefined);
      }
    }
  }

  /**
   * Verifica si una entidad pertenece al módulo de Créditos
   */
  private isEntidadCrd(entidad: number): boolean {
    const entidadesCrd = [
      EntidadesCrd.BOT_OPCION,
      EntidadesCrd.CANTON,
      EntidadesCrd.CREDITO_MONTO_APROBACION,
      EntidadesCrd.ESTADO_CESANTIA,
      EntidadesCrd.ESTADO_CIVIL,
      EntidadesCrd.ESTADO_PARTICIPE,
      EntidadesCrd.ESTADO_PRESTAMO,
      EntidadesCrd.EXTER,
      EntidadesCrd.ENTIDAD,
      EntidadesCrd.PRODUCTO,
      EntidadesCrd.PRESTAMO,
      EntidadesCrd.DETALLE_PRESTAMO,
      EntidadesCrd.PAGO_PRESTAMO,
      EntidadesCrd.TIPO_PRESTAMO,
      EntidadesCrd.FILIAL,
      EntidadesCrd.TIPO_VIVIENDA,
      EntidadesCrd.TIPO_IDENTIFICACION,
    ];
    return entidadesCrd.includes(entidad);
  }

}
