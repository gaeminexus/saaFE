import { TestBed } from '@angular/core/testing';

import { ValorImpuestoDetallePagoService } from './valor-impuesto-detalle-pago.service';

describe('ValorImpuestoDetallePagoService', () => {
  let service: ValorImpuestoDetallePagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ValorImpuestoDetallePagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
