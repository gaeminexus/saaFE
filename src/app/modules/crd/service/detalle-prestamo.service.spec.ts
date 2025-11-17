import { TestBed } from '@angular/core/testing';

import { DetallePrestamoService } from './detalle-prestamo.service';

describe('DetallePrestamoService', () => {
  let service: DetallePrestamoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetallePrestamoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
