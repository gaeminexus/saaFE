import { TestBed } from '@angular/core/testing';

import { ValorImpuestoDocumentoCobroService } from './valor-impuesto-documento-cobro.service';

describe('ValorImpuestoDocumentoCobroService', () => {
  let service: ValorImpuestoDocumentoCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ValorImpuestoDocumentoCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
