import { TestBed } from '@angular/core/testing';

import { PerfilEconomicoService } from './perfil-economico.service';

describe('PerfilEconomicoService', () => {
  let service: PerfilEconomicoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PerfilEconomicoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
