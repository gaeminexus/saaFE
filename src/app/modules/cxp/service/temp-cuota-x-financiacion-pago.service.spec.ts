import { TestBed } from '@angular/core/testing';

import { TempCuotaXFinanciacionPagoService } from './temp-cuota-x-financiacion-pago.service';

describe('TempCuotaXFinanciacionPagoService', () => {
  let service: TempCuotaXFinanciacionPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempCuotaXFinanciacionPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
