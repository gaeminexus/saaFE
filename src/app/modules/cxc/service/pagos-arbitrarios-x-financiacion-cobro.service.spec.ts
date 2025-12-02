import { TestBed } from '@angular/core/testing';

import { PagosArbitrariosXFinanciacionCobroService } from './pagos-arbitrarios-x-financiacion-cobro.service';

describe('PagosArbitrariosXFinanciacionCobroService', () => {
  let service: PagosArbitrariosXFinanciacionCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PagosArbitrariosXFinanciacionCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
