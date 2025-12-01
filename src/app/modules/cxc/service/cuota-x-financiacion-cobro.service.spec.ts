import { TestBed } from '@angular/core/testing';

import { CuotaXFinanciacionCobroService } from './cuota-x-financiacion-cobro.service';

describe('CuotaXFinanciacionCobroService', () => {
  let service: CuotaXFinanciacionCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CuotaXFinanciacionCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
