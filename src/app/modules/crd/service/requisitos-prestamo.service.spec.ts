import { TestBed } from '@angular/core/testing';

import { RequisitosPrestamoService } from './requisitos-prestamo.service';

describe('RequisitosPrestamoService', () => {
  let service: RequisitosPrestamoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RequisitosPrestamoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
