import { TestBed } from '@angular/core/testing';

import { TempPagosArbitrariosXFinanciacionCobroService } from './temp-pagos-arbitrarios-x-financiacion-cobro.service';

describe('TempPagosArbitrariosXFinanciacionCobroService', () => {
  let service: TempPagosArbitrariosXFinanciacionCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempPagosArbitrariosXFinanciacionCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
