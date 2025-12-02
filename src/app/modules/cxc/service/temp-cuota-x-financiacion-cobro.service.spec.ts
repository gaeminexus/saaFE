import { TestBed } from '@angular/core/testing';

import { TempCuotaXFinanciacionCobroService } from './temp-cuota-x-financiacion-cobro.service';

describe('TempCuotaXFinanciacionCobroService', () => {
  let service: TempCuotaXFinanciacionCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempCuotaXFinanciacionCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
