import { TestBed } from '@angular/core/testing';

import { DetalleDebitoCreditoService } from './detalle-debito-credito.service';

describe('DetalleDebitoCreditoService', () => {
  let service: DetalleDebitoCreditoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetalleDebitoCreditoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
