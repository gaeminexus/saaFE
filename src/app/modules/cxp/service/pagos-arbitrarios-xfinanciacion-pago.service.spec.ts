import { TestBed } from '@angular/core/testing';

import { PagosArbitrariosXFinanciacionPagoService } from './pagos-arbitrarios-xfinanciacion-pago.service';

describe('PagosArbitrariosXFinanciacionPagoService', () => {
  let service: PagosArbitrariosXFinanciacionPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PagosArbitrariosXFinanciacionPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
