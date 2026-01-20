import { TestBed } from '@angular/core/testing';

import { AnexoContratoService } from './anexo-contrato.service';

describe('AnexoContratoService', () => {
  let service: AnexoContratoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnexoContratoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
