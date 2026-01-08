import { TestBed } from '@angular/core/testing';

import { GrupoProductoPagoService } from './grupo-producto-pago.service';

describe('GrupoProductoPagoService', () => {
  let service: GrupoProductoPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GrupoProductoPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
