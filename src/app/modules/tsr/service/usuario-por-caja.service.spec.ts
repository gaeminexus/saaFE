import { TestBed } from '@angular/core/testing';

import { UsuarioPorCajaService } from './usuario-por-caja.service';

describe('UsuarioPorCajaService', () => {
  let service: UsuarioPorCajaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UsuarioPorCajaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
