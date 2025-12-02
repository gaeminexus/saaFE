import { TestBed } from '@angular/core/testing';

import { TempDetalleDocumentoCobroService } from './temp-detalle-documento-cobro.service';

describe('TempDetalleDocumentoCobroService', () => {
  let service: TempDetalleDocumentoCobroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempDetalleDocumentoCobroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
