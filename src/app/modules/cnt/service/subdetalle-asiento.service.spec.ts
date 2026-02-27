import { TestBed } from '@angular/core/testing';

import { SubdetalleAsientoService } from './subdetalle-asiento.service';

describe('SubdetalleAsientoService', () => {
  let service: SubdetalleAsientoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubdetalleAsientoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
