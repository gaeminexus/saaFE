import { TestBed } from '@angular/core/testing';

import { CargaArchivoService } from './carga-archivo.service';

describe('CargaArchivoService', () => {
  let service: CargaArchivoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CargaArchivoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
