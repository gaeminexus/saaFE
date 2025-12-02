import { TestBed } from '@angular/core/testing';

import { TempFinanciacionXDocumentoCobroService } from './temp-financiacion-x-documento-cobro.service';

describe('TempFinanciacionXDocumentoCobroService', () => {
  let service: TempFinanciacionXDocumentoCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempFinanciacionXDocumentoCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
