import { Injectable } from '@angular/core';
import { DetallePlantillaService } from '../../../modules/cnt/service/detalle-plantilla.service';
import { EntidadesContabilidad } from '../../../modules/cnt/model/entidades-cnt';

@Injectable({
  providedIn: 'root'
})
export class GetLocatorService {

  constructor(
    public detallePlantillaService: DetallePlantillaService,
  ) { }

  obtienePorPadre(entidad: number, idParent: number): Promise<any>{
    switch (entidad) {
      case EntidadesContabilidad.DETALLE_PLANTILLA: {
        return new Promise((resolve, reject) => {
            this.detallePlantillaService.getByParent(idParent).subscribe(result => {
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
