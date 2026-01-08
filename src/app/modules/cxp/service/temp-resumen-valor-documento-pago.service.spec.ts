import { TestBed } from '@angular/core/testing';

import { TempResumenValorDocumentoPagoService } from './temp-resumen-valor-documento-pago.service';

describe('TempResumenValorDocumentoPagoService', () => {
  let service: TempResumenValorDocumentoPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempResumenValorDocumentoPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
