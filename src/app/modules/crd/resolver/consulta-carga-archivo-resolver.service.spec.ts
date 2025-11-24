import { TestBed } from '@angular/core/testing';

import { ConsultaCargaArchivoResolverService } from './consulta-carga-archivo-resolver.service';

describe('ConsultaCargaArchivoResolverService', () => {
  let service: ConsultaCargaArchivoResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConsultaCargaArchivoResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
