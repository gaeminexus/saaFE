import { TestBed } from '@angular/core/testing';

import { TasaPrestamoService } from './tasa-prestamo.service';

describe('TasaPrestamoService', () => {
  let service: TasaPrestamoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TasaPrestamoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
