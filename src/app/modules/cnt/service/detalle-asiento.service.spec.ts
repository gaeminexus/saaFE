import { TestBed } from '@angular/core/testing';

import { DetalleAsientoService } from './detalle-asiento.service';

describe('DetalleAsientoService', () => {
  let service: DetalleAsientoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetalleAsientoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
