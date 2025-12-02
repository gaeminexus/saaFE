import { TestBed } from '@angular/core/testing';

import { TempResumenValorDocumentoCobroService } from './temp-resumen-valor-documento-cobro.service';

describe('TempResumenValorDocumentoCobroService', () => {
  let service: TempResumenValorDocumentoCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempResumenValorDocumentoCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
