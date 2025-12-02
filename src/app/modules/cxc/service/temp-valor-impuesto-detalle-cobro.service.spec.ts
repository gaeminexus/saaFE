import { TestBed } from '@angular/core/testing';

import { TempValorImpuestoDetalleCobroService } from './temp-valor-impuesto-detalle-cobro.service';

describe('TempValorImpuestoDetalleCobroService', () => {
  let service: TempValorImpuestoDetalleCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempValorImpuestoDetalleCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
