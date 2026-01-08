import { TestBed } from '@angular/core/testing';

import { UsuarioXAprobacionService } from './usuario-x-aprobacion.service';

describe('UsuarioXAprobacionService', () => {
  let service: UsuarioXAprobacionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UsuarioXAprobacionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
