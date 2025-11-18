import { TestBed } from '@angular/core/testing';

import { TipoAporteService } from './tipo-aporte.service';

describe('TipoAporteService', () => {
  let service: TipoAporteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TipoAporteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
