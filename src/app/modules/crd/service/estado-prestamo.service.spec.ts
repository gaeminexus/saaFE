import { TestBed } from '@angular/core/testing';

import { EstadoPrestamoService } from './estado-prestamo..service';

describe('EstadoPrestamoService', () => {
  let service: EstadoPrestamoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EstadoPrestamoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
