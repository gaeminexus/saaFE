import { TestBed } from '@angular/core/testing';

import { PagoAporteService } from './pago-aporte.service';

describe('PagoAporteService', () => {
  let service: PagoAporteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PagoAporteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
