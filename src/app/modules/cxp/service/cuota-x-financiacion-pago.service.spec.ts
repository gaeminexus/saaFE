import { TestBed } from '@angular/core/testing';

import { CuotaXFinanciacionPagoService } from './cuota-x-financiacion-pago.service';

describe('CuotaXFinanciacionPagoService', () => {
  let service: CuotaXFinanciacionPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CuotaXFinanciacionPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
