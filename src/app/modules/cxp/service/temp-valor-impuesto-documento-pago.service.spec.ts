import { TestBed } from '@angular/core/testing';

import { TempValorImpuestoDocumentoPagoService } from './temp-valor-impuesto-documento-pago.service';

describe('TempValorImpuestoDocumentoPagoService', () => {
  let service: TempValorImpuestoDocumentoPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempValorImpuestoDocumentoPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
