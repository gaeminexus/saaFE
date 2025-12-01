import { TestBed } from '@angular/core/testing';

import { FinanciacionXDocumentoCobroService } from './financiacion-x-documento-cobro.service';

describe('FinanciacionXDocumentoCobroService', () => {
  let service: FinanciacionXDocumentoCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FinanciacionXDocumentoCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
