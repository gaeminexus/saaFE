import { TestBed } from '@angular/core/testing';

import { FinanciacionXDocumentoPagoService } from './financiacion-x-documento-pago.service';

describe('FinanciacionXDocumentoPagoService', () => {
  let service: FinanciacionXDocumentoPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FinanciacionXDocumentoPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
