import { TestBed } from '@angular/core/testing';

import { AprobacionXMontoService } from './aprobacion-x-monto.service';

describe('AprobacionXMontoService', () => {
  let service: AprobacionXMontoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AprobacionXMontoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
