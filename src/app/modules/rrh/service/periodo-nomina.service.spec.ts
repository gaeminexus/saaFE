import { TestBed } from '@angular/core/testing';

import { PeriodoNominaService } from './periodo-nomina.service';

describe('PeriodoNominaService', () => {
  let service: PeriodoNominaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PeriodoNominaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
