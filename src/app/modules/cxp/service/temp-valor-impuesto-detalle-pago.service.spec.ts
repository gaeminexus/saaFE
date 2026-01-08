import { TestBed } from '@angular/core/testing';

import { TempValorImpuestoDetallePagoService } from './temp-valor-impuesto-detalle-pago.service';

describe('TempValorImpuestoDetallePagoService', () => {
  let service: TempValorImpuestoDetallePagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempValorImpuestoDetallePagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
