import { TestBed } from '@angular/core/testing';

import { ReporteContableService } from './reporte-contable.service';

describe('ReporteContableService', () => {
  let service: ReporteContableService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReporteContableService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
