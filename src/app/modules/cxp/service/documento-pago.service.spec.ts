import { TestBed } from '@angular/core/testing';

import { DocumentoPagoService } from './documento-pago.service';

describe('DocumentoPagoService', () => {
  let service: DocumentoPagoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DocumentoPagoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
