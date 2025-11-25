import { TestBed } from '@angular/core/testing';

import { CambioAporteService } from './cambio-aporte.service';

describe('CambioAporteService', () => {
  let service: CambioAporteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CambioAporteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
