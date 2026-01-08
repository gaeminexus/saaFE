import { TestBed } from '@angular/core/testing';

import { TempDocumentoPagoService } from './temp-documento-pago.service';

describe('TempDocumentoPagoService', () => {
  let service: TempDocumentoPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempDocumentoPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
