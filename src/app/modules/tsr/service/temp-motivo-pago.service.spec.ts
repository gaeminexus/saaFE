import { TestBed } from '@angular/core/testing';

import { TempMotivoPagoService } from './temp-motivo-pago.service';

describe('TempMotivoPagoService', () => {
  let service: TempMotivoPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempMotivoPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
