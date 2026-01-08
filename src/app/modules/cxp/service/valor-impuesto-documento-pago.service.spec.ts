import { TestBed } from '@angular/core/testing';

import { ValorImpuestoDocumentoPagoService } from './valor-impuesto-documento-pago.service';

describe('ValorImpuestoDocumentoPagoService', () => {
  let service: ValorImpuestoDocumentoPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ValorImpuestoDocumentoPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
