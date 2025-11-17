import { TestBed } from '@angular/core/testing';

import { DetalleDepositoService } from './detalle-deposito.service';

describe('DetalleDepositoService', () => {
  let service: DetalleDepositoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetalleDepositoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
