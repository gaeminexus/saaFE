import { TestBed } from '@angular/core/testing';

import { TempDetalleDocumentoPagoService } from './temp-detalle-documento-pago.service';

describe('TempDetalleDocumentoPagoService', () => {
  let service: TempDetalleDocumentoPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempDetalleDocumentoPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
