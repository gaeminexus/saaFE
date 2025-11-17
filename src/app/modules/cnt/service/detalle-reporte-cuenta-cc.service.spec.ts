import { TestBed } from '@angular/core/testing';

import { DetalleReporteCuentaCcService } from './detalle-reporte-cuenta-cc.service';

describe('DetalleReporteCuentaCcService', () => {
  let service: DetalleReporteCuentaCcService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetalleReporteCuentaCcService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
