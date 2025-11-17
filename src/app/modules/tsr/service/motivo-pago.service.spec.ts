import { TestBed } from '@angular/core/testing';

import { MotivoPagoService } from './motivo-pago.service';

describe('MotivoPagoService', () => {
  let service: MotivoPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MotivoPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
