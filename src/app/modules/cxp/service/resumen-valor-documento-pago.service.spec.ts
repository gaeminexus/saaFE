import { TestBed } from '@angular/core/testing';

import { ResumenValorDocumentoPagoService } from './resumen-valor-documento-pago.service';

describe('ResumenValorDocumentoPagoService', () => {
  let service: ResumenValorDocumentoPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResumenValorDocumentoPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
