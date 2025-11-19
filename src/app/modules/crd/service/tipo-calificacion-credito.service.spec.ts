import { TestBed } from '@angular/core/testing';

import { TipoCalificacionCreditoService } from './tipo-calificacion-credito.service';

describe('TipoCalificacionCreditoService', () => {
  let service: TipoCalificacionCreditoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TipoCalificacionCreditoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
