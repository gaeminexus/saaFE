import { TestBed } from '@angular/core/testing';

import { RolPagoService } from './rol-pago.service';

describe('RolPagoService', () => {
  let service: RolPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RolPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
