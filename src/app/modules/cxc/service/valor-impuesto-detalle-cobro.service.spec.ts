import { TestBed } from '@angular/core/testing';

import { ValorImpuestoDetalleCobroService } from './valor-impuesto-detalle-cobro.service';

describe('ValorImpuestoDetalleCobroService', () => {
  let service: ValorImpuestoDetalleCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ValorImpuestoDetalleCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
