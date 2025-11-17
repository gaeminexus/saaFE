import { TestBed } from '@angular/core/testing';

import { MovimientoBancoService } from './movimiento-banco.service';

describe('MovimientoBancoService', () => {
  let service: MovimientoBancoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MovimientoBancoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
