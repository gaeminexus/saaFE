import { TestBed } from '@angular/core/testing';

import { TempAprobacionXMontoService } from './temp-aprobacion-x-monto.service';

describe('TempAprobacionXMontoService', () => {
  let service: TempAprobacionXMontoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TempAprobacionXMontoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
