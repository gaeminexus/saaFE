import { TestBed } from '@angular/core/testing';

import { DatosPrestamoService } from './datos-prestamo.service';

describe('DatosPrestamoService', () => {
  let service: DatosPrestamoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DatosPrestamoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
