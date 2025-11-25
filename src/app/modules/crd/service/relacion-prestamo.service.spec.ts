import { TestBed } from '@angular/core/testing';

import { RelacionPrestamoService } from './relacion-prestamo.service';

describe('RelacionPrestamoService', () => {
  let service: RelacionPrestamoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RelacionPrestamoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
