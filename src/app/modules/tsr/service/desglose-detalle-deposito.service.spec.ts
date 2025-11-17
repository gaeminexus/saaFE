import { TestBed } from '@angular/core/testing';

import { DesgloseDetalleDepositoService } from './desglose-detalle-deposito.service';

describe('DesgloseDetalleDepositoService', () => {
  let service: DesgloseDetalleDepositoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DesgloseDetalleDepositoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
