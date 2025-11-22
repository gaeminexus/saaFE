import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { FilialService } from '../service/filial.service';
import { TipoIdentificacionService } from '../service/tipo-identificacion.service';
import { Filial } from '../model/filial';
import { TipoIdentificacion } from '../model/tipo-identificacion';

/**
 * Datos necesarios para el formulario de edición de entidad
 */
export interface EntidadEditData {
  filiales: Filial[];
  tiposIdentificacion: TipoIdentificacion[];
}

/**
 * Resolver para pre-cargar datos necesarios en entidad-edit
 *
 * Pre-carga:
 * - Filiales (para select)
 * - Tipos de identificación (para select)
 *
 * Esto evita que el componente se renderice antes de tener los datos,
 * eliminando el lag y la barra de progreso visible durante la carga.
 */
export const entidadEditResolver: ResolveFn<EntidadEditData> = (route, state) => {
  const filialService = inject(FilialService);
  const tipoIdentificacionService = inject(TipoIdentificacionService);

  return forkJoin({
    filiales: filialService.getAll().pipe(
      catchError(() => of([]))
    ),
    tiposIdentificacion: tipoIdentificacionService.getAll().pipe(
      catchError(() => of([]))
    )
  }).pipe(
    map(data => ({
      filiales: data.filiales || [],
      tiposIdentificacion: data.tiposIdentificacion || []
    }))
  );
};
