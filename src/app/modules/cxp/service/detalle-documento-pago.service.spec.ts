import { TestBed } from '@angular/core/testing';

import { DetalleDocumentoPagoService } from './detalle-documento-pago.service';

describe('DetalleDocumentoPagoService', () => {
  let service: DetalleDocumentoPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetalleDocumentoPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
