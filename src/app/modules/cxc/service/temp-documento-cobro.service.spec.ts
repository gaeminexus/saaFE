import { TestBed } from '@angular/core/testing';

import { TempDocumentoCobroService } from './temp-documento-cobro.service';

describe('TempDocumentoCobroService', () => {
  let service: TempDocumentoCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempDocumentoCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
