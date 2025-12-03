import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { EntidadesContabilidad } from '../../../modules/cnt/model/entidades-cnt';
import { NaturalezaCuenta } from '../../../modules/cnt/model/naturaleza-cuenta';
import { NaturalezaCuentaService } from '../../../modules/cnt/service/naturaleza-cuenta.service';
import { EntidadesCrd } from '../../../modules/crd/model/entidades-crd';
import { AccionesGrid } from '../constantes';
import { ServiceLocatorCrdService } from './service-locator-crd.service';

@Injectable({
  providedIn: 'root',
})
export class ServiceLocatorService {
  reg: any;

  constructor(
    public naturalezaCuentaService: NaturalezaCuentaService,
    private serviceLocatorCrd: ServiceLocatorCrdService
  ) {}

  ejecutaServicio(entidad: number, value: any, proceso: number): Promise<any> {
    console.log(
      `[ServiceLocatorService] ejecutaServicio - entidad: ${entidad}, proceso: ${proceso}, isEntidadCrd: ${this.isEntidadCrd(
        entidad
      )}`
    );

    // Delegar a ServiceLocatorCrdService si es una entidad de CRD
    if (this.isEntidadCrd(entidad)) {
      console.log(
        `[ServiceLocatorService] Delegando a ServiceLocatorCrdService para entidad ${entidad}`
      );
      return this.serviceLocatorCrd.ejecutaServicio(entidad, value, proceso);
    }

    // Manejar entidades de Contabilidad
    switch (entidad) {
      case EntidadesContabilidad.NATURALEZA_CUENTA: {
        console.log(`[ServiceLocatorService] Manejando NATURALEZA_CUENTA (8)`);
        switch (proceso) {
          case AccionesGrid.ADD: {
            this.reg = value as NaturalezaCuenta;
            this.reg.estado = 1;
            console.log(`[ServiceLocatorService] ADD - Datos:`, this.reg);
            return firstValueFrom(this.naturalezaCuentaService.add(this.reg as NaturalezaCuenta));
          }
          case AccionesGrid.EDIT: {
            this.reg = value as NaturalezaCuenta;
            console.log(`[ServiceLocatorService] EDIT - Datos:`, this.reg);
            return firstValueFrom(
              this.naturalezaCuentaService.update(this.reg as NaturalezaCuenta)
            );
          }
          case AccionesGrid.REMOVE: {
            console.log(`[ServiceLocatorService] REMOVE - ID:`, value);
            return firstValueFrom(this.naturalezaCuentaService.delete(value));
          }
          default:
            console.log(`[ServiceLocatorService] Acción desconocida: ${proceso}`);
            return Promise.resolve(undefined);
        }
      }
      default: {
        console.error(
          `❌ [ServiceLocatorService] NO SE ENCONTRO EL SERVICIO para entidad: ${entidad}`
        );
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
      EntidadesCrd.TIPO_CONTRATO,
      EntidadesCrd.TIPO_PARTICIPE,
      EntidadesCrd.TIPO_REQUISITO_PRESTAMO,
      EntidadesCrd.TIPO_CESANTIA,
      EntidadesCrd.TIPO_CALIFICACION_CREDITO,
      EntidadesCrd.TIPO_APORTE,
      EntidadesCrd.TIPO_ADJUNTO,
      EntidadesCrd.TIPO_GENERO,
      EntidadesCrd.MOTIVO_PRESTAMO,
      EntidadesCrd.METODO_PAGO,
      EntidadesCrd.NIVEL_ESTUDIO,
      EntidadesCrd.PROFESION,
    ];

    return entidadesCrd.includes(entidad);
  }
}
