import { TestBed } from '@angular/core/testing';

import { DetalleCargaArchivoService } from './detalle-carga-archivo.service';

describe('DetalleCargaArchivoService', () => {
  let service: DetalleCargaArchivoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetalleCargaArchivoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
