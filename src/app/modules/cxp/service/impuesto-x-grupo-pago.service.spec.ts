import { TestBed } from '@angular/core/testing';

import { ImpuestoXGrupoPagoService } from './impuesto-x-grupo-pago.service';

describe('ImpuestoXGrupoPagoService', () => {
  let service: ImpuestoXGrupoPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImpuestoXGrupoPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
