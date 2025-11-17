import { TestBed } from '@angular/core/testing';

import { DetalleReporteContableService } from './detalle-reporte-contable.service';

describe('DetalleReporteContableService', () => {
  let service: DetalleReporteContableService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetalleReporteContableService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
