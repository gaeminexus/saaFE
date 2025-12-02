import { TestBed } from '@angular/core/testing';

import { ResumenValorDocumentoCobroService } from './resumen-valor-documento-cobro.service';

describe('ResumenValorDocumentoCobroService', () => {
  let service: ResumenValorDocumentoCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResumenValorDocumentoCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
