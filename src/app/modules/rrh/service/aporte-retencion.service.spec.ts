import { TestBed } from '@angular/core/testing';

import { AporteRetencionesService } from './aporte-retencion.service';

describe('AporteRetencionesService', () => {
  let service: AporteRetencionesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AporteRetencionesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
