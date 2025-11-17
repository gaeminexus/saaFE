import { TestBed } from '@angular/core/testing';

import { DetalleMayorAnaliticoService } from './detalle-mayor-analitico.service';

describe('DetalleMayorAnaliticoService', () => {
  let service: DetalleMayorAnaliticoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetalleMayorAnaliticoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
