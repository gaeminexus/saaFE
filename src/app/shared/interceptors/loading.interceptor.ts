import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, delay } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  // Mostrar loading ANTES de hacer la petición
  loadingService.show();

  return next(req).pipe(
    // Asegurar que la barra sea visible por al menos un momento
    delay(0), // Fuerza un tick de Angular para que se vea el cambio
    finalize(() => {
      // Ocultar loading cuando finaliza la petición (éxito o error)
      loadingService.hide();
    })
  );
};
