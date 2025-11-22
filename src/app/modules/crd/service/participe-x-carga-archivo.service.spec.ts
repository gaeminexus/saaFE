import { TestBed } from '@angular/core/testing';

import { ParticipeXCargaArchivoService } from './participe-x-carga-archivo.service';

describe('ParticipeXCargaArchivoService', () => {
  let service: ParticipeXCargaArchivoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ParticipeXCargaArchivoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
