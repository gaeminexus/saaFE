import { TestBed } from '@angular/core/testing';

import { AporteRetencionService } from './aporte-retencion.service';

describe('AporteRetencionService', () => {
  let service: AporteRetencionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AporteRetencionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
