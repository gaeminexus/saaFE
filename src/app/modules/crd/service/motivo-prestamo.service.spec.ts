import { TestBed } from '@angular/core/testing';

import { MotivoPrestamoService } from './motivo-prestamo.service';

describe('MotivoPrestamoService', () => {
  let service: MotivoPrestamoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MotivoPrestamoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
