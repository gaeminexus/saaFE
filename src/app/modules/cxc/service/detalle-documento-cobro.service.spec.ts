import { TestBed } from '@angular/core/testing';

import { DetalleDocumentoCobroService } from './detalle-documento-cobro.service';

describe('DetalleDocumentoCobroService', () => {
  let service: DetalleDocumentoCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetalleDocumentoCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
