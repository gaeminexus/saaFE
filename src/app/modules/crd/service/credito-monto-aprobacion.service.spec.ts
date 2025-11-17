import { TestBed } from '@angular/core/testing';

import { CreditoMontoAprobacionService } from './credito-monto-aprobacion.service';

describe('CreditoMontoAprobacionService', () => {
  let service: CreditoMontoAprobacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CreditoMontoAprobacionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
