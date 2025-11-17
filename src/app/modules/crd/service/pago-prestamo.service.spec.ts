import { TestBed } from '@angular/core/testing';

import { PagoPrestamoService } from './pago-prestamo.service';

describe('PagoPrestamoService', () => {
  let service: PagoPrestamoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PagoPrestamoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
