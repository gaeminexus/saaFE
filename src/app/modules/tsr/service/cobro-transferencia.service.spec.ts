import { TestBed } from '@angular/core/testing';

import { CobroTransferenciaService } from './cobro-transferencia.service';

describe('CobroTransferenciaService', () => {
  let service: CobroTransferenciaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CobroTransferenciaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
