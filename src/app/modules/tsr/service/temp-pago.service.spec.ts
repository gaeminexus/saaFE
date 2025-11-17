import { TestBed } from '@angular/core/testing';

import { TempPagoService } from './temp-pago.service';

describe('TempPagoService', () => {
  let service: TempPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
