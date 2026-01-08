import { TestBed } from '@angular/core/testing';

import { TempPagosArbitrariosXFinanciacionPagoService } from './temp-pagos-arbitrarios-x-financiacion-pago.service';

describe('TempPagosArbitrariosXFinanciacionPagoService', () => {
  let service: TempPagosArbitrariosXFinanciacionPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempPagosArbitrariosXFinanciacionPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
