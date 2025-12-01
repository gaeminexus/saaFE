import { TestBed } from '@angular/core/testing';

import { TempValorImpuestoDocumentoCobroService } from './temp-valor-impuesto-documento-cobro.service';

describe('TempValorImpuestoDocumentoCobroService', () => {
  let service: TempValorImpuestoDocumentoCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempValorImpuestoDocumentoCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
