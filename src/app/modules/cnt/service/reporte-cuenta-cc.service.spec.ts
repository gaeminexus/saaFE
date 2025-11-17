import { TestBed } from '@angular/core/testing';

import { ReporteCuentaCcService } from './reporte-cuenta-cc.service';

describe('ReporteCuentaCcService', () => {
  let service: ReporteCuentaCcService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReporteCuentaCcService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
