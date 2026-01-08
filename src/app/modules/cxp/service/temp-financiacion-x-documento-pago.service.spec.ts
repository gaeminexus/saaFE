import { TestBed } from '@angular/core/testing';

import { TempFinanciacionXDocumentoPagoService } from './temp-financiacion-x-documento-pago.service';

describe('TempFinanciacionXDocumentoPagoService', () => {
  let service: TempFinanciacionXDocumentoPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempFinanciacionXDocumentoPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
