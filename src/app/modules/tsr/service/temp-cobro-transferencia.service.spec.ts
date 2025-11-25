import { TestBed } from '@angular/core/testing';

import { TempCobroTransferenciaService } from './temp-cobro-transferencia.service';

describe('TempCobroTransferenciaService', () => {
  let service: TempCobroTransferenciaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempCobroTransferenciaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
